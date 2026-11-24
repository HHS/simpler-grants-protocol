import { readdirSync, readFileSync } from "fs";
import * as path from "path";
import { parse, SyntaxKind } from "@typespec/compiler/ast";
import type { TypeSpecScriptNode } from "@typespec/compiler/ast";
import ts from "typescript";
import { Paths } from "./paths";

/**
 * Finds a named declaration in the protocol's TypeSpec source or in the SDKs'
 * Python and TypeScript source, so a docs page can show the code for a schema
 * by naming it rather than by typing a file path and a range of lines.
 */

/** A declaration found in a source file. */
export interface Declaration {
  /** The declared name */
  name: string;
  /** First line of the declaration, 1-based */
  startLine: number;
  /** Last line of the declaration, 1-based and inclusive */
  endLine: number;
  /** The declaration's source lines, as they appear in the file */
  code: string;
  /** The TypeSpec namespace the declaration sits in, if any */
  namespace?: string;
}

/** A declaration and the file it was found in. */
export interface FoundDeclaration extends Declaration {
  /** Path to the file, relative to the repository root */
  path: string;
}

/** The source languages a docs page can show a declaration in. */
export type SourceLanguage = "typeSpec" | "python" | "typescript";

/** Where each language's source lives, and how to list its declarations. */
const SOURCES: Record<
  SourceLanguage,
  {
    label: string;
    dir: string;
    extension: string;
    list: (source: string) => Declaration[];
  }
> = {
  typeSpec: {
    label: "TypeSpec",
    dir: Paths.TYPESPEC_SOURCE_DIR,
    extension: ".tsp",
    list: listTypeSpecDeclarations,
  },
  python: {
    label: "Python",
    dir: Paths.PYTHON_SDK_SCHEMAS_DIR,
    extension: ".py",
    list: listPythonDeclarations,
  },
  typescript: {
    label: "TypeScript",
    dir: Paths.TS_SDK_SCHEMAS_DIR,
    extension: ".ts",
    list: listTypeScriptDeclarations,
  },
};

// ############################################################################
// Finding a declaration by name
// ############################################################################

const indexes = new Map<SourceLanguage, Map<string, FoundDeclaration[]>>();

/**
 * Makes the next lookup re-read the sources. The dev server clears the
 * indexes once per page render through `refreshSchemaSourcesForRender`.
 */
export function clearDeclarationIndexes(): void {
  indexes.clear();
}

/**
 * TypeSpec namespaces whose declarations a bare name never refers to.
 * `CommonGrants.Patch` holds compile-time mirrors of the organization models
 * that `OrgPatchData` is built from; they keep the names of the models they
 * mirror, so `OrgIds` on its own means the model in `CommonGrants.Models`. A
 * qualified name such as `Patch.OrgIds` still reaches a mirror.
 */
const TYPESPEC_MIRROR_NAMESPACES = new Set(["CommonGrants.Patch"]);

/**
 * Finds the one declaration with this name in a language's source.
 *
 * A TypeSpec name may be qualified with the end of its namespace
 * (`Patch.OrgIds`, `CommonGrants.Models.OrgIds`).
 *
 * @throws if no file declares the name, or more than one declaration has it
 */
export function findDeclaration(
  language: SourceLanguage,
  name: string,
): FoundDeclaration {
  const { label, dir } = SOURCES[language];
  const matches = matchDeclarations(language, name);

  if (matches.length === 0) {
    throw new Error(
      `No ${label} declaration named "${name}" under ${path.relative(Paths.REPO_ROOT, dir)}`,
    );
  }
  if (matches.length > 1) {
    const places = matches.map((m) => `${m.path}:${m.startLine}`).join(", ");
    throw new Error(
      `More than one ${label} declaration named "${name}": ${places}. Name the one to show explicitly.`,
    );
  }
  return matches[0];
}

/** The declarations a name refers to, before checking there's exactly one. */
function matchDeclarations(
  language: SourceLanguage,
  name: string,
): FoundDeclaration[] {
  const parts = name.split(".");
  const bareName = parts.pop()!;
  const candidates = getIndex(language).get(bareName) ?? [];

  if (parts.length > 0) {
    const qualifier = parts.join(".");
    return candidates.filter(
      (d) =>
        d.namespace === qualifier ||
        (d.namespace ?? "").endsWith(`.${qualifier}`),
    );
  }
  return candidates.filter(
    (d) => !TYPESPEC_MIRROR_NAMESPACES.has(d.namespace ?? ""),
  );
}

