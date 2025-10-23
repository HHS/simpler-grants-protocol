/** Tests logging changes to `ModelProperty` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.madeRequired
 * - @Versioning.madeOptional
 * - @Versioning.typeChangedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log, TargetType } from "../src/index.js";

const modelType = TargetType.Model;
const propType = TargetType.ModelProperty;

// #########################################################
// # Added
// #########################################################

describe("Props - Log @added()", () => {
  it("should log when a property is added", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        model User {
          id: string;
          @added(Versions.v2)
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
          changes: [Log.added(propType, "name")],
        },
      ],
    });
  });

  it("should log multiple additions in the same version", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        model User {
          id: string;
          @added(Versions.v2)
          name: string;
          @added(Versions.v2)
          age: int32;
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
          changes: [Log.added(propType, "name"), Log.added(propType, "age")],
        },
      ],
    });
  });
});

// #########################################################
// # Removed
// #########################################################

describe("Props - Log @removed()", () => {
  it("should log when a property is removed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        model User {
          id: string;
          @removed(Versions.v2)
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
          changes: [Log.removed(propType, "name")],
        },
      ],
    });
  });

  it("should log multiple removals in the same version", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        model User {
          id: string;
          @removed(Versions.v2)
          name: string;
          @removed(Versions.v2)
          age: int32;
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
          changes: [
            Log.removed(propType, "name"),
            Log.removed(propType, "age"),
          ],
        },
      ],
    });
  });
});

// #########################################################
// # Made required
// #########################################################

describe("Props - Log @madeRequired()", () => {
  it("should log when a property is made required", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        model User {
          id: string;
          @madeRequired(Versions.v2)
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
          changes: [Log.madeRequired("name")],
        },
      ],
    });
  });
});

// #########################################################
// # Made optional
// #########################################################

describe("Props - Log @madeOptional()", () => {
  it("should log when a property is made optional", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        model User {
          id: string;
          @madeOptional(Versions.v2)
          name?: string;
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
          changes: [Log.madeOptional("name")],
        },
      ],
    });
  });
});

// #########################################################
// Changed type
// #########################################################

describe.skip("Props - Log @typeChangedFrom()", () => {
  it("should log when a property type is changed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        model User {
          id: string;
          @typeChangedFrom(Versions.v2, string)
          name: int32;
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
          changes: [Log.typeChangedFrom(propType, "string", "int32")],
        },
      ],
    });
  });

  it("should log multiple type changes to the same property", async () => {
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
          @typeChangedFrom(Versions.v2, boolean)
          @typeChangedFrom(Versions.v3, integer)
          error: string;
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
          changes: [Log.typeChangedFrom(propType, "boolean", "integer")],
        },
        {
          version: "v3",
          changes: [Log.typeChangedFrom(propType, "integer", "string")],
        },
      ],
    });
  });
});
