/** Tests logging changes to `EnumMember` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.renamedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import {
  ENUM_TYPE,
  ENUM_MEMBER_TYPE,
  STATUS_ENUM,
  PRIORITY_ENUM,
  CATEGORY_ENUM,
  ACTIVE_MEMBER,
  INACTIVE_MEMBER,
  HIGH_MEMBER,
  MEDIUM_MEMBER,
  LOW_MEMBER,
  ELECTRONICS_MEMBER,
  CLOTHING_MEMBER,
  BOOKS_MEMBER,
  V1_VERSION,
  V2_VERSION,
  V3_VERSION,
} from "./constants.js";

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
        enum ${STATUS_ENUM} {
          ${ACTIVE_MEMBER},
          @added(Versions.v2)
          ${INACTIVE_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.added(ENUM_MEMBER_TYPE, INACTIVE_MEMBER)],
      },
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
        enum ${PRIORITY_ENUM} {
          ${HIGH_MEMBER},
          @added(Versions.v2)
          ${MEDIUM_MEMBER},
          @added(Versions.v2)
          ${LOW_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [PRIORITY_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, PRIORITY_ENUM)],
        [V2_VERSION]: [
          Log.added(ENUM_MEMBER_TYPE, MEDIUM_MEMBER),
          Log.added(ENUM_MEMBER_TYPE, LOW_MEMBER),
        ],
      },
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
        enum ${CATEGORY_ENUM} {
          ${ELECTRONICS_MEMBER},
          @added(Versions.v2)
          ${CLOTHING_MEMBER},
          @added(Versions.v3)
          ${BOOKS_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [CATEGORY_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, CATEGORY_ENUM)],
        [V2_VERSION]: [Log.added(ENUM_MEMBER_TYPE, CLOTHING_MEMBER)],
        [V3_VERSION]: [Log.added(ENUM_MEMBER_TYPE, BOOKS_MEMBER)],
      },
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
        enum ${STATUS_ENUM} {
          ${ACTIVE_MEMBER},
          @removed(Versions.v2)
          ${INACTIVE_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [Log.removed(ENUM_MEMBER_TYPE, INACTIVE_MEMBER)],
      },
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
        enum ${PRIORITY_ENUM} {
          ${HIGH_MEMBER},
          @removed(Versions.v2)
          ${MEDIUM_MEMBER},
          @removed(Versions.v2)
          ${LOW_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [PRIORITY_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, PRIORITY_ENUM)],
        [V2_VERSION]: [
          Log.removed(ENUM_MEMBER_TYPE, MEDIUM_MEMBER),
          Log.removed(ENUM_MEMBER_TYPE, LOW_MEMBER),
        ],
      },
    });
  });
});

// #########################################################
// # Renamed
// #########################################################

describe("Enum members - Log @renamedFrom()", () => {
  it.skip("should log when an enum member is renamed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        @added(Versions.v1)
        enum ${STATUS_ENUM} {
          ${ACTIVE_MEMBER},
          @renamedFrom(Versions.v2, "disabled")
          ${INACTIVE_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [
          Log.renamedFrom(ENUM_MEMBER_TYPE, "disabled", INACTIVE_MEMBER),
        ],
      },
    });
  });

  it.skip("should log multiple renamings of the same enum member", async () => {
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
          ${ACTIVE_MEMBER},
          @renamedFrom(Versions.v2, "disabled")
          @renamedFrom(Versions.v3, "offline")
          ${INACTIVE_MEMBER},
        }
      }
    `;

    await emitAndValidate(code, {
      [STATUS_ENUM]: {
        [V1_VERSION]: [Log.added(ENUM_TYPE, STATUS_ENUM)],
        [V2_VERSION]: [
          Log.renamedFrom(ENUM_MEMBER_TYPE, "disabled", "offline"),
        ],
        [V3_VERSION]: [
          Log.renamedFrom(ENUM_MEMBER_TYPE, "offline", INACTIVE_MEMBER),
        ],
      },
    });
  });
});
