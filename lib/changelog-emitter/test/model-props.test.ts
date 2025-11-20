/** Tests logging changes to `ModelProperty` with the following decorators:
 * - @Versioning.added
 * - @Versioning.removed
 * - @Versioning.madeRequired
 * - @Versioning.madeOptional
 * - @Versioning.typeChangedFrom
 */

import { it, describe } from "vitest";
import { emitAndValidate } from "./tester.js";
import { Log } from "../src/index.js";
import {
  MODEL_TYPE,
  MODEL_PROPERTY_TYPE,
  USER_MODEL,
  ID_PROPERTY,
  NAME_PROPERTY,
  EMAIL_PROPERTY,
  STRING_TYPE,
  NUMBER_TYPE,
  BOOLEAN_TYPE,
  V1_VERSION,
  V2_VERSION,
  V3_VERSION,
} from "./constants.js";

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

        model ${USER_MODEL} {
          ${ID_PROPERTY}: ${STRING_TYPE};
          @added(Versions.v2)
          ${NAME_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.added(MODEL_PROPERTY_TYPE, NAME_PROPERTY)],
      },
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

        model ${USER_MODEL} {
          ${ID_PROPERTY}: ${STRING_TYPE};
          @added(Versions.v2)
          ${NAME_PROPERTY}: ${STRING_TYPE};
          @added(Versions.v2)
          ${EMAIL_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.added(MODEL_PROPERTY_TYPE, NAME_PROPERTY),
          Log.added(MODEL_PROPERTY_TYPE, EMAIL_PROPERTY),
        ],
      },
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

        model ${USER_MODEL} {
          id: string;
          @removed(Versions.v2)
          ${NAME_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.removed(MODEL_PROPERTY_TYPE, NAME_PROPERTY)],
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

        model ${USER_MODEL} {
          id: string;
          @removed(Versions.v2)
          ${NAME_PROPERTY}: ${STRING_TYPE};
          @removed(Versions.v2)
          ${EMAIL_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.removed(MODEL_PROPERTY_TYPE, NAME_PROPERTY),
          Log.removed(MODEL_PROPERTY_TYPE, EMAIL_PROPERTY),
        ],
      },
    });
  });
});

// #########################################################
// # Made Required
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

        model ${USER_MODEL} {
          id: string;
          ${NAME_PROPERTY}?: ${STRING_TYPE};
          @madeRequired(Versions.v2)
          ${EMAIL_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.madeRequired(EMAIL_PROPERTY)],
      },
    });
  });
});

// #########################################################
// # Made Optional
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

        model ${USER_MODEL} {
          id: string;
          ${NAME_PROPERTY}: ${STRING_TYPE};
          @madeOptional(Versions.v2)
          ${EMAIL_PROPERTY}?: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.madeOptional(EMAIL_PROPERTY)],
      },
    });
  });
});

// #########################################################
// # Type Changed
// #########################################################

describe("Props - Log @typeChangedFrom()", () => {
  it.skip("should log when a property type is changed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
        }

        model ${USER_MODEL} {
          id: string;
          @typeChangedFrom(Versions.v2, ${STRING_TYPE})
          ${NAME_PROPERTY}: ${NUMBER_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.typeChangedFrom(NAME_PROPERTY, STRING_TYPE, NUMBER_TYPE),
        ],
      },
    });
  });

  it.skip("should log multiple type changes to the same property", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        model ${USER_MODEL} {
          id: string;
          @typeChangedFrom(Versions.v2, ${STRING_TYPE})
          @typeChangedFrom(Versions.v3, ${NUMBER_TYPE})
          ${NAME_PROPERTY}: ${BOOLEAN_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.typeChangedFrom(NAME_PROPERTY, STRING_TYPE, NUMBER_TYPE),
        ],
        [V3_VERSION]: [
          Log.typeChangedFrom(NAME_PROPERTY, NUMBER_TYPE, BOOLEAN_TYPE),
        ],
      },
    });
  });
});

// #########################################################
// # Name Changed
// #########################################################

describe("Props - Log @renamedFrom()", () => {
  it("should log when a property name is changed", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        model ${USER_MODEL} {
          id: string;
          @renamedFrom(Versions.v2, "fullName")
          ${NAME_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.renamedFrom(MODEL_PROPERTY_TYPE, "fullName", NAME_PROPERTY),
        ],
      },
    });
  });

  it("should log multiple name changes to the same property", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        model ${USER_MODEL} {
          id: string;
          @renamedFrom(Versions.v2, "fullName")
          @renamedFrom(Versions.v3, "firstName")
          ${NAME_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [
          Log.renamedFrom(MODEL_PROPERTY_TYPE, "fullName", "firstName"),
        ],
        [V3_VERSION]: [
          Log.renamedFrom(MODEL_PROPERTY_TYPE, "firstName", NAME_PROPERTY),
        ],
      },
    });
  });

  it("Should use the original name when a renamed property is first added", async () => {
    const code = `
      @versioned(Versions)
      namespace Service {
        enum Versions {
          v1,
          v2,
          v3,
        }

        model ${USER_MODEL} {
          id: string;
          @added(Versions.v2)
          @renamedFrom(Versions.v3, "fullName")
          ${NAME_PROPERTY}: ${STRING_TYPE};
        }
      }
    `;

    await emitAndValidate(code, {
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.added(MODEL_PROPERTY_TYPE, "fullName")],
        [V3_VERSION]: [
          Log.renamedFrom(MODEL_PROPERTY_TYPE, "fullName", NAME_PROPERTY),
        ],
      },
    });
  });
});
