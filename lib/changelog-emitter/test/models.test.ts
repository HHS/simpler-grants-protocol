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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
      [CAR_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, CAR_MODEL)],
      },
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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should log a single entry when a model is `is` a versioned template", async () => {
    // A model defined via `is` on a versioned template inherits the template's
    // @added in addition to its own, so the version can be reported twice. The
    // model is still added only once, so the log should collapse to one entry.
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      @added(Versions.v2)
      model Base<Id extends string = string> {
        id?: Id;
      }

      @added(Versions.v2)
      model ${USER_MODEL} is Base<string>;
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      [USER_MODEL]: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should log the model's own @added when it `is` a template added earlier", async () => {
    // The `is` copy carries the template's @added alongside the model's own,
    // and the two can name different versions. The model's own decorator says
    // when the model was added; the template's says when the template was, so
    // only the model's own version belongs in its log.
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      @added(Versions.v1)
      model Base<Id extends string = string> {
        id?: Id;
      }

      @added(Versions.v2)
      model ${USER_MODEL} is Base<string>;
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      [USER_MODEL]: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should fall back to the template's @added when the model has none of its own", async () => {
    // With no @added written on the model, the inherited one is all there is:
    // the model exists from the version the template does.
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      @added(Versions.v2)
      model Base<Id extends string = string> {
        id?: Id;
      }

      model ${USER_MODEL} is Base<string>;
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      [USER_MODEL]: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should take the source model's @added when the model has none of its own, through a chain of `is`", async () => {
    // Each `is` copies the whole decorator list, so a model at the end of a
    // chain carries every ancestor's @added. With none of its own, it exists
    // from whenever the model it `is` does, not from the oldest ancestor.
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      @added(Versions.v1)
      model Base<Id extends string = string> {
        id?: Id;
      }

      @added(Versions.v2)
      model Middle is Base<string>;

      model ${USER_MODEL} is Middle;
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      Middle: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, "Middle")],
      },
      [USER_MODEL]: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
    });
  });

  it("should tell an augment decorator on the model from one on its template", async () => {
    // `@@added` has no owning declaration node, so it is attributed by what it
    // targets: on the model it is the model's own, on the template it is
    // inherited like an inline decorator would be.
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
      }

      model Base<Id extends string = string> {
        id?: Id;
      }

      model ${USER_MODEL} is Base<string>;

      model ${CAR_MODEL} is Base<string>;

      @@added(Base, Versions.v1);
      @@added(${CAR_MODEL}, Versions.v2);
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
      [CAR_MODEL]: {
        [V2_VERSION]: [Log.added(MODEL_TYPE, CAR_MODEL)],
      },
    });
  });

  it("should log the model's own @removed over the one inherited from its template", async () => {
    const code = `
    @versioned(Versions)
    namespace Service {
      enum Versions {
        v1,
        v2,
        v3,
      }

      @added(Versions.v1)
      @removed(Versions.v3)
      model Base<Id extends string = string> {
        id?: Id;
      }

      @added(Versions.v1)
      @removed(Versions.v2)
      model ${USER_MODEL} is Base<string>;
    }
    `;

    await emitAndValidate(code, {
      Base: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Base")],
      },
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.removed(MODEL_TYPE, USER_MODEL)],
      },
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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
      },
      [CAR_MODEL]: {
        [V3_VERSION]: [Log.added(MODEL_TYPE, CAR_MODEL)],
      },
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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, USER_MODEL)],
        [V2_VERSION]: [Log.removed(MODEL_TYPE, USER_MODEL)],
      },
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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Person")],
        [V2_VERSION]: [Log.renamedFrom(MODEL_TYPE, "Person", USER_MODEL)],
      },
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
      [USER_MODEL]: {
        [V1_VERSION]: [Log.added(MODEL_TYPE, "Person")],
        [V2_VERSION]: [Log.renamedFrom(MODEL_TYPE, "Person", "AccountOwner")],
        [V3_VERSION]: [Log.renamedFrom(MODEL_TYPE, "AccountOwner", USER_MODEL)],
      },
    });
  });
});
