/** Tests logging changes to `Enum` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log, TargetType } from "../src/index.js";

const enumType = TargetType.Enum;

// #########################################################
// # Added
// #########################################################

describe("Enums - Log @added()", () => {
  it("should exclude Versions from the changelog", async () => {
    const code = `
            @versioned(Versions)
            namespace Service {
                enum Versions {
                    v1,
                    v2,
                }

                @added(Versions.v1)
                enum Status {
                    active,
                    inactive,
                }
            }
        `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
      ],
    });
  });

  it("should log multiple enums in different versions", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        enum Status {
          active,
          inactive,
        }

        @added(Versions.v2)
        enum Priority {
          low,
          medium,
          high,
        }

        @added(Versions.v3)
        enum Category {
          personal,
          work,
        }
      }
    `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
      ],
      Priority: [
        {
          version: "v2",
          changes: [Log.added(enumType, "Status")],
        },
      ],
      Category: [
        {
          version: "v3",
          changes: [Log.added(enumType, "Status")],
        },
      ],
    });
  });
});

// #########################################################
// # Removed
// #########################################################

describe("Enums - Log @removed()", () => {
  it("should log when an enum is removed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @removed(Versions.v2)
        enum Status {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.removed(enumType, "Status")],
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
        @removed(Versions.v2)
        enum Status {
          active,
          inactive,
        }

        @added(Versions.v1)
        @removed(Versions.v2)
        enum Priority {
          low,
          medium,
          high,
        }
      }
    `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.removed(enumType, "Status")],
        },
      ],
      Priority: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.removed(enumType, "Status")],
        },
      ],
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe.skip("Enums - Log @renamedFrom()", () => {
  it("should log when an enum is renamed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "UserStatus")
        enum Status {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.renamedFrom(enumType, "UserStatus", "Status")],
        },
      ],
    });
  });

  it("should log multiple renamings of the same enum", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "UserStatus")
        @renamedFrom(Versions.v3, "AccountStatus")
        enum Status {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      Status: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.renamedFrom(enumType, "UserStatus", "AccountStatus")],
        },
        {
          version: "v3",
          changes: [Log.renamedFrom(enumType, "AccountStatus", "Status")],
        },
      ],
    });
  });
});
