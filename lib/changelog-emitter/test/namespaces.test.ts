/** Tests logging changes to `Namespace` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log, TargetType } from "../src/index.js";

const modelType = TargetType.Model;

describe("Namespaces", () => {
  it("should detect changes in sub-namespaces", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        namespace Schemas {
          @added(Versions.v1)
          model User {
            id: string;
            name: string;
          }
        }
      }
    `;

    await emitAndValidate(code, {
      User: [
        {
          version: "v1",
          changes: [Log.added(modelType, "User")],
        },
      ],
    });
  });

  it("should combine all namespaces into a single changelog file", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }
        namespace People {
          model User {
            id: string;
            name: string;
          }
        }
        namespace Things {
          model Car {
            id: string;
            name: string;
          }
        }
      }
    `;

    await emitAndValidate(code, {
      User: [
        {
          version: "v1",
          changes: [Log.added(modelType, "User")],
        },
      ],
      Car: [
        {
          version: "v1",
          changes: [Log.added(modelType, "Car")],
        },
      ],
    });
  });
});
