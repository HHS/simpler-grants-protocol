import { CompileService } from "./interfaces";
import { spawn } from "child_process";

export class DefaultCompileService implements CompileService {
  async compile(typespecPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("npx", ["tsp", "compile", typespecPath], {
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
