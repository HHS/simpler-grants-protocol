/** Tests logging changes to `Model` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import {
  MODEL_TYPE,
  USER_MODEL,
  CAR_MODEL,
  V1_VERSION,
  V2_VERSION,
  V3_VERSION,
} from "./constants.js";

// #########################################################
// # Added
// #########################################################

describe("Models - Log @added()", () => {
  it("should create a log entry for each model", async () => {
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
      }

      @added(Versions.v1)
      model ${USER_MODEL} {
        id: string;
        name: string;
      }

      @added(Versions.v1)
      model ${CAR_MODEL} {
        id: string;
        name: string;
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

  it("should default to the first version if model is undecorated", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          ${V1_VERSION},
        }
        
        model ${USER_MODEL} {
          id: string;
          name: string;
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
    });
  });

  it("should exclude versions that have no changes", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        model ${USER_MODEL} {
          id: string;
          name: string;
        }

        @added(Versions.v3)
        model ${CAR_MODEL} {
          id: string;
          name: string;
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
          version: V3_VERSION,
          changes: [Log.added(MODEL_TYPE, CAR_MODEL)],
        },
      ],
    });
  });
});

// #########################################################
// # Removed
// #########################################################

describe("Models - Log @removed()", () => {
  it("should create a log entry for each model", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @removed(Versions.v2)
        model ${USER_MODEL} {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: [
        {
          version: V1_VERSION,
          changes: [Log.added(MODEL_TYPE, USER_MODEL)],
        },
        {
          version: V2_VERSION,
          changes: [Log.removed(MODEL_TYPE, USER_MODEL)],
        },
      ],
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe("Models - Log @renamedFrom()", () => {
  it("should include both the old and new model names", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "Person")
        model ${USER_MODEL} {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: [
        {
          version: V1_VERSION,
          changes: [Log.added(MODEL_TYPE, "Person")],
        },
        {
          version: V2_VERSION,
          changes: [Log.renamedFrom(MODEL_TYPE, "Person", USER_MODEL)],
        },
      ],
    });
  });

  it("should correctly track multiple renamings", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "Person")
        @renamedFrom(Versions.v3, "AccountOwner")
        model ${USER_MODEL} {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: [
        {
          version: V1_VERSION,
          changes: [Log.added(MODEL_TYPE, "Person")],
        },
        {
          version: V2_VERSION,
          changes: [Log.renamedFrom(MODEL_TYPE, "Person", "AccountOwner")],
        },
        {
          version: V3_VERSION,
          changes: [Log.renamedFrom(MODEL_TYPE, "AccountOwner", USER_MODEL)],
        },
      ],
    });
  });
});
