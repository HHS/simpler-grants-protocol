import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import * as path from "path";
import {
  listTypeSpecDeclarations,
  listPythonDeclarations,
  listTypeScriptDeclarations,
  findDeclaration,
  findSchemaDeclaration,
  findSnippet,
  refreshDeclarationsForRender,
  sourceUrl,
  type Declaration,
} from "@/lib/schema/source-declarations";
import { Paths } from "@/lib/schema/paths";

const REPO_ROOT = Paths.REPO_ROOT;

/** Picks one declaration out of a listing by name. */
function pick(declarations: Declaration[], name: string): Declaration {
  const matches = declarations.filter((d) => d.name === name);
  expect(matches, `exactly one declaration named ${name}`).toHaveLength(1);
  return matches[0];
}

// ############################################################################
// TypeSpec
// ############################################################################

describe("listTypeSpecDeclarations", () => {
  it("includes the doc comment and decorators above a model", () => {
    const source = [
      "namespace CommonGrants.Fields;",
      "",
      "// A section banner that belongs to no declaration",
      "/** A monetary amount */",
      '@example(Examples.Money.usd, #{ title: "US dollars" })',
      "@example(",
      "  Examples.Money.euro,",
      '  #{ title: "Euros" }',
      ")",
      "@Versioning.added(CommonGrants.Versions.v0_1)",
      "model Money {",
      "  /** The amount */",
      "  amount: decimalString;",
      "}",
      "",
    ].join("\n");

    const money = pick(listTypeSpecDeclarations(source), "Money");
    expect(money.startLine).toBe(4);
    expect(money.endLine).toBe(14);
    expect(money.code.split("\n")[0]).toBe("/** A monetary amount */");
    expect(money.code.endsWith("}")).toBe(true);
  });

  it("finds the whole of a model with nested braces", () => {
    const source = [
      "model OrgRelationshipT<Kind> {",
      "  kind?: {",
      "    ...Fields.ExtensibleEnumT<Kind>;",
      "  };",
      "",
      "  allIds?: Array<{",
      "    id: string;",
      "  }>;",
      "}",
      "",
      "model After {}",
    ].join("\n");

    const declaration = pick(
      listTypeSpecDeclarations(source),
      "OrgRelationshipT",
    );
    expect(declaration.startLine).toBe(1);
    expect(declaration.endLine).toBe(9);
  });

  it("finds one-line declarations, scalars and aliases", () => {
    const source = [
      "/** An email address */",
      '@format("email")',
      "scalar email extends string;",
      "",
      "/** An email address. */",
      "alias Email = Types.email; // Exposes Email from CommonGrants.Fields",
      "",
      "/** The status */",
      "model AwdStatus is Fields.ExtensibleEnumT<AwdStatusOptions>;",
    ].join("\n");

    const declarations = listTypeSpecDeclarations(source);
    expect(pick(declarations, "email")).toMatchObject({
      startLine: 1,
      endLine: 3,
    });
    // The trailing comment on the declaration's last line is kept.
    expect(pick(declarations, "Email").code).toBe(
      [
        "/** An email address. */",
        "alias Email = Types.email; // Exposes Email from CommonGrants.Fields",
      ].join("\n"),
    );
    expect(pick(declarations, "AwdStatus")).toMatchObject({
      startLine: 8,
      endLine: 9,
    });
  });

  it("finds declarations inside a namespace block, keeping their indentation", () => {
    const source = [
      "namespace CommonGrants.Patch {",
      "  model OrgProfileWritable {}",
      "}",
      "",
      "namespace CommonGrants.Models {",
      "  /** A merge patch. */",
      "  @Versioning.added(CommonGrants.Versions.v0_4)",
      "  model OrgPatchData is TypeSpec.Http.MergePatchUpdate<",
      "    CommonGrants.Patch.OrgProfileWritable,",
      '    "OrgPatch{name}"',
      "  >;",
      "",
      "  /** Examples of the OrgPatchData model */",
      "  namespace Examples.OrgPatchData {",
      '    const patch = #{ name: "x" };',
      "  }",
      "}",
    ].join("\n");

    const declarations = listTypeSpecDeclarations(source);
    const patch = pick(declarations, "OrgPatchData");
    expect(patch.startLine).toBe(6);
    expect(patch.endLine).toBe(11);
    expect(patch.code.split("\n")[0]).toBe("  /** A merge patch. */");
    // Namespaces and consts are not declarations a page can name.
    expect(declarations.map((d) => d.name)).not.toContain("patch");
    expect(declarations.map((d) => d.name)).toEqual([
      "OrgProfileWritable",
      "OrgPatchData",
    ]);
    // Each declaration records the namespace it's declared in.
    expect(pick(declarations, "OrgProfileWritable").namespace).toBe(
      "CommonGrants.Patch",
    );
    expect(patch.namespace).toBe("CommonGrants.Models");
  });

  it("records the namespace a file-level namespace statement sets", () => {
    const source = [
      "namespace CommonGrants.Fields;",
      "",
      "model Money {}",
    ].join("\n");
    expect(pick(listTypeSpecDeclarations(source), "Money").namespace).toBe(
      "CommonGrants.Fields",
    );
  });

  it("keeps names that are prefixes of other names apart", () => {
    const source = [
      "model OppStatus is ExtensibleEnumT<OppStatusOptions>;",
      "",
      "enum OppStatusOptions {",
      "  open,",
      "}",
    ].join("\n");

    const declarations = listTypeSpecDeclarations(source);
    expect(pick(declarations, "OppStatus").endLine).toBe(1);
    expect(pick(declarations, "OppStatusOptions")).toMatchObject({
      startLine: 3,
      endLine: 5,
    });
  });

  it("throws on a source that doesn't parse", () => {
    expect(() => listTypeSpecDeclarations("model Broken {")).toThrow();
  });
});

