/** Tests logging changes to `EnumMember` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log, TargetType } from "../src/index.js";

const enumType = TargetType.Enum;
const enumMemberType = TargetType.EnumMember;

// #########################################################
// # Added
// #########################################################

describe("Enum members - Log @added()", () => {
  it("should log when an enum member is added", async () => {
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
          @added(Versions.v2)
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
          changes: [Log.added(enumMemberType, "inactive")],
        },
      ],
    });
  });

  it("should log multiple enum members added in the same version", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        enum Priority {
          low,
          @added(Versions.v2)
          medium,
          @added(Versions.v2)
          high,
        }
      }
    `;

    await emitAndValidate(code, {
      Priority: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [
            Log.added(enumMemberType, "medium"),
            Log.added(enumMemberType, "high"),
          ],
        },
      ],
    });
  });

  it("should log enum members added across multiple versions", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        enum Category {
          personal,
          @added(Versions.v2)
          work,
          @added(Versions.v3)
          education,
        }
      }
    `;

    await emitAndValidate(code, {
      Category: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.added(enumMemberType, "work")],
        },
        {
          version: "v3",
          changes: [Log.added(enumMemberType, "education")],
        },
      ],
    });
  });
});

// #########################################################
// # Removed
// #########################################################

describe("Enum members - Log @removed()", () => {
  it("should log when an enum member is removed", async () => {
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
          @removed(Versions.v2)
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
          changes: [Log.removed(enumMemberType, "inactive")],
        },
      ],
    });
  });

  it("should log multiple enum members removed in the same version", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        enum Priority {
          low,
          @removed(Versions.v2)
          medium,
          @removed(Versions.v2)
          high,
        }
      }
    `;

    await emitAndValidate(code, {
      Priority: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [
            Log.removed(enumMemberType, "medium"),
            Log.removed(enumMemberType, "high"),
          ],
        },
      ],
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe.skip("Enum members - Log @renamedFrom()", () => {
  it("should log when an enum member is renamed", async () => {
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
          @renamedFrom(Versions.v2, "disabled")
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
          changes: [Log.renamedFrom(enumMemberType, "disabled", "inactive")],
        },
      ],
    });
  });

  it("should log multiple renamings of the same enum member", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        enum Priority {
          low,
          @renamedFrom(Versions.v2, "normal")
          @renamedFrom(Versions.v3, "standard")
          medium,
        }
      }
    `;

    await emitAndValidate(code, {
      Priority: [
        {
          version: "v1",
          changes: [Log.added(enumType, "Status")],
        },
        {
          version: "v2",
          changes: [Log.renamedFrom(enumMemberType, "normal", "standard")],
        },
        {
          version: "v3",
          changes: [Log.renamedFrom(enumMemberType, "standard", "medium")],
        },
      ],
    });
  });
});
