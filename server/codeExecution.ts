/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { RuntimeInfo, TestCase, TestCaseResult, ExecutionResult } from "../src/types.js";

const execFileAsync = promisify(execFile);

// Base sandbox directory in OS temp
const SANDBOX_BASE_DIR = path.join(os.tmpdir(), "mrtechlms-sandbox");

// Sanitize environment variables so student code CANNOT access LMS secrets, .env, or MySQL credentials
function getSanitizedEnv(tempDir: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH || "",
    SYSTEMROOT: process.env.SYSTEMROOT || "C:\\Windows",
    COMSPEC: process.env.COMSPEC || "cmd.exe",
    PATHEXT: process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD",
    USERPROFILE: process.env.USERPROFILE || "C:\\Users\\Default",
    LOCALAPPDATA: process.env.LOCALAPPDATA || "",
    APPDATA: process.env.APPDATA || "",
    TMP: tempDir,
    TEMP: tempDir,
    NODE_ENV: "production"
  };
}

/**
 * Detects which language runtimes are genuinely installed and executable on the host
 */
export async function detectAvailableRuntimes(): Promise<RuntimeInfo[]> {
  const runtimes: RuntimeInfo[] = [];

  // 1. Python 3
  try {
    const { stdout } = await execFileAsync("python", ["--version"]);
    const version = stdout.trim() || "Python 3";
    runtimes.push({
      id: "python",
      name: "Python 3",
      version: version.replace("Python ", ""),
      available: true,
      executable: true,
      fileExtension: "py",
      monacoLanguage: "python",
      description: "Python 3 interpreter with standard library support"
    });
  } catch {
    runtimes.push({
      id: "python",
      name: "Python 3",
      version: "Not found",
      available: false,
      executable: false,
      fileExtension: "py",
      monacoLanguage: "python",
      description: "Python 3 runtime is not available on PATH"
    });
  }

  // 2. JavaScript (Node.js)
  try {
    const { stdout } = await execFileAsync("node", ["--version"]);
    runtimes.push({
      id: "javascript",
      name: "JavaScript (Node.js)",
      version: stdout.trim(),
      available: true,
      executable: true,
      fileExtension: "js",
      monacoLanguage: "javascript",
      description: "Node.js V8 execution engine"
    });
  } catch {
    runtimes.push({
      id: "javascript",
      name: "JavaScript (Node.js)",
      version: "Not found",
      available: false,
      executable: false,
      fileExtension: "js",
      monacoLanguage: "javascript",
      description: "Node.js runtime is not available on PATH"
    });
  }

  // 3. Java
  try {
    const { stdout, stderr } = await execFileAsync("javac", ["--version"]);
    const version = (stdout || stderr).trim() || "Java";
    runtimes.push({
      id: "java",
      name: "Java",
      version: version.replace("javac ", ""),
      available: true,
      executable: true,
      fileExtension: "java",
      monacoLanguage: "java",
      description: "OpenJDK / Oracle Java compiler and JVM"
    });
  } catch {
    runtimes.push({
      id: "java",
      name: "Java",
      version: "Not found",
      available: false,
      executable: false,
      fileExtension: "java",
      monacoLanguage: "java",
      description: "Java javac compiler is not available on PATH"
    });
  }

  // 4. SQL Engine (via isolated SQLite instance)
  try {
    const { stdout } = await execFileAsync("python", ["-c", "import sqlite3; print(sqlite3.sqlite_version)"]);
    runtimes.push({
      id: "sql",
      name: "SQL",
      version: `SQLite ${stdout.trim()}`,
      available: true,
      executable: true,
      fileExtension: "sql",
      monacoLanguage: "sql",
      description: "Isolated relational SQL execution engine"
    });
  } catch {
    runtimes.push({
      id: "sql",
      name: "SQL",
      version: "Not found",
      available: false,
      executable: false,
      fileExtension: "sql",
      monacoLanguage: "sql",
      description: "SQL execution engine unavailable"
    });
  }

  // 5. C (GCC / Clang)
  let cAvailable = false;
  let cVersion = "Not configured";
  try {
    const { stdout } = await execFileAsync("gcc", ["--version"]);
    cAvailable = true;
    cVersion = stdout.split("\n")[0].trim();
  } catch {
    try {
      const { stdout } = await execFileAsync("clang", ["--version"]);
      cAvailable = true;
      cVersion = stdout.split("\n")[0].trim();
    } catch {
      cAvailable = false;
    }
  }

  runtimes.push({
    id: "c",
    name: "C (GCC)",
    version: cAvailable ? cVersion : "Unavailable on Windows host",
    available: cAvailable,
    executable: cAvailable,
    fileExtension: "c",
    monacoLanguage: "c",
    description: cAvailable ? "GNU C Compiler" : "GCC/Clang compiler not detected in system PATH"
  });

  // 6. C++ (G++ / Clang++)
  let cppAvailable = false;
  let cppVersion = "Not configured";
  try {
    const { stdout } = await execFileAsync("g++", ["--version"]);
    cppAvailable = true;
    cppVersion = stdout.split("\n")[0].trim();
  } catch {
    try {
      const { stdout } = await execFileAsync("clang++", ["--version"]);
      cppAvailable = true;
      cppVersion = stdout.split("\n")[0].trim();
    } catch {
      cppAvailable = false;
    }
  }

  runtimes.push({
    id: "cpp",
    name: "C++ (G++)",
    version: cppAvailable ? cppVersion : "Unavailable on Windows host",
    available: cppAvailable,
    executable: cppAvailable,
    fileExtension: "cpp",
    monacoLanguage: "cpp",
    description: cppAvailable ? "GNU C++ Compiler" : "G++/Clang++ compiler not detected in system PATH"
  });

  // 7. Web Development Playground (Browser sandboxed)
  runtimes.push({
    id: "web",
    name: "Web Development",
    version: "HTML5 / CSS3 / ES2024",
    available: true,
    executable: true,
    fileExtension: "html",
    monacoLanguage: "html",
    description: "Client-side sandboxed iframe execution"
  });

  return runtimes;
}