// ############################################################################
// Python
// ############################################################################

describe("listPythonDeclarations", () => {
  it("covers a class through its last body line, not the next section's comments", () => {
    const source = [
      '"""Module docstring."""',
      "",
      "# ###############",
      "# Event Types",
      "# ###############",
      "",
      "",
      "class EventType(StrEnum):",
      '    """Type of event."""',
      "",
      '    SINGLE_DATE = "singleDate"',
      '    OTHER = "other"',
      "",
      "",
      "# ###############",
      "# Event Base",
      "# ###############",
      "",
      "",
      "class EventBase(SealedModel):",
      "    name: str",
    ].join("\n");

    const declarations = listPythonDeclarations(source);
    expect(pick(declarations, "EventType")).toMatchObject({
      startLine: 8,
      endLine: 12,
    });
    expect(pick(declarations, "EventBase")).toMatchObject({
      startLine: 20,
      endLine: 21,
    });
  });

  it("keeps a class body whose strings and brackets reach column 0", () => {
    const source = [
      "class Filtered(Paginated[ItemsT], Generic[ItemsT, FilterT]):",
      '    """A filtered list.',
      "",
      "Continued at column 0 inside the docstring.",
      '    """',
      "",
      "    filter_info: FilterInfo[FilterT] = Field(",
      "        ...,",
      '        alias="filterInfo",',
      ")",
      "    # A trailing comment inside the body",
      "",
      "",
      "class Next:",
      "    pass",
    ].join("\n");

    expect(pick(listPythonDeclarations(source), "Filtered")).toMatchObject({
      startLine: 1,
      endLine: 11,
    });
  });

  it("includes decorators and multi-line class headers", () => {
    const source = [
      "@dataclass(",
      "    frozen=True,",
      ")",
      "@other",
      "class Point(",
      "    Base,",
      "):",
      "    x: int",
      "",
      "def helper() -> None:",
      "    return None",
    ].join("\n");

    const declarations = listPythonDeclarations(source);
    expect(pick(declarations, "Point")).toMatchObject({
      startLine: 1,
      endLine: 8,
    });
    expect(pick(declarations, "helper")).toMatchObject({
      startLine: 10,
      endLine: 11,
    });
  });

  it("finds one-line and multi-line assignments", () => {
    const source = [
      "Event = Union[SingleDateEvent, DateRangeEvent, OtherEvent]",
      'T = TypeVar("T")',
      "UTCDateTime = Annotated[",
      "    datetime,",
      "    AfterValidator(_utc),",
      "]",
      'Duns: TypeAlias = Annotated[str, StringConstraints(pattern=r"^[0-9]{9}$")]',
      "if TYPE_CHECKING:",
      "    from x import Y",
    ].join("\n");

    const declarations = listPythonDeclarations(source);
    expect(pick(declarations, "Event")).toMatchObject({
      startLine: 1,
      endLine: 1,
    });
    expect(pick(declarations, "UTCDateTime")).toMatchObject({
      startLine: 3,
      endLine: 6,
    });
    expect(pick(declarations, "Duns").startLine).toBe(7);
    expect(declarations.map((d) => d.name)).toEqual([
      "Event",
      "T",
      "UTCDateTime",
      "Duns",
    ]);
  });

  it("keeps names that are prefixes of other names apart", () => {
    const source = [
      "class OppStatus(Base):",
      "    value: str",
      "",
      "",
      "class OppStatusOptions(StrEnum):",
      '    OPEN = "open"',
    ].join("\n");

    const declarations = listPythonDeclarations(source);
    expect(pick(declarations, "OppStatus").endLine).toBe(2);
    expect(pick(declarations, "OppStatusOptions").startLine).toBe(5);
  });
});

