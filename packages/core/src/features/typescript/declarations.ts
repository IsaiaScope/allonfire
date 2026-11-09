import { dirname } from "node:path";
import ts from "typescript";

/** Turns emit on, declarations only, written beside each source file. */
const DECLARATIONS_ONLY: ts.CompilerOptions = {
  declaration: true,
  emitDeclarationOnly: true,
  noEmit: false,
};

const failure = (diagnostics: readonly ts.Diagnostic[]) =>
  new Error(
    ts.formatDiagnostics(diagnostics, {
      getCanonicalFileName: (name) => name,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    })
  );

/**
 * Writes the `.d.ts` of each file `project` (a tsconfig) names, beside it,
 * under that tsconfig's rules, and returns their paths. The files those import
 * get none: `tsc --declaration` would write one for every file in the program,
 * and an importer would then read a declaration of a file it should check as
 * source. Throws on a tsconfig error or a declaration TypeScript cannot write.
 */
export const writeDeclarations = (project: string): string[] => {
  const { config, error } = ts.readConfigFile(project, ts.sys.readFile);
  if (error) {
    throw failure([error]);
  }
  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(project),
    DECLARATIONS_ONLY,
    project
  );
  if (parsed.errors.length > 0) {
    throw failure(parsed.errors);
  }
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const written: string[] = [];
  for (const fileName of parsed.fileNames) {
    const { diagnostics } = program.emit(
      program.getSourceFile(fileName),
      (path, text) => {
        ts.sys.writeFile(path, text);
        written.push(path);
      },
      undefined,
      true
    );
    if (diagnostics.length > 0) {
      throw failure(diagnostics);
    }
  }
  return written;
};
