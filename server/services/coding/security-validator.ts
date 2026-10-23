/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LanguageId } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  securityViolation?: boolean;
}

export class SecurityValidator {
  public static readonly MAX_SOURCE_BYTES = 64 * 1024; // 64 KB
  public static readonly MAX_STDIN_BYTES = 32 * 1024;  // 32 KB
  public static readonly MAX_TEST_CASES = 50;
  public static readonly MIN_TIME_LIMIT_MS = 200;
  public static readonly MAX_TIME_LIMIT_MS = 10000;
  public static readonly DEFAULT_TIME_LIMIT_MS = 3000;
  public static readonly DEFAULT_MEMORY_LIMIT_MB = 256;

  public static readonly SUPPORTED_LANGUAGES: LanguageId[] = [
    "python",
    "javascript",
    "java",
    "sql",
    "c",
    "cpp",
    "web"
  ];

  /**
   * Malicious code patterns to reject prior to execution (Defense in Depth)
   */
  private static readonly FORBIDDEN_PATTERNS: Array<{
    languages: LanguageId[];
    pattern: RegExp;
    reason: string;
  }> = [
    // 1. Host file traversal and sensitive credential inspection
    {
      languages: ["python", "javascript", "java", "c", "cpp"],
      pattern: /(?:\.env|server\.ts|server\.cjs|appData|\/etc\/(?:passwd|shadow|hosts)|C:\\(?:Windows|Users))/i,
      reason: "Access to host system files or configuration files is strictly forbidden."
    },
    // 2. Python fork bombs & process spawning
    {
      languages: ["python"],
      pattern: /(?:os\.fork|pty\.fork|subprocess\.(?:Popen|call|run|check_output)|os\.system|os\.popen|os\.exec(?:l|v|le|ve|lp|vp)|__import__\s*\(\s*['"]subprocess['"]\))/i,
      reason: "Process creation, shell spawning, and fork operations are prohibited in student sandboxes."
    },
    // 3. Python network socket access
    {
      languages: ["python"],
      pattern: /(?:import\s+(?:socket|urllib|requests|http\.client|aiohttp|ftplib|smtplib)|from\s+(?:socket|urllib|requests|http\.client|aiohttp)\s+import)/i,
      reason: "Outbound and inbound network communication is disabled for student execution."
    },
    // 4. Python package installation
    {
      languages: ["python"],
      pattern: /(?:pip\s+install|get_ipython\(\)\.system|__import__\s*\(\s*['"]pip['"]\))/i,
      reason: "Arbitrary package installation is disabled."
    },
    // 5. JavaScript / Node.js process escape & child process execution
    {
      languages: ["javascript"],
      pattern: /(?:child_process|cluster\.fork|process\.binding|process\.kill|require\s*\(\s*['"]child_process['"]\)|import\s+.*from\s+['"]child_process['"])/i,
      reason: "Spawning child processes or worker clusters is strictly forbidden."
    },
    // 6. JavaScript network access
    {
      languages: ["javascript"],
      pattern: /(?:require\s*\(\s*['"](?:net|http|https|dgram|tls|dns)['"]\)|import\s+.*from\s+['"](?:net|http|https|dgram|tls|dns)['"])/i,
      reason: "Network socket creation is disabled for sandbox workers."
    },
    // 7. Java process execution & network connections
    {
      languages: ["java"],
      pattern: /(?:Runtime\.getRuntime\(\)\.exec|ProcessBuilder|java\.net\.Socket|java\.net\.URL|java\.net\.HttpURLConnection)/i,
      reason: "Subprocess execution and network sockets are not permitted in Java sandboxes."
    },
    // 8. C / C++ fork & exec & network sockets
    {
      languages: ["c", "cpp"],
      pattern: /(?:fork\s*\(\s*\)|system\s*\(|execl\s*\(|execv\s*\(|socket\s*\(|connect\s*\()/i,
      reason: "System calls for process creation and socket communication are forbidden."
    }
  ];

  /**
   * Validate code submission payload against limits and security rules
   */
  public static validateInput(params: {
    language: string;
    code?: string;
    stdin?: string;
    testCasesCount?: number;
    timeLimitMs?: number;
  }): ValidationResult {
    // 1. Language Whitelist
    const cleanLang = (params.language || "").toLowerCase().trim() as LanguageId;
    if (!this.SUPPORTED_LANGUAGES.includes(cleanLang)) {
      return {
        valid: false,
        error: `Unsupported language runtime '${params.language}'. Supported runtimes: ${this.SUPPORTED_LANGUAGES.join(", ")}`
      };
    }

    // 2. Source Code Size Limit
    const sourceCode = params.code || "";
    const sourceBytes = Buffer.byteLength(sourceCode, "utf-8");
    if (sourceBytes > this.MAX_SOURCE_BYTES) {
      return {
        valid: false,
        error: `Source code exceeds maximum allowed size of 64KB (${Math.round(sourceBytes / 1024)}KB submitted).`
      };
    }

    // 3. Stdin Size Limit
    if (params.stdin) {
      const stdinBytes = Buffer.byteLength(params.stdin, "utf-8");
      if (stdinBytes > this.MAX_STDIN_BYTES) {
        return {
          valid: false,
          error: `Standard input data exceeds maximum allowed size of 32KB (${Math.round(stdinBytes / 1024)}KB submitted).`
        };
      }
    }

    // 4. Test Cases Count Limit
    if (params.testCasesCount && params.testCasesCount > this.MAX_TEST_CASES) {
      return {
        valid: false,
        error: `Too many test cases requested (${params.testCasesCount}). Maximum permitted per execution is ${this.MAX_TEST_CASES}.`
      };
    }

    // 5. Time Limit Bounds
    if (params.timeLimitMs !== undefined) {
      if (params.timeLimitMs < this.MIN_TIME_LIMIT_MS || params.timeLimitMs > this.MAX_TIME_LIMIT_MS) {
        return {
          valid: false,
          error: `Requested execution time limit (${params.timeLimitMs}ms) must be between ${this.MIN_TIME_LIMIT_MS}ms and ${this.MAX_TIME_LIMIT_MS}ms.`
        };
      }
    }

    // 6. Web language requires no static process inspection (client-side sandbox)
    if (cleanLang === "web") {
      return { valid: true };
    }

    // 7. Static Security Analysis
    for (const rule of this.FORBIDDEN_PATTERNS) {
      if (rule.languages.includes(cleanLang) && rule.pattern.test(sourceCode)) {
        return {
          valid: false,
          error: `Security Violation: ${rule.reason}`,
          securityViolation: true
        };
      }
    }

    return { valid: true };
  }

  /**
   * Build clean-room environment variables for isolated child processes.
   * Completely strips host secrets, database credentials, and user data.
   */
  public static getCleanEnvironment(tempDir: string): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "C:\\Windows",
      COMSPEC: process.env.COMSPEC || "cmd.exe",
      PATHEXT: process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD",
      USERPROFILE: tempDir,
      LOCALAPPDATA: tempDir,
      APPDATA: tempDir,
      TMP: tempDir,
      TEMP: tempDir,
      HOME: tempDir,
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
      PYTHONUNBUFFERED: "1",
      PYTHONDONTWRITEBYTECODE: "1",
      NODE_ENV: "production"
    };
  }
}
