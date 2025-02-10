import { CompileService } from "./interfaces";
import { spawn } from "child_process";
import { tspBinPath } from "../utils/typespec";

export class DefaultCompileService implements CompileService {
  async compile(specPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn("node", [tspBinPath, "compile", specPath], {
        stdio: "inherit",
      });

      process.on("error", error => {
        console.error("Error executing tsp compile:", error);
        reject(error);
      });

      process.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }
}
