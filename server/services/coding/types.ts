/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageId = 
  | "python" 
  | "javascript" 
  | "java" 
  | "sql" 
  | "c" 
  | "cpp" 
  | "web";

export type ExecutionStatus = 
  | "passed" 
  | "failed" 
  | "error" 
  | "time_limit_exceeded" 
  | "memory_limit_exceeded" 
  | "compilation_error" 
  | "security_violation";

export interface SandboxExecutionOptions {
  jobId?: string;
  language: string;
  code: string;
  stdin?: string;
  timeLimitMs?: number; // default: 3000ms, max: 10000ms
  memoryLimitMb?: number; // default: 256MB
  maxOutputBytes?: number; // default: 65536 (64KB)
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  memoryBytes: number;
  status: ExecutionStatus;
  timedOut: boolean;
  error?: string;
  driverUsed: "docker" | "isolated-process";
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic?: boolean;
}

export interface TestCaseResult {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  status: string;
  executionTimeMs: number;
  error?: string;
}

export interface EvaluationResult {
  status: ExecutionStatus;
  stdout: string;
  stderr?: string;
  error?: string;
  results: TestCaseResult[];
  passedCount: number;
  totalCount: number;
  executionTimeMs: number;
  memoryBytes?: number;
  driverUsed?: string;
}

export interface RuntimeDescriptor {
  id: LanguageId;
  name: string;
  version: string;
  available: boolean;
  executable: boolean;
  fileExtension: string;
  monacoLanguage: string;
  description: string;
  driver: "docker" | "isolated-process";
}
