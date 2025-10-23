/** Tests logging changes to `Model` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log, TargetType } from "../src/index.js";

const modelType = TargetType.Model;

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
      model User {
        id: string;
        name: string;
      }

      @added(Versions.v1)
      model Car {
        id: string;
        name: string;
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
          changes: [Log.added(modelType, "User")],
        },
      ],
    });
  });

  it("should default to the first version if model is undecorated", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
        }
        
        model User {
          id: string;
          name: string;
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
        model User {
          id: string;
          name: string;
        }

        @added(Versions.v3)
        model Car {
          id: string;
          name: string;
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
          version: "v3",
          changes: [Log.added(modelType, "User")],
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
        model User {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      User: [
        {
          version: "v1",
          changes: [Log.added(modelType, "User")],
        },
        {
          version: "v2",
          changes: [Log.removed(modelType, "User")],
        },
      ],
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe("Models - Log @renamedFrom()", () => {
  it.skip("should include both the old and new model names", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "Person")
        model User {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      User: [
        {
          version: "v1",
          changes: [Log.added(modelType, "User")],
        },
        {
          version: "v2",
          changes: [Log.renamedFrom(modelType, "Person", "User")],
        },
      ],
    });
  });

  it.skip("should correctly track multiple renamings", async () => {
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
        model User {
          id: string;
          name: string;
        }
      }
    `;

    await emitAndValidate(code, {
      User: [
        {
          version: "v1",
          changes: [Log.added(modelType, "User")],
        },
        {
          version: "v2",
          changes: [Log.renamedFrom(modelType, "Person", "AccountOwner")],
        },
        {
          version: "v3",
          changes: [Log.renamedFrom(modelType, "AccountOwner", "User")],
        },
      ],
    });
  });
});
