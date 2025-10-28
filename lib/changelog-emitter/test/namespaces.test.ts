/** Tests logging changes to targets split across multiple namespaces. */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import { V1_VERSION, MODEL_TYPE, USER_MODEL, CAR_MODEL } from "./constants.js";

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
          model ${USER_MODEL} {
            id: string;
            name: string;
          }
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: [
        {
          version: "v1",
          changes: [Log.added(MODEL_TYPE, USER_MODEL)],
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
          model ${USER_MODEL} {
            id: string;
            name: string;
          }
        }
        namespace Things {
          model ${CAR_MODEL} {
            id: string;
            name: string;
          }
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: [
        {
          version: V1_VERSION,
          changes: [Log.added(MODEL_TYPE, USER_MODEL)],
        },
      ],
      [CAR_MODEL]: [
        {
          version: V1_VERSION,
          changes: [Log.added(MODEL_TYPE, CAR_MODEL)],
        },
      ],
    });
  });
});