/**
 * The name a language's source declares a schema under, by convention:
 * TypeSpec and Python use the schema's own name, and the TypeScript SDK names
 * its Zod schemas `<Name>Schema`. A page names the declaration explicitly
 * when an SDK doesn't follow this (its enums, for example, end in `Enum`).
 */
function conventionalName(
  language: SourceLanguage,
  schemaName: string,
): string {
  return language === "typescript" ? `${schemaName}Schema` : schemaName;
}

/**
 * Finds the declaration for a schema under its conventional name.
 *
 * @throws if nothing or more than one thing has that name
 */
export function findSchemaDeclaration(
  language: SourceLanguage,
  schemaName: string,
): FoundDeclaration {
  return findDeclaration(language, conventionalName(language, schemaName));
}

/**
 * Finds the code a source tab shows. The page either just asks for the tab
 * (`true`), which looks up the schema's conventional name; gives the
 * declaration's name, for an SDK that names it differently; or lists several
 * names, to show a template with the model built from it. Several
 * declarations must be in one file; each is shown whole, in the order listed,
 * separated by as many blank lines as the source has above each later one
 * (two between Python classes, one in TypeSpec).
 *
 * @throws if a declaration can't be found
 */
export function findSnippet(
  language: SourceLanguage,
  requested: true | string | string[],
  schemaName?: string,
): FoundDeclaration {
  if (Array.isArray(requested)) {
    const found = requested.map((name) => findDeclaration(language, name));
    const files = new Set(found.map((d) => d.path));
    if (found.length === 0 || files.size !== 1) {
      throw new Error(
        `Declarations shown together must be in one file: ${requested.join(", ")} are in ${[...files].join(", ") || "no file"}`,
      );
    }
    return {
      name: requested.join(", "),
      path: found[0].path,
      startLine: Math.min(...found.map((d) => d.startLine)),
      endLine: Math.max(...found.map((d) => d.endLine)),
      code: joinAsInSource(found),
    };
  }
  if (typeof requested === "string") {
    return findDeclaration(language, requested);
  }
  if (!schemaName) {
    throw new Error(
      `The ${SOURCES[language].label} tab needs a declaration name, or a schema name to look it up by`,
    );
  }
  return findSchemaDeclaration(language, schemaName);
}

/** Joins declarations from one file with the blank lines above each in the source. */
function joinAsInSource(found: FoundDeclaration[]): string {
  const lines = readFileSync(
    path.join(Paths.REPO_ROOT, found[0].path),
    "utf-8",
  ).split("\n");
  return found
    .map((declaration, i) => {
      if (i === 0) return declaration.code;
      let blanks = 0;
      for (let line = declaration.startLine - 2; line >= 0; line--) {
        if (lines[line].trim() !== "") break;
        blanks++;
      }
      return "\n".repeat(Math.max(blanks, 1)) + declaration.code;
    })
    .join("\n");
}

/**
 * Links to a declaration's lines in the repository on GitHub. Keeps the
 * double slash the docs have always published.
 */
export function sourceUrl(
  declaration: Pick<FoundDeclaration, "path" | "startLine" | "endLine">,
): string {
  const { path: filePath, startLine, endLine } = declaration;
  const lines =
    endLine > startLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`;
  return `https://github.com/HHS/simpler-grants-protocol/tree/main//${filePath}${lines}`;
}

/** Lists every declaration in a language's source, by name, until the next refresh. */
function getIndex(language: SourceLanguage): Map<string, FoundDeclaration[]> {
  const cached = indexes.get(language);
  if (cached) return cached;

  const { dir, extension, list } = SOURCES[language];
  const index = new Map<string, FoundDeclaration[]>();

  for (const file of listFilesByExtension(dir, extension)) {
    const relativePath = path
      .relative(Paths.REPO_ROOT, file)
      .split(path.sep)
      .join("/");
    let declarations: Declaration[];
    try {
      declarations = list(readFileSync(file, "utf-8"));
    } catch (error) {
      throw new Error(`Could not read declarations from ${relativePath}`, {
        cause: error,
      });
    }
    for (const declaration of declarations) {
      const entries = index.get(declaration.name) ?? [];
      entries.push({ ...declaration, path: relativePath });
      index.set(declaration.name, entries);
    }
  }

  indexes.set(language, index);
  return index;
}

