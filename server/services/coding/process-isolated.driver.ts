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
const SANDBOX_BASE_DIR = path.join(os.tmpdir(), "mrtechlms-sandbox-secure");

export class ProcessIsolatedSandboxDriver implements ISandboxDriver {
  public readonly name = "isolated-process" as const;

  public async isAvailable(): Promise<boolean> {
    return true; // Always operational as baseline secure engine
  }

  public async probeRuntime(language: string): Promise<{ available: boolean; version: string }> {
    try {
      if (language === "python") {
        const { stdout } = await execFileAsync("python", ["--version"]);
        return { available: true, version: stdout.trim().replace("Python ", "") };
      }
      if (language === "javascript") {
        const { stdout } = await execFileAsync("node", ["--version"]);
        return { available: true, version: stdout.trim() };
      }
      if (language === "java") {
        const { stdout, stderr } = await execFileAsync("javac", ["--version"]);
        return { available: true, version: (stdout || stderr).trim().replace("javac ", "") };
      }
      if (language === "sql") {
        const { stdout } = await execFileAsync("python", ["-c", "import sqlite3; print(sqlite3.sqlite_version)"]);
        return { available: true, version: `SQLite ${stdout.trim()}` };
      }
      if (language === "c" || language === "cpp") {
        const binary = language === "c" ? "gcc" : "g++";
        const { stdout } = await execFileAsync(binary, ["--version"]);
        return { available: true, version: stdout.split("\n")[0].trim() };
      }
    } catch {
      return { available: false, version: "Not found on host PATH" };
    }
    return { available: false, version: "Unsupported" };
  }

  public async execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
    const {
      language,
      code,
      stdin = "",
      timeLimitMs = SecurityValidator.DEFAULT_TIME_LIMIT_MS,
      maxOutputBytes = SecurityValidator.MAX_SOURCE_BYTES
    } = options;

