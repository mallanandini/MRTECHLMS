/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { ISandboxDriver } from "./sandbox-driver.interface.js";
import { SandboxExecutionOptions, SandboxExecutionResult } from "./types.js";
import { SecurityValidator } from "./security-validator.js";

const execFileAsync = promisify(execFile);
const SANDBOX_BASE_DIR = path.join(os.tmpdir(), "mrtechlms-docker-sandbox");

/**
 * Docker Sandbox Image Registry mapping supported languages to minimal OCI images
 */
export const DOCKER_SANDBOX_IMAGES: Record<string, string> = {
  python: process.env.DOCKER_IMAGE_PYTHON || "python:3.11-alpine",
  javascript: process.env.DOCKER_IMAGE_NODE || "node:20-alpine",
  java: process.env.DOCKER_IMAGE_JAVA || "eclipse-temurin:17-alpine",
  c: process.env.DOCKER_IMAGE_GCC || "gcc:alpine",
  cpp: process.env.DOCKER_IMAGE_CPP || "gcc:alpine",
  sql: process.env.DOCKER_IMAGE_PYTHON || "python:3.11-alpine"
};

/**
 * Isolated Docker Container Sandbox Driver.
 * Enforces hardware isolation, zero network access, memory caps, tmpfs bounds, and PID limits.
 */
export class DockerSandboxDriver implements ISandboxDriver {
  public readonly name = "docker" as const;
  private isDockerReady: boolean | null = null;

  /**
   * Determine if Docker CLI and daemon are operational
   */
  public async isAvailable(): Promise<boolean> {
    if (this.isDockerReady !== null) {
      return this.isDockerReady;
    }

    try {
      const { stdout } = await execFileAsync("docker", ["info"], { timeout: 4000 });
      this.isDockerReady = stdout.includes("Server Version") || stdout.includes("Containers");
    } catch {
      this.isDockerReady = false;
    }
    return this.isDockerReady;
  }

  public async probeRuntime(language: string): Promise<{ available: boolean; version: string }> {
    const isReady = await this.isAvailable();
    if (!isReady) {
      return { available: false, version: "Docker daemon not running" };
    }

    const image = DOCKER_SANDBOX_IMAGES[language];
    if (!image) {
      return { available: false, version: "Unsupported Docker runtime" };
    }

    try {
      const { stdout } = await execFileAsync("docker", ["image", "inspect", image], { timeout: 3000 });
      const available = stdout.length > 0;
      return { available, version: available ? `Docker (${image})` : "Image not pulled" };
    } catch {
      return { available: false, version: `Image ${image} pending pull` };
    }
  }

  /**
   * Execute code inside an ephemeral, network-isolated container
   */
  public async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const {
      language,
      code,
      stdin = "",
      timeLimitMs = SecurityValidator.DEFAULT_TIME_LIMIT_MS,
      memoryLimitMb = SecurityValidator.DEFAULT_MEMORY_LIMIT_MB,
      maxOutputBytes = SecurityValidator.MAX_SOURCE_BYTES
    } = options;