// ############################################################################
// TypeScript
// ############################################################################

describe("listTypeScriptDeclarations", () => {
  it("covers a whole statement, starting at the declaration rather than its comment", () => {
    const source = [
      'import { z } from "zod";',
      "",
      "/** Query parameters for paginated routes */",
      "export const PaginatedQueryParamsSchema = z.object({",
      "  /** The page */",
      "  page: z.number().int().min(1).default(1),",
      "});",
      "",
      "// Base event schema (common fields)",
      "const EventBaseSchema = z.object({",
      "  name: z.string(),",
      "});",
    ].join("\n");

    const declarations = listTypeScriptDeclarations(source);
    expect(pick(declarations, "PaginatedQueryParamsSchema")).toMatchObject({
      startLine: 4,
      endLine: 7,
    });
    // Unexported declarations count too.
    expect(pick(declarations, "EventBaseSchema")).toMatchObject({
      startLine: 10,
      endLine: 12,
    });
  });

  it("finds one-line declarations and keeps prefix names apart", () => {
    const source = [
      'export const SortOrderEnum = z.enum(["asc", "desc"]);',
      'export const SortOrderEnumExtra = z.enum(["x"]);',
    ].join("\n");

    const declarations = listTypeScriptDeclarations(source);
    expect(pick(declarations, "SortOrderEnum")).toMatchObject({
      startLine: 1,
      endLine: 1,
      code: 'export const SortOrderEnum = z.enum(["asc", "desc"]);',
    });
  });

  it("finds generic functions, types, interfaces and chained calls", () => {
    const source = [
      "export const PaginatedSchema = <T extends z.ZodType>(itemsSchema: T) =>",
      "  SuccessSchema.extend({",
      "    items: z.array(itemsSchema),",
      "  });",
      "",
      "export type Money = z.infer<typeof MoneySchema>;",
      "",
      "export interface Plugin {",
      "  name: string;",
      "}",
      "",
      "export const MoneySchema = z",
      "  .object({",
      "    amount: DecimalStringSchema,",
      "  })",
      "  .strict();",
    ].join("\n");

    const declarations = listTypeScriptDeclarations(source);
    expect(pick(declarations, "PaginatedSchema")).toMatchObject({
      startLine: 1,
      endLine: 4,
    });
    expect(pick(declarations, "Money").startLine).toBe(6);
    expect(pick(declarations, "Plugin")).toMatchObject({
      startLine: 8,
      endLine: 10,
    });
    expect(pick(declarations, "MoneySchema")).toMatchObject({
      startLine: 12,
      endLine: 16,
    });
  });
});