    const runId = `sbx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempDir = path.join(SANDBOX_BASE_DIR, runId);

    await fs.mkdir(tempDir, { recursive: true });
    const cleanEnv = SecurityValidator.getCleanEnvironment(tempDir);

    const startTime = Date.now();

    try {
      if (language === "python") {
        const scriptPath = path.join(tempDir, "main.py");
        await fs.writeFile(scriptPath, code, "utf-8");
        return await this.spawnIsolated("python", ["-u", "main.py"], tempDir, cleanEnv, stdin, timeLimitMs, maxOutputBytes, startTime);
      }

      if (language === "javascript") {
        const scriptPath = path.join(tempDir, "index.js");
        await fs.writeFile(scriptPath, code, "utf-8");
        return await this.spawnIsolated("node", ["--no-warnings", "index.js"], tempDir, cleanEnv, stdin, timeLimitMs, maxOutputBytes, startTime);
      }

      if (language === "java") {
        const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : "Solution";
        const javaPath = path.join(tempDir, `${className}.java`);
        await fs.writeFile(javaPath, code, "utf-8");

        // 1. Compile Phase
        const compileRes = await this.spawnIsolated("javac", [`${className}.java`], tempDir, cleanEnv, "", 6000, maxOutputBytes, startTime);
        if (compileRes.exitCode !== 0) {
          return {
            ...compileRes,
            status: "compilation_error",
            error: "Compilation Error"
          };
        }

        // 2. JVM Execute Phase
        return await this.spawnIsolated("java", ["-cp", ".", className], tempDir, cleanEnv, stdin, timeLimitMs, maxOutputBytes, Date.now());
      }

      if (language === "sql") {
        const sqlRunnerCode = `
import sqlite3
import sys

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

# Seed sandbox test database schema
cursor.execute("""
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    score INTEGER NOT NULL
);
""")
cursor.executemany("""
INSERT INTO students (id, name, department, score) VALUES (?, ?, ?, ?);
""", [
    (1, 'Alice', 'Computer Science', 95),
    (2, 'Bob', 'Mechanical', 78),
    (3, 'Charlie', 'Electrical', 90),
    (4, 'David', 'Civil', 82),
    (5, 'Eve', 'Computer Science', 88),
    (6, 'Frank', 'Chemical', 72),
    (7, 'Grace', 'Computer Science', 80)
])
conn.commit()

query = sys.stdin.read().strip()
if not query:
    sys.exit(0)

try:
    cursor.execute(query)
    rows = cursor.fetchall()
    for row in rows:
        print("|".join(str(c) for c in row))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
finally:
    conn.close()
`;
        const runnerPath = path.join(tempDir, "sql_runner.py");
        await fs.writeFile(runnerPath, sqlRunnerCode, "utf-8");
        return await this.spawnIsolated("python", ["-u", "sql_runner.py"], tempDir, cleanEnv, code, timeLimitMs, maxOutputBytes, startTime);
      }

      if (language === "c" || language === "cpp") {
        const isCpp = language === "cpp";
        const compiler = isCpp ? "g++" : "gcc";
        const srcExt = isCpp ? "cpp" : "c";
        const srcPath = path.join(tempDir, `program.${srcExt}`);
        const binName = process.platform === "win32" ? "program.exe" : "program.out";
        const binPath = path.join(tempDir, binName);

        await fs.writeFile(srcPath, code, "utf-8");

        // 1. Compile Phase
        const compileRes = await this.spawnIsolated(compiler, [srcPath, "-o", binPath], tempDir, cleanEnv, "", 6000, maxOutputBytes, startTime);
        if (compileRes.exitCode !== 0) {
          return {
            ...compileRes,
            status: "compilation_error",
            error: "Compilation Error"
          };
        }

        // 2. Binary Execute Phase
        return await this.spawnIsolated(binPath, [], tempDir, cleanEnv, stdin, timeLimitMs, maxOutputBytes, Date.now());
      }

      return {
        stdout: "",
        stderr: `Language '${language}' is not supported by the isolated-process execution driver.`,
        exitCode: 1,
        executionTimeMs: 0,
        memoryBytes: 0,
        status: "error",
        timedOut: false,
        error: "Unsupported Language Runtime",
        driverUsed: "isolated-process"
      };
    } finally {
      // Ephemeral filesystem cleanup: strictly destroy sandbox directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (err: any) {
        console.warn(`[ProcessIsolatedDriver] Ephemeral cleanup warning for ${tempDir}:`, err.message);
      }
    }
  }

  /**
   * Spawns worker child process with strict watchdog and buffer guards
   */
  private spawnIsolated(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    stdinText: string,
    timeoutMs: number,
    maxOutputBytes: number,
    startTime: number
  ): Promise<SandboxExecutionResult> {
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let finished = false;
      let memoryBytes = 0;

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      });

      // Watchdog timer: kills process tree aggressively on timeout
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (process.platform === "win32") {
            execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
          } else {
            child.kill("SIGKILL");
          }
        } catch {}
      }, timeoutMs);

      // Memory usage sampler
      const memInterval = setInterval(() => {
        try {
          if (child.pid && !finished) {
            // Rough estimation in dev process driver
            memoryBytes = Math.max(memoryBytes, process.memoryUsage().rss / 4);
          }
        } catch {}
      }, 100);

      if (child.stdin) {
        if (stdinText) {
          child.stdin.write(stdinText);
        }
        child.stdin.end();
      }

      child.stdout?.on("data", (chunk: Buffer) => {
        if (stdout.length < maxOutputBytes) {
          stdout += chunk.toString("utf-8");
          if (stdout.length >= maxOutputBytes) {
            stdout += "\n... [Output Truncated: Exceeded Maximum Output Buffer Limit of 64KB]";
          }
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        if (stderr.length < maxOutputBytes) {
          stderr += chunk.toString("utf-8");
          if (stderr.length >= maxOutputBytes) {
            stderr += "\n... [Stderr Truncated: Exceeded Buffer Limit]";
          }
        }
      });

      const cleanup = () => {
        clearTimeout(timer);
        clearInterval(memInterval);
      };

      child.on("error", (err) => {
        if (!finished) {
          finished = true;
          cleanup();
          const elapsed = Date.now() - startTime;
          resolve({
            stdout,
            stderr: stderr || err.message,
            exitCode: 1,
            executionTimeMs: elapsed,
            memoryBytes,
            status: "error",
            timedOut: false,
            error: err.message,
            driverUsed: "isolated-process"
          });
        }
      });

      child.on("close", (exitCode) => {
        if (!finished) {
          finished = true;
          cleanup();
          const elapsed = Date.now() - startTime;

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
            executionTimeMs: elapsed,
            memoryBytes,
            status,
            timedOut,
            error: timedOut ? `Execution timed out after ${timeoutMs}ms.` : undefined,
            driverUsed: "isolated-process"
          });
        }
      });
    });
  }
}