/**
 * Lists the files with an extension under a directory, recursively, sorted by
 * path in code-point order so the result is the same on every machine.
 */
export function listFilesByExtension(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

// ############################################################################
// Shared helpers
// ############################################################################

/** Builds a declaration from whole lines of the source. */
function fromLines(
  lines: string[],
  name: string,
  startLine: number,
  endLine: number,
): Declaration {
  return {
    name,
    startLine,
    endLine,
    code: lines.slice(startLine - 1, endLine).join("\n"),
  };
}

// ############################################################################
// TypeSpec
// ############################################################################

/** A statement in a TypeSpec source or namespace block */
type Statement = TypeSpecScriptNode["statements"][number];

const TYPESPEC_DECLARATION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.ModelStatement,
  SyntaxKind.EnumStatement,
  SyntaxKind.UnionStatement,
  SyntaxKind.ScalarStatement,
  SyntaxKind.AliasStatement,
  SyntaxKind.InterfaceStatement,
  SyntaxKind.OperationStatement,
]);

/**
 * Lists the named type declarations in a TypeSpec source, each with the doc
 * comment and decorators above it, including those inside namespace blocks.
 * Uses the TypeSpec compiler's own parser, so nested braces, one-line
 * declarations and multi-line decorators need no special handling.
 *
 * @throws if the source doesn't parse
 */
export function listTypeSpecDeclarations(source: string): Declaration[] {
  const ast = parse(source, { docs: true });
  if (ast.parseDiagnostics.length > 0) {
    const messages = ast.parseDiagnostics.map((d) => d.message).join("; ");
    throw new Error(`TypeSpec source doesn't parse: ${messages}`);
  }

  const lineOf = (offset: number) =>
    ast.file.getLineAndCharacterOfPosition(offset).line + 1;
  const lines = source.split("\n");
  const declarations: Declaration[] = [];

  const visit = (statements: readonly Statement[], namespace: string[]) => {
    // A file-level `namespace X;` applies to the statements after it.
    let current = namespace;
    for (const statement of statements) {
      if (statement.kind === SyntaxKind.NamespaceStatement) {
        // `namespace A.B { }` parses as A holding B; walk down to the
        // innermost one, collecting the name as we go.
        const names = [...namespace];
        let node: Statement | undefined = statement;
        let body: unknown;
        while (node?.kind === SyntaxKind.NamespaceStatement) {
          names.push(node.id.sv);
          body = node.statements;
          node = Array.isArray(body) ? undefined : (body as Statement);
        }
        if (Array.isArray(body)) {
          visit(body as Statement[], names);
        } else {
          current = names;
        }
        continue;
      }
      if (!TYPESPEC_DECLARATION_KINDS.has(statement.kind)) continue;

      // The node starts at its doc comment; its decorators sit between.
      const name = (statement as { id: { sv: string } }).id.sv;
      declarations.push({
        ...fromLines(
          lines,
          name,
          lineOf(statement.pos),
          lineOf(statement.end - 1),
        ),
        namespace: current.join(".") || undefined,
      });
    }
  };
  visit(ast.statements, []);

  return declarations;
}

// ############################################################################
// TypeScript
// ############################################################################

/**
 * Lists the top-level declarations in a TypeScript source. Each one starts at
 * the JSDoc comment attached to it, if it has one, or else at its declaration
 * keyword, and runs to the end of its statement. Line comments and section
 * banners above a declaration are left out, and of several JSDoc comments
 * above it only the last, attached one is included.
 */
export function listTypeScriptDeclarations(source: string): Declaration[] {
  const file = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const lines = source.split("\n");
  const declarations: Declaration[] = [];

  const add = (name: string, statement: ts.Statement) => {
    const startLine =
      file.getLineAndCharacterOfPosition(declarationStart(statement)).line + 1;
    const endLine = file.getLineAndCharacterOfPosition(statement.end).line + 1;
    declarations.push(fromLines(lines, name, startLine, endLine));
  };

  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          add(declaration.name.text, statement);
        }
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      add(statement.name.text, statement);
    }
  }

  return declarations;

  /**
   * Where a statement starts, counting the JSDoc comment the compiler
   * attaches to it. Only the last JSDoc comment counts, and only when nothing
   * but whitespace separates it from the statement's keyword.
   */
  function declarationStart(statement: ts.Statement): number {
    const keyword = statement.getStart(file);
    const jsDoc = ts.getJSDocCommentsAndTags(statement).filter(ts.isJSDoc).at(-1);
    if (jsDoc && source.slice(jsDoc.end, keyword).trim() === "") {
      return jsDoc.getStart(file);
    }
    return keyword;
  }
}

