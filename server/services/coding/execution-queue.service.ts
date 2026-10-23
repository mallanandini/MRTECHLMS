/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../../mysql.js";
import { ISandboxDriver } from "./sandbox-driver.interface.js";
import { SandboxDriverFactory } from "./sandbox-factory.js";
import { SecurityValidator } from "./security-validator.js";
import { TestCase, TestCaseResult, EvaluationResult, SandboxExecutionResult } from "./types.js";

export interface EnqueueJobOptions {
  userId: string;
  organizationId?: string;
  challengeId?: string;
  language: string;
  code: string;
  stdin?: string;
  jobType: "run" | "submit";
  timeLimitMs?: number;
  testCases?: TestCase[];
}

export interface CodingJobRecord {
  id: string;
  userId: string;
  organizationId: string;
  challengeId: string | null;
  language: string;
  code: string;
  stdin: string | null;
  jobType: string;
  status: "queued" | "running" | "completed" | "failed" | "timeout" | "security_violation";
  result: any | null;
  error: string | null;
  executionDriver: string | null;
  executionTimeMs: number | null;
  memoryBytes: number | null;
  enqueuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface QueuedItem {
  id: string;
  options: EnqueueJobOptions;
  enqueuedAt: number;
}

interface JobWaiter {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: NodeJS.Timeout;
}

export class CodeExecutionQueue {
  private static instance: CodeExecutionQueue;
  private queue: QueuedItem[] = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = 4;
  private waiters = new Map<string, JobWaiter>();

  public static getInstance(): CodeExecutionQueue {
    if (!CodeExecutionQueue.instance) {
      CodeExecutionQueue.instance = new CodeExecutionQueue();
    }
    return CodeExecutionQueue.instance;
  }

  /**
   * Enqueue a job asynchronously and return immediately with the jobId
   */
  public async enqueue(options: EnqueueJobOptions): Promise<string> {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const orgId = options.organizationId || "org-default";
    const now = new Date().toISOString();

    // 1. Validate Input & Static Security Check
    const validation = SecurityValidator.validateInput({
      language: options.language,
      code: options.code,
      stdin: options.stdin,
      testCasesCount: options.testCases?.length,
      timeLimitMs: options.timeLimitMs
    });

    if (!validation.valid) {
      const status = "failed";
      const violationStatus = validation.securityViolation ? "security_violation" : "failed";
      await this.persistJob({
        id: jobId,
        userId: options.userId,
        organizationId: orgId,
        challengeId: options.challengeId || null,
        language: options.language,
        code: options.code,
        stdin: options.stdin || null,
        jobType: options.jobType || "run",
        status,
        result: JSON.stringify({
          stdout: "",
          stderr: validation.error,
          error: validation.error,
          status: violationStatus,
          executionTimeMs: 0
        }),
        error: validation.error || "Validation failed",
        executionDriver: "validator",
        executionTimeMs: 0,
        memoryBytes: 0,
        enqueuedAt: now,
        startedAt: now,
        completedAt: now
      });

      return jobId;
    }

    // 2. Persist in Initial 'queued' State
    await this.persistJob({
      id: jobId,
      userId: options.userId,
      organizationId: orgId,
      challengeId: options.challengeId || null,
      language: options.language,
      code: options.code,
      stdin: options.stdin || null,
      jobType: options.jobType,
      status: "queued",
      result: null,
      error: null,
      executionDriver: "pending",
      executionTimeMs: null,
      memoryBytes: null,
      enqueuedAt: now,
      startedAt: null,
      completedAt: null
    });

    this.queue.push({
      id: jobId,
      options,
      enqueuedAt: Date.now()
    });

    this.processNext();
    return jobId;
  }

  /**
   * Enqueue job and await completion within timeout window (ideal for synchronous REST APIs)
   */
  public async enqueueAndAwait(
    options: EnqueueJobOptions,
    waitTimeoutMs = 20000
  ): Promise<any> {
    const jobId = await this.enqueue(options);

    // If already finalized by validation failure
    const current = await this.getJob(jobId);
    if (current && (current.status === "security_violation" || (current.status === "failed" && current.error))) {
      return typeof current.result === "string" ? JSON.parse(current.result) : current.result;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiters.has(jobId)) {
          this.waiters.delete(jobId);
          reject(new Error(`Execution timed out waiting for worker queue (after ${waitTimeoutMs}ms)`));
        }
      }, waitTimeoutMs);