interface RunOptions {
  language: string;
  code: string;
  stdin?: string;
  timeLimit?: number; // default 3000ms
}

interface ProcessOutput {
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  timedOut: boolean;
  exitCode: number | null;
  error?: string;
}

/**
 * Spawns a child process with strict timeout and output buffer limits
 */
function spawnWithTimeout(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  stdinText: string,
  timeoutMs: number
): Promise<ProcessOutput> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let finished = false;

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (process.platform === "win32") {
          // Aggressively kill process tree on Windows
          execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
        } else {
          child.kill("SIGKILL");
        }
      } catch {}
    }, timeoutMs);

    if (child.stdin) {
      if (stdinText) {
        child.stdin.write(stdinText);
      }
      child.stdin.end();
    }

    const MAX_OUTPUT = 64 * 1024; // 64KB max buffer to prevent memory exhaustion

    child.stdout?.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT) {
        stdout += data.toString("utf-8");
      }
    });

    child.stderr?.on("data", (data) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += data.toString("utf-8");
      }
    });

    child.on("error", (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: stderr || err.message,
          executionTimeMs: Date.now() - startTime,
          timedOut,
          exitCode: 1,
          error: err.message
        });
      }
    });

    child.on("close", (exitCode) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          executionTimeMs: Date.now() - startTime,
          timedOut,
          exitCode
        });
      }
    });
  });
}

/**
 * Runs a single code program in an isolated temporary directory
 */