// ############################################################################
// Python
// ############################################################################

const PYTHON_DEFINITION = /^(?:async\s+)?(?:class|def)\s+([A-Za-z_]\w*)/;
const PYTHON_ASSIGNMENT = /^([A-Za-z_]\w*)\s*(?::[^=]+)?=(?!=)/;

/** One line of Python, after tracking the strings and brackets around it. */
interface PythonLine {
  text: string;
  /** Whether the line opens inside a bracket or a multi-line string */
  continues: boolean;
}

/**
 * Marks which lines of a Python source continue an earlier line, because they
 * open inside brackets or a triple-quoted string. Those lines can't start a
 * statement, whatever their indentation.
 */
function scanPythonLines(source: string): PythonLine[] {
  const result: PythonLine[] = [];
  let depth = 0;
  let quote: string | null = null; // the open string's delimiter

  for (const text of source.split("\n")) {
    result.push({ text, continues: depth > 0 || quote !== null });

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quote) {
        if (char === "\\") {
          i++;
        } else if (text.startsWith(quote, i)) {
          i += quote.length - 1;
          quote = null;
        }
        continue;
      }
      if (char === "#") break;
      if (char === '"' || char === "'") {
        const triple = char.repeat(3);
        quote = text.startsWith(triple, i) ? triple : char;
        i += quote.length - 1;
      } else if ("([{".includes(char)) {
        depth++;
      } else if (")]}".includes(char)) {
        depth = Math.max(0, depth - 1);
      }
    }
    // A single-quoted string can't run past the end of its line.
    if (quote && quote.length === 1) quote = null;
  }

  return result;
}

/**
 * Lists the module-level classes, functions and assignments in a Python
 * source. Each one starts at its first decorator, or at its own line, and
 * runs to the last non-blank line of its body. A comment at column 0 inside
 * the body, such as a commented-out field, doesn't end it; one followed only
 * by blank lines, comments and the next module-level statement does, and is
 * left out.
 */
export function listPythonDeclarations(source: string): Declaration[] {
  const lines = scanPythonLines(source);
  const rawLines = lines.map((l) => l.text);
  const declarations: Declaration[] = [];

  /** A line that begins a new module-level statement */
  const startsStatement = (line: PythonLine) =>
    !line.continues && /^[^\s#]/.test(line.text);
  /** A line holding only a comment, at any indentation */
  const isComment = (line: PythonLine) =>
    !line.continues && /^\s*#/.test(line.text);
  const isBlankOrComment = (line: PythonLine) =>
    isComment(line) || (!line.continues && line.text.trim() === "");

  let i = 0;
  while (i < lines.length) {
    if (!startsStatement(lines[i])) {
      i++;
      continue;
    }

    // Decorators belong to the definition below them.
    const start = i;
    while (i < lines.length && /^@/.test(lines[i].text)) {
      i++;
      while (i < lines.length && lines[i].continues) i++;
    }
    const header = lines[i]?.text ?? "";

    // The statement runs until the next line that starts a statement, or a
    // comment at column 0 that comes before one (a section banner). A
    // column-0 comment with more of the body after it is part of the body.
    let end = i;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (startsStatement(line)) break;
      if (isComment(line) && /^#/.test(line.text)) {
        const next = lines.slice(j + 1).find((l) => !isBlankOrComment(l));
        if (!next || startsStatement(next)) break;
      }
      if (line.text.trim() !== "") end = j;
    }

    const name =
      header.match(PYTHON_DEFINITION)?.[1] ??
      (start === i ? header.match(PYTHON_ASSIGNMENT)?.[1] : undefined);
    if (name) {
      declarations.push(fromLines(rawLines, name, start + 1, end + 1));
    }
    i = end + 1;
  }

  return declarations;
}