      this.waiters.set(jobId, { resolve, reject, timer });
    });
  }

  /**
   * Retrieve job status and telemetry from database
   */
  public async getJob(jobId: string): Promise<CodingJobRecord | null> {
    try {
      const sql = "SELECT * FROM `coding_execution_jobs` WHERE `id` = ? LIMIT 1";
      const [rows]: any = await pool.query(sql, [jobId]);
      if (!rows || rows.length === 0) return null;
      const job = rows[0];
      if (job.result && typeof job.result === "string") {
        try {
          job.result = JSON.parse(job.result);
        } catch {}
      }
      return job;
    } catch (err) {
      console.error(`[ExecutionQueue] Failed to query job ${jobId}:`, err);
      return null;
    }
  }

  /**
   * Current queue metrics
   */
  public getMetrics() {
    return {
      queuedLength: this.queue.length,
      activeWorkers: this.activeWorkers,
      maxConcurrency: this.maxConcurrency
    };
  }

  /**
   * Worker pump: Dispatches pending jobs up to max concurrency
   */
  private async processNext(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeWorkers++;

    (async () => {
      const startTime = Date.now();
      const startedAt = new Date().toISOString();

      try {
        await this.updateJobStatus(item.id, "running", { startedAt });

        const driver = await SandboxDriverFactory.getDriver();
        let finalResult: any;
        let jobStatus: CodingJobRecord["status"] = "completed";
        let executionTimeMs = 0;
        let memoryBytes = 0;
        let errorMessage: string | null = null;

        if (item.options.jobType === "run" && (!item.options.testCases || item.options.testCases.length === 0)) {
          // Single execution run
          const runRes = await driver.execute({
            jobId: item.id,
            language: item.options.language,
            code: item.options.code,
            stdin: item.options.stdin || "",
            timeLimitMs: item.options.timeLimitMs || SecurityValidator.DEFAULT_TIME_LIMIT_MS
          });

          executionTimeMs = runRes.executionTimeMs;
          memoryBytes = runRes.memoryBytes;
          if (runRes.timedOut) {
            jobStatus = "timeout";
          } else if (runRes.exitCode !== 0) {
            jobStatus = "failed";
          } else {
            jobStatus = "completed";
          }

          finalResult = {
            stdout: runRes.stdout,
            stderr: runRes.stderr,
            error: runRes.error,
            executionTimeMs: runRes.executionTimeMs,
            memoryBytes: runRes.memoryBytes,
            timedOut: runRes.timedOut,
            exitCode: runRes.exitCode,
            status: runRes.timedOut ? "time_limit_exceeded" : (runRes.exitCode === 0 ? "passed" : "error"),
            driverUsed: runRes.driverUsed
          };
          errorMessage = runRes.error || (runRes.exitCode !== 0 ? runRes.stderr : null);
        } else {
          // Multi test case evaluation
          const evalRes = await this.evaluateWithDriver(
            driver,
            item.options.language,
            item.options.code,
            item.options.testCases || [],
            item.options.timeLimitMs || SecurityValidator.DEFAULT_TIME_LIMIT_MS
          );

          executionTimeMs = evalRes.executionTimeMs;
          memoryBytes = evalRes.memoryBytes || 0;
          if (evalRes.status === "time_limit_exceeded") {
            jobStatus = "timeout";
          } else if (evalRes.status === "passed") {
            jobStatus = "completed";
          } else {
            jobStatus = "failed";
          }

          finalResult = evalRes;
          errorMessage = evalRes.error || null;
        }

        const completedAt = new Date().toISOString();
        await this.finalizeJob(
          item.id,
          jobStatus,
          finalResult,
          errorMessage,
          driver.name,
          executionTimeMs,
          memoryBytes,
          completedAt
        );

        this.notifyWaiter(item.id, finalResult);
      } catch (err: any) {
        console.error(`[ExecutionQueue] Worker error executing job ${item.id}:`, err);
        const failResult = {
          stdout: "",
          stderr: err.message,
          error: err.message,
          status: "error",
          executionTimeMs: Date.now() - startTime
        };

        await this.finalizeJob(
          item.id,
          "failed",
          failResult,
          err.message,
          "unknown",
          Date.now() - startTime,
          0,
          new Date().toISOString()
        );

        this.notifyWaiter(item.id, failResult);
      } finally {
        this.activeWorkers--;
        this.processNext();
      }
    })();
  }

  /**
   * Evaluate a suite of test cases sequentially using the driver
   */
  private async evaluateWithDriver(
    driver: ISandboxDriver,
    language: string,
    code: string,
    testCases: TestCase[],
    timeLimitMs: number
  ): Promise<EvaluationResult> {
    const results: TestCaseResult[] = [];
    let totalTime = 0;
    let overallStatus: EvaluationResult["status"] = "passed";

    // Fast-fail check for Java compilation
    if (language === "java") {
      const compileCheck = await driver.execute({
        language,
        code,
        stdin: "",
        timeLimitMs: 6000
      });

      if (compileCheck.status === "compilation_error" || compileCheck.exitCode !== 0 && compileCheck.error?.includes("Compilation")) {
        return {
          status: "compilation_error",
          stdout: "",
          stderr: compileCheck.stderr,
          error: compileCheck.stderr || "Compilation Error",
          results: testCases.map(tc => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            status: "error",
            executionTimeMs: compileCheck.executionTimeMs,
            error: compileCheck.stderr
          })),
          passedCount: 0,
          totalCount: testCases.length,
          executionTimeMs: compileCheck.executionTimeMs,
          driverUsed: driver.name
        };
      }
    }

    for (const tc of testCases) {
      const res = await driver.execute({
        language,
        code,
        stdin: tc.input,
        timeLimitMs
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
          executionTimeMs: res.executionTimeMs,
          error: "Time Limit Exceeded"
        });
        continue;
      }

      if (res.exitCode !== 0) {
        if (overallStatus === "passed") overallStatus = "failed";
        results.push({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: res.stdout,
          passed: false,
          status: "error",
          executionTimeMs: res.executionTimeMs,
          error: res.stderr || res.error || "Runtime Error"
        });
        continue;
      }

      const actual = this.normalizeOutput(res.stdout);
      const expected = this.normalizeOutput(tc.expectedOutput);
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

    const passedCount = results.filter(r => r.passed).length;
    const firstFailed = results.find(r => !r.passed);

    return {
      status: overallStatus,
      stdout: results.map((r, i) => `Test ${i + 1}: ${r.status.toUpperCase()}`).join("\n"),
      stderr: firstFailed?.error,
      error: firstFailed?.error,
      results,
      passedCount,
      totalCount: testCases.length,
      executionTimeMs: totalTime,
      driverUsed: driver.name
    };
  }

  private normalizeOutput(text: string): string {
    return (text || "")
      .replace(/\r\n/g, "\n")
      .trim();
  }

  private notifyWaiter(jobId: string, result: any): void {
    const waiter = this.waiters.get(jobId);
    if (waiter) {
      clearTimeout(waiter.timer);
      this.waiters.delete(jobId);
      waiter.resolve(result);
    }
  }

  private async persistJob(record: Partial<CodingJobRecord>): Promise<void> {
    const sql = `
      INSERT INTO \`coding_execution_jobs\`
      (\`id\`, \`userId\`, \`organizationId\`, \`challengeId\`, \`language\`, \`code\`, \`stdin\`, \`jobType\`, \`status\`, \`result\`, \`error\`, \`executionDriver\`, \`executionTimeMs\`, \`memoryBytes\`, \`enqueuedAt\`, \`startedAt\`, \`completedAt\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      record.id,
      record.userId,
      record.organizationId,
      record.challengeId || null,
      record.language,
      record.code,
      record.stdin || null,
      record.jobType,
      record.status,
      record.result,
      record.error || null,
      record.executionDriver || null,
      record.executionTimeMs || null,
      record.memoryBytes || null,
      record.enqueuedAt,
      record.startedAt || null,
      record.completedAt || null
    ];
    await pool.query(sql, params);
  }

  private async updateJobStatus(id: string, status: string, extra: { startedAt?: string }): Promise<void> {
    const sql = "UPDATE `coding_execution_jobs` SET `status` = ?, `startedAt` = COALESCE(?, `startedAt`) WHERE `id` = ?";
    await pool.query(sql, [status, extra.startedAt || null, id]);
  }

  private async finalizeJob(
    id: string,
    status: string,
    result: any,
    error: string | null,
    executionDriver: string,
    executionTimeMs: number,
    memoryBytes: number,
    completedAt: string
  ): Promise<void> {
    const sql = `
      UPDATE \`coding_execution_jobs\`
      SET \`status\` = ?, \`result\` = ?, \`error\` = ?, \`executionDriver\` = ?, \`executionTimeMs\` = ?, \`memoryBytes\` = ?, \`completedAt\` = ?
      WHERE \`id\` = ?
    `;
    await pool.query(sql, [
      status,
      JSON.stringify(result),
      error,
      executionDriver,
      executionTimeMs,
      memoryBytes,
      completedAt,
      id
    ]);
  }
}
