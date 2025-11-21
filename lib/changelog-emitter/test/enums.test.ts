/** Tests logging changes to `Enum` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import {
  ENUM_TYPE,
  STATUS_ENUM,
  PRIORITY_ENUM,
  CATEGORY_ENUM,
  V1_VERSION,
  V2_VERSION,
  V3_VERSION,
} from "./constants.js";

// #########################################################
// # Added
// #########################################################

describe("Enums - Log @added()", () => {
  it("should exclude Versions from the changelog", async () => {
    const code = `
            @versioned(Versions)
            namespace Service {
                enum Versions {
                    ${V1_VERSION},
                    ${V2_VERSION},
                }

                @added(Versions.v1)
                enum ${STATUS_ENUM} {
                    active,
                    inactive,
                }
            }
        `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
      },
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
        enum ${STATUS_ENUM} {
          active,
          inactive,
        }

        @added(Versions.v2)
        enum ${PRIORITY_ENUM} {
          high,
          medium,
          low,
        }

        @added(Versions.v3)
        enum ${CATEGORY_ENUM} {
          electronics,
          clothing,
          books,
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
      },
      [PRIORITY_ENUM]: {
        [V2_VERSION]: [Log.added(ENUM_TYPE, PRIORITY_ENUM)],
      },
      [CATEGORY_ENUM]: {
        [V3_VERSION]: [Log.added(ENUM_TYPE, CATEGORY_ENUM)],
      },
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
        enum ${STATUS_ENUM} {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.removed(ENUM_TYPE, STATUS_ENUM)],
      },
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
        enum ${PRIORITY_ENUM} {
          high,
          medium,
          low,
        }

        @added(Versions.v1)
        @removed(Versions.v2)
        enum ${STATUS_ENUM} {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      [PRIORITY_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, PRIORITY_ENUM)],
        [V2_VERSION]: [Log.removed(ENUM_TYPE, PRIORITY_ENUM)],
      },
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.removed(ENUM_TYPE, STATUS_ENUM)],
      },
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe("Enums - Log @renamedFrom()", () => {
  it.skip("should log when an enum is renamed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "State")
        enum ${STATUS_ENUM} {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.renamedFrom(ENUM_TYPE, "State", STATUS_ENUM)],
      },
    });
  });

  it.skip("should log multiple renamings of the same enum", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        @added(Versions.v1)
        @renamedFrom(Versions.v2, "State")
        @renamedFrom(Versions.v3, "Condition")
        enum ${STATUS_ENUM} {
          active,
          inactive,
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.renamedFrom(ENUM_TYPE, "State", "Condition")],
        [V3_VERSION]: [Log.renamedFrom(ENUM_TYPE, "Condition", STATUS_ENUM)],
      },
    });
  });
});