// ############################################################################
// Finding a declaration across the sources
// ############################################################################

describe("findDeclaration", () => {
  it("finds a TypeSpec declaration in the protocol sources and names its file", () => {
    const found = findDeclaration("typeSpec", "OrgPatchData");
    expect(found.path).toBe("lib/core/lib/core/models/organization-sync.tsp");
    expect(found.code).toMatch(/model OrgPatchData is/);
    expect(found.code.split("\n")[0]).toMatch(/^\s*\/\*\*/);
  });

  it("finds Python and TypeScript declarations in the SDK sources", () => {
    expect(findDeclaration("python", "OppStatusOptions").path).toMatch(
      /^lib\/python-sdk\/common_grants_sdk\/schemas\/pydantic\/.+\.py$/,
    );
    expect(findDeclaration("typescript", "MoneySchema").path).toMatch(
      /^lib\/ts-sdk\/src\/schemas\/zod\/.+\.ts$/,
    );
  });

  it("fails when no declaration has the name", () => {
    expect(() => findDeclaration("typeSpec", "NoSuchSchema")).toThrow(
      /No TypeSpec declaration named "NoSuchSchema"/,
    );
    expect(() => findDeclaration("python", "NoSuchSchema")).toThrow(
      /No Python declaration named "NoSuchSchema"/,
    );
    expect(() => findDeclaration("typescript", "NoSuchSchema")).toThrow(
      /No TypeScript declaration named "NoSuchSchema"/,
    );
  });

  it("skips the merge-patch mirrors, which reuse the names of the models they mirror", () => {
    // CommonGrants.Patch redeclares OrgIds and others as compile-time sources
    // for OrgPatchData; the page for OrgIds means the model in Models.
    expect(findDeclaration("typeSpec", "OrgIds").path).toBe(
      "lib/core/lib/core/models/organization.tsp",
    );
    // A qualified name still reaches a mirror.
    expect(findDeclaration("typeSpec", "Patch.OrgIds").path).toBe(
      "lib/core/lib/core/models/organization-sync.tsp",
    );
    expect(findDeclaration("typeSpec", "CommonGrants.Models.OrgIds").path).toBe(
      "lib/core/lib/core/models/organization.tsp",
    );
  });

  it("fails when more than one file declares the name", () => {
    // `V` is a TypeVar declared separately in several SDK modules.
    expect(() => findDeclaration("python", "V")).toThrow(
      /More than one Python declaration named "V"/,
    );
  });
});