    const runId = `sbx_doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempDir = path.join(SANDBOX_BASE_DIR, runId);
    await fs.mkdir(tempDir, { recursive: true });

    const startTime = Date.now();
    const containerImage = DOCKER_SANDBOX_IMAGES[language] || "python:3.11-alpine";

    try {
      // Prepare code payload and entry command
      let entryCommand: string[];
      if (language === "python") {
        await fs.writeFile(path.join(tempDir, "main.py"), code, "utf-8");
        entryCommand = ["python", "-u", "/sandbox/main.py"];
      } else if (language === "javascript") {
        await fs.writeFile(path.join(tempDir, "index.js"), code, "utf-8");
        entryCommand = ["node", "--no-warnings", "/sandbox/index.js"];
      } else if (language === "java") {
        const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : "Solution";
        await fs.writeFile(path.join(tempDir, `${className}.java`), code, "utf-8");
        entryCommand = ["sh", "-c", `javac /sandbox/${className}.java && java -cp /sandbox ${className}`];
      } else if (language === "c") {
        await fs.writeFile(path.join(tempDir, "main.c"), code, "utf-8");
        entryCommand = ["sh", "-c", "gcc -O2 /sandbox/main.c -o /sandbox/run_prog && /sandbox/run_prog"];
      } else if (language === "cpp") {
        await fs.writeFile(path.join(tempDir, "main.cpp"), code, "utf-8");
        entryCommand = ["sh", "-c", "g++ -O2 /sandbox/main.cpp -o /sandbox/run_prog && /sandbox/run_prog"];
      } else if (language === "sql") {
        const sqlRunner = `
import sqlite3, sys
conn = sqlite3.connect(":memory:")
cur = conn.cursor()
cur.execute("CREATE TABLE students (id INT, name TEXT, department TEXT, score INT);")
cur.executemany("INSERT INTO students VALUES (?, ?, ?, ?);", [
  (1, 'Alice', 'Computer Science', 95),
  (2, 'Bob', 'Mechanical', 78),
  (3, 'Charlie', 'Electrical', 90)
])
conn.commit()
q = sys.stdin.read().strip()
if q:
  try:
    cur.execute(q)
    for r in cur.fetchall():
      print("|".join(str(x) for x in r))
  except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;
        await fs.writeFile(path.join(tempDir, "runner.py"), sqlRunner, "utf-8");
        entryCommand = ["python", "-u", "/sandbox/runner.py"];
      } else {
        throw new Error(`Unsupported container language: ${language}`);
      }

      // Build hardened docker run argument list
      const dockerArgs = [
        "run",
        "--rm",
        "-i",
        "--name", runId,
        // 1. NO NETWORK: Absolutely isolate from LAN, WAN, and internal VPC
        "--network", "none",
        // 2. RESOURCE CAPS: Memory limit + no swap expansion
        "--memory", `${memoryLimitMb}m`,
        "--memory-swap", `${memoryLimitMb}m`,
        // 3. CPU FRACTION: Bound to 0.5 CPU core maximum
        "--cpus", "0.5",
        // 4. PID LIMIT: Prevent fork bombs dead in their tracks
        "--pids-limit", "64",
        // 5. READ-ONLY ROOT FILESYSTEM: Prevent any modifications to container OS
        "--read-only",
        // 6. CAPABILITY DROP: Drop all kernel capabilities (CAP_SYS_ADMIN, CAP_NET_ADMIN, etc.)
        "--cap-drop", "ALL",
        // 7. SECURITY PROFILE: Disallow privilege escalation
        "--security-opt", "no-new-privileges:true",
        // 8. TMPFS / MOUNT: Ephemeral writable working directory capped at 32MB
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
        "-v", `${path.resolve(tempDir)}:/sandbox:rw`,
        "-w", "/sandbox",
        containerImage,
        ...entryCommand
      ];

      return await this.spawnDockerWithWatchdog(
        runId,
        dockerArgs,
        stdin,
        timeLimitMs,
        maxOutputBytes,
        startTime
      );
    } finally {
      // Guaranteed filesystem destruction
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Silently ignore cleanup error if directory was already released
      }
    }
  }

  private spawnDockerWithWatchdog(
    containerName: string,
    dockerArgs: string[],
    stdinText: string,
    timeLimitMs: number,
    maxOutputBytes: number,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let finished = false;

      const child = spawn("docker", dockerArgs, {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });

      const killContainer = () => {
        try {
          execFile("docker", ["rm", "-f", containerName], () => {});
        } catch {}
        try {
          child.kill("SIGKILL");
        } catch {}
      };

      const timer = setTimeout(() => {
        timedOut = true;
        finished = true;
        killContainer();
        resolve({
          stdout,
          stderr: (stderr + "\nTime Limit Exceeded").trim(),
          exitCode: null,
          executionTimeMs: Date.now() - startTime,
          memoryBytes: 0,
          status: "time_limit_exceeded",
          timedOut: true,
          error: `Execution timed out after ${timeLimitMs}ms`,
          driverUsed: "docker"
        });
      }, timeLimitMs);

      child.stdout.on("data", (chunk: Buffer) => {
        if (finished) return;
        if (stdout.length + chunk.length <= maxOutputBytes) {
          stdout += chunk.toString("utf-8");
        } else {
          stdout += chunk.toString("utf-8").substring(0, maxOutputBytes - stdout.length);
          stdout += "\n... [Execution output truncated: exceeded 64KB limit]";
          finished = true;
          clearTimeout(timer);
          killContainer();
          resolve({
            stdout,
            stderr,
            exitCode: 0,
            executionTimeMs: Date.now() - startTime,
            memoryBytes: 0,
            status: "passed",
            timedOut: false,
            error: "Output size limit reached",
            driverUsed: "docker"
          });
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        if (finished) return;
        if (stderr.length + chunk.length <= maxOutputBytes) {
          stderr += chunk.toString("utf-8");
        }
      });

      child.on("error", (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          memoryBytes: 0,
          status: "error",
          timedOut: false,
          error: `Docker spawn error: ${err.message}`,
          driverUsed: "docker"
        });
      });

      child.on("close", (exitCode) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        const execTime = Date.now() - startTime;
        let status: SandboxExecutionResult["status"] = "passed";
        if (timedOut) {
          status = "time_limit_exceeded";
        } else if (exitCode !== 0) {
          status = "failed";
        }

        resolve({
          stdout,
          stderr,
          exitCode,
          executionTimeMs: execTime,
          memoryBytes: 0,
          status,
          timedOut: false,
          driverUsed: "docker"
        });
      });

      if (stdinText) {
        try {
          child.stdin.write(stdinText);
          child.stdin.end();
        } catch {
          // Ignore pipe write error
        }
      } else {
        try {
          child.stdin.end();
        } catch {}
      }
    });
  }
}