export async function executeProgram(options: RunOptions): Promise<ProcessOutput> {
  const { language, code, stdin = "", timeLimit = 3000 } = options;
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const tempDir = path.join(SANDBOX_BASE_DIR, runId);

  await fs.mkdir(tempDir, { recursive: true });
  const env = getSanitizedEnv(tempDir);

  try {
    if (language === "python") {
      const filePath = path.join(tempDir, "solution.py");
      await fs.writeFile(filePath, code, "utf-8");
      return await spawnWithTimeout("python", ["-u", "solution.py"], tempDir, env, stdin, timeLimit);
    } 
    
    if (language === "javascript") {
      const filePath = path.join(tempDir, "solution.js");
      await fs.writeFile(filePath, code, "utf-8");
      return await spawnWithTimeout("node", ["--no-warnings", "solution.js"], tempDir, env, stdin, timeLimit);
    } 
    
    if (language === "java") {
      // Find class name or default to Solution
      const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
      const className = match ? match[1] : "Solution";
      const filePath = path.join(tempDir, `${className}.java`);
      await fs.writeFile(filePath, code, "utf-8");

      // Compile first
      const compileRes = await spawnWithTimeout("javac", [`${className}.java`], tempDir, env, "", 5000);
      if (compileRes.exitCode !== 0) {
        return {
          stdout: "",
          stderr: compileRes.stderr || "Java compilation failed",
          executionTimeMs: compileRes.executionTimeMs,
          timedOut: false,
          exitCode: 1,
          error: "Compilation Error"
        };
      }

      // Execute JVM
      return await spawnWithTimeout("java", ["-cp", ".", className], tempDir, env, stdin, timeLimit);
    } 
    
    if (language === "sql") {
      // Execute via isolated SQLite runner script
      const runnerScript = `
import sqlite3
import sys

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

# Seed default test tables
cursor.execute("""
CREATE TABLE students (
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
      const scriptPath = path.join(tempDir, "sql_runner.py");
      await fs.writeFile(scriptPath, runnerScript, "utf-8");
      return await spawnWithTimeout("python", ["-u", "sql_runner.py"], tempDir, env, code, timeLimit);
    }

    return {
      stdout: "",
      stderr: `Execution for language '${language}' is not supported on this host.`,
      executionTimeMs: 0,
      timedOut: false,
      exitCode: 1,
      error: "Unsupported Language Runtime"
    };
  } finally {
    // Purge sandbox directory to prevent disk clutter and leakages
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Normalizes output string for fair whitespace/newline comparisons
 */
function normalizeOutput(str: string): string {
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

/**
 * Evaluates an array of test cases against submitted code
 */
export async function evaluateTestCases(
  language: string,
  code: string,
  testCases: TestCase[],
  timeLimit = 3000
): Promise<ExecutionResult> {
  const results: TestCaseResult[] = [];
  let totalTime = 0;
  let overallStatus: ExecutionResult["status"] = "passed";

  // For Java, check if compilation succeeds once to fail fast
  if (language === "java") {
    const checkCompile = await executeProgram({ language, code, stdin: "", timeLimit: 5000 });
    if (checkCompile.error === "Compilation Error") {
      return {
        status: "compilation_error",
        stdout: "",
        stderr: checkCompile.stderr,
        error: checkCompile.stderr,
        results: testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          passed: false,
          status: "error",
          error: checkCompile.stderr
        })),
        passedCount: 0,
        totalCount: testCases.length,
        executionTimeMs: checkCompile.executionTimeMs
      };
    }
  }

  for (const tc of testCases) {
    const res = await executeProgram({
      language,
      code,
      stdin: tc.input,
      timeLimit
    });

    totalTime += res.executionTimeMs;

    if (res.timedOut) {
      overallStatus = "time_limit_exceeded";
      results.push({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: res.stdout,
        passed: false,
        status: "time_limit_exceeded",
        error: "Time Limit Exceeded",
        executionTimeMs: res.executionTimeMs
      });
      continue;
    }

    if (res.exitCode !== 0) {
      if (overallStatus === "passed") overallStatus = "runtime_error";
      results.push({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: res.stdout,
        passed: false,
        status: "error",
        error: res.stderr || res.error || "Runtime Error",
        executionTimeMs: res.executionTimeMs
      });
      continue;
    }

    const actual = normalizeOutput(res.stdout);
    const expected = normalizeOutput(tc.expectedOutput);
    const passed = actual === expected;

    if (!passed && overallStatus === "passed") {
      overallStatus = "failed";
    }

    results.push({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: actual,
      passed,
      status: passed ? "passed" : "failed",
      executionTimeMs: res.executionTimeMs
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const firstFailed = results.find((r) => !r.passed);

  return {
    status: overallStatus,
    stdout: results.map((r, i) => `Test ${i + 1}: ${r.status.toUpperCase()}`).join("\n"),
    stderr: firstFailed?.error,
    executionTimeMs: totalTime,
    results,
    passedCount,
    totalCount: testCases.length
  };
}