describe("findSchemaDeclaration", () => {
  it("finds TypeSpec and Python declarations by the schema's own name", () => {
    expect(findSchemaDeclaration("typeSpec", "AwdIdFain").code).toMatch(
      /model AwdIdFain is/,
    );
    expect(findSchemaDeclaration("python", "OppStatusOptions").code).toMatch(
      /^class OppStatusOptions\(/,
    );
  });

  it("finds a TypeScript schema named <Name>Schema", () => {
    expect(findSchemaDeclaration("typescript", "Money").name).toBe(
      "MoneySchema",
    );
  });

  it("fails when the SDK declares the schema under another name", () => {
    // The TypeScript SDK names enums <Name>Enum.
    expect(() => findSchemaDeclaration("typescript", "SortOrder")).toThrow(
      /No TypeScript declaration named "SortOrderSchema"/,
    );
    // The Python SDK names its operator enums in the singular.
    expect(() =>
      findSchemaDeclaration("python", "EquivalenceOperators"),
    ).toThrow(/No Python declaration named "EquivalenceOperators"/);
  });
});

describe("findSnippet", () => {
  it("looks up the schema's conventional name when the page just asks for the tab", () => {
    expect(findSnippet("typescript", true, "Money").name).toBe("MoneySchema");
  });

  it("looks up the name the page gives instead", () => {
    expect(findSnippet("typescript", "SortOrderEnum", "SortOrder").name).toBe(
      "SortOrderEnum",
    );
    expect(findSnippet("typeSpec", "ExtensibleEnumT").name).toBe(
      "ExtensibleEnumT",
    );
  });

  it("shows several declarations from one file together, each whole, linking across them", () => {
    const snippet = findSnippet("typeSpec", ["IdentifierT", "Identifier"]);
    const template = findDeclaration("typeSpec", "IdentifierT");
    const model = findDeclaration("typeSpec", "Identifier");
    expect(snippet.code).toBe(`${template.code}\n\n${model.code}`);
    expect(snippet.path).toBe(model.path);
    expect(snippet.startLine).toBe(template.startLine);
    expect(snippet.endLine).toBe(model.endLine);
  });

  it("separates declarations shown together by the blank lines the source has above the later one", () => {
    // Python classes sit two blank lines apart (PEP 8); FilterInfo is directly
    // above Filtered, so the tab is an exact excerpt of the source.
    const snippet = findSnippet("python", ["FilterInfo", "Filtered"]);
    const source = readFileSync(path.join(REPO_ROOT, snippet.path), "utf-8")
      .split("\n")
      .slice(snippet.startLine - 1, snippet.endLine)
      .join("\n");
    expect(snippet.code).toBe(source);
    expect(snippet.code).toMatch(/\n\n\nclass Filtered\(/);
  });

  it("uses the later declaration's own spacing when other code sits between them", () => {
    // PaginatedBodyParams sits between PaginatedBase and PaginatedQueryParams.
    const snippet = findSnippet("python", [
      "PaginatedBase",
      "PaginatedQueryParams",
    ]);
    const base = findDeclaration("python", "PaginatedBase");
    const params = findDeclaration("python", "PaginatedQueryParams");
    expect(snippet.code).toBe(`${base.code}\n\n\n${params.code}`);
    expect(snippet.code).not.toMatch(/PaginatedBodyParams/);
  });

  it("fails when declarations shown together are in different files", () => {
    expect(() => findSnippet("typeSpec", ["Money", "AwardBase"])).toThrow(
      /must be in one file/,
    );
  });

  it("fails when the page asks for the tab without naming a schema or a declaration", () => {
    expect(() => findSnippet("python", true)).toThrow(
      /Python tab needs a declaration name/,
    );
  });
});

describe("refreshDeclarationsForRender", () => {
  it("re-reads the sources once for each new render, and not again within it", () => {
    const first = findDeclaration("python", "Money");
    expect(findDeclaration("python", "Money")).toBe(first);

    const render = {};
    refreshDeclarationsForRender(render);
    const reread = findDeclaration("python", "Money");
    expect(reread).not.toBe(first);
    expect(reread).toEqual(first);

    // Further components on the same page reuse what that render read.
    refreshDeclarationsForRender(render);
    expect(findDeclaration("python", "Money")).toBe(reread);

    refreshDeclarationsForRender({});
    expect(findDeclaration("python", "Money")).not.toBe(reread);
  });
});

describe("sourceUrl", () => {
  it("links to the declaration's lines on GitHub", () => {
    expect(sourceUrl({ path: "lib/a.tsp", startLine: 3, endLine: 9 })).toBe(
      "https://github.com/HHS/simpler-grants-protocol/tree/main//lib/a.tsp#L3-L9",
    );
    expect(sourceUrl({ path: "lib/a.tsp", startLine: 3, endLine: 3 })).toBe(
      "https://github.com/HHS/simpler-grants-protocol/tree/main//lib/a.tsp#L3",
    );
  });
});
