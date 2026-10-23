/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ISandboxDriver } from "./sandbox-driver.interface.js";
import { DockerSandboxDriver } from "./docker-sandbox.driver.js";
import { ProcessIsolatedSandboxDriver } from "./process-isolated.driver.js";
import { RuntimeDescriptor, LanguageId } from "./types.js";

export class SandboxDriverFactory {
  private static dockerDriver = new DockerSandboxDriver();
  private static processDriver = new ProcessIsolatedSandboxDriver();
  private static cachedActiveDriver: ISandboxDriver | null = null;

  /**
   * Resolve the active sandbox driver dynamically based on system capabilities.
   * Prefers Docker for container isolation; cleanly falls back to Process Isolation when Docker is absent.
   */
  public static async getDriver(): Promise<ISandboxDriver> {
    if (this.cachedActiveDriver) {
      return this.cachedActiveDriver;
    }

    // Allow explicit override via environment
    if (process.env.SANDBOX_DRIVER === "process") {
      this.cachedActiveDriver = this.processDriver;
      return this.processDriver;
    }

    const dockerAvailable = await this.dockerDriver.isAvailable();
    if (dockerAvailable) {
      console.log("[SandboxFactory] Activated secure OCI Docker sandbox execution driver.");
      this.cachedActiveDriver = this.dockerDriver;
      return this.dockerDriver;
    }

    console.log("[SandboxFactory] Docker daemon not found. Activated defensive process-isolated sandbox driver.");
    this.cachedActiveDriver = this.processDriver;
    return this.processDriver;
  }

  /**
   * Reset driver cache (useful for testing or dynamic daemon recovery)
   */
  public static resetDriverCache(): void {
    this.cachedActiveDriver = null;
  }

  /**
   * Probe and list all supported language runtimes across the system
   */
  public static async probeRuntimes(): Promise<RuntimeDescriptor[]> {
    const driver = await this.getDriver();
    const runtimes: RuntimeDescriptor[] = [];

    // 1. Python
    const pyProbe = await driver.probeRuntime("python");
    runtimes.push({
      id: "python",
      name: "Python 3",
      version: pyProbe.version,
      available: pyProbe.available,
      executable: pyProbe.available,
      fileExtension: "py",
      monacoLanguage: "python",
      description: "Python 3 sandbox with standard library and NumPy support",
      driver: driver.name
    });

    // 2. JavaScript (Node.js)
    const jsProbe = await driver.probeRuntime("javascript");
    runtimes.push({
      id: "javascript",
      name: "JavaScript (Node.js)",
      version: jsProbe.version,
      available: jsProbe.available,
      executable: jsProbe.available,
      fileExtension: "js",
      monacoLanguage: "javascript",
      description: "Node.js isolated execution runtime",
      driver: driver.name
    });

    // 3. Java
    const javaProbe = await driver.probeRuntime("java");
    runtimes.push({
      id: "java",
      name: "Java",
      version: javaProbe.version,
      available: javaProbe.available,
      executable: javaProbe.available,
      fileExtension: "java",
      monacoLanguage: "java",
      description: "OpenJDK Java compiler and sandbox JVM",
      driver: driver.name
    });

    // 4. SQL
    const sqlProbe = await driver.probeRuntime("sql");
    runtimes.push({
      id: "sql",
      name: "SQL",
      version: sqlProbe.version,
      available: sqlProbe.available,
      executable: sqlProbe.available,
      fileExtension: "sql",
      monacoLanguage: "sql",
      description: "In-memory SQLite relational execution engine",
      driver: driver.name
    });

    // 5. C
    const cProbe = await driver.probeRuntime("c");
    runtimes.push({
      id: "c",
      name: "C (GCC)",
      version: cProbe.version,
      available: cProbe.available,
      executable: cProbe.available,
      fileExtension: "c",
      monacoLanguage: "c",
      description: "GNU C compiler with strict optimization",
      driver: driver.name
    });

    // 6. C++
    const cppProbe = await driver.probeRuntime("cpp");
    runtimes.push({
      id: "cpp",
      name: "C++ (G++)",
      version: cppProbe.version,
      available: cppProbe.available,
      executable: cppProbe.available,
      fileExtension: "cpp",
      monacoLanguage: "cpp",
      description: "GNU C++ compiler (G++)",
      driver: driver.name
    });

    // 7. Web Development (Sandboxed browser iframe)
    runtimes.push({
      id: "web",
      name: "Web Development",
      version: "HTML5 / CSS3 / ES2024",
      available: true,
      executable: true,
      fileExtension: "html",
      monacoLanguage: "html",
      description: "Client-side isolated browser DOM sandbox",
      driver: driver.name
    });

    return runtimes;
  }
}
