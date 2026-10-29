import { spawn } from "child_process";
import { resolveTspBinPath } from "../../utils/typespec";

export class DefaultCompileService {
  async compile(specPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [resolveTspBinPath(), "compile", specPath], {
        stdio: "inherit",
      });

      child.on("error", error => {
        console.error("Error executing tsp compile:", error);
        reject(error);
      });

      child.on("exit", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }
}
