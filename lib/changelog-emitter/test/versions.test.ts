/** Tests how versions are recorded in the changelog. */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import {
  V1_VERSION,
  MODEL_TYPE,
  USER_MODEL,
  STATUS_ENUM,
  CAR_MODEL,
  PENDING_MEMBER,
  ENUM_TYPE,
  NAME_PROPERTY,
  MODEL_PROPERTY_TYPE,
  ENUM_MEMBER_TYPE,
} from "./constants.js";

describe("Versions", () => {
  it("should use the version enum member if no string is provided", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        model ${USER_MODEL} {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should use the version string if provided", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1: "1.0.0",
          v2: "2.0.0",
        }

        @added(Versions.v1)
        enum ${STATUS_ENUM} {
          active,
          @removed(Versions.v2)
          ${PENDING_MEMBER},
          inactive,
        }

        @added(Versions.v1)
        model ${USER_MODEL} {
          id: string;
          @added(Versions.v2)
          ${NAME_PROPERTY}: string;
        }

        @renamedFrom(Versions.v2, "Automobile")
        model ${CAR_MODEL} {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        "1.0.0": [Log.added(MODEL_TYPE, USER_MODEL)],
        "2.0.0": [Log.added(MODEL_PROPERTY_TYPE, NAME_PROPERTY)],
      },
      [STATUS_ENUM]: {
        "1.0.0": [Log.added(ENUM_TYPE, STATUS_ENUM)],
        "2.0.0": [Log.removed(ENUM_MEMBER_TYPE, PENDING_MEMBER)],
      },
      [CAR_MODEL]: {
        "1.0.0": [Log.added(MODEL_TYPE, "Automobile")],
        "2.0.0": [Log.renamedFrom(MODEL_TYPE, "Automobile", CAR_MODEL)],
      },
    });
  });
});
