/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SandboxExecutionOptions, SandboxExecutionResult } from "./types.js";

export interface ISandboxDriver {
  readonly name: "docker" | "isolated-process";

  /**
   * Determine if the driver is operational on this host
   */
  isAvailable(): Promise<boolean>;

  /**
   * Execute code program in the isolated sandbox environment
   */
  execute(options: SandboxExecutionOptions): Promise<SandboxExecutionResult>;

  /**
   * Probe language runtime availability
   */
  probeRuntime(language: string): Promise<{ available: boolean; version: string }>;
}
