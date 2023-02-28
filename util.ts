import path = require('path');

let UPPER_CASES_REGEXP = /[A-Z]/;

export function generateComment(comment: string): string {
  if (comment) {
    return `\n/* ${comment} */`;
  } else {
    return "";
  }
}

export function toInitialUppercased(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function toInitalLowercased(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function toUppercaseSnaked(name: string): string {
  let upperCaseSnakedName = new Array<string>();
  upperCaseSnakedName.push(name.charAt(0));
  for (let i = 1; i < name.length; i++) {
    let char = name.charAt(i);
    if (UPPER_CASES_REGEXP.test(char)) {
      upperCaseSnakedName.push("_", char);
    } else {
      upperCaseSnakedName.push(char.toUpperCase());
    }
  }
  return upperCaseSnakedName.join("");
}

// Given a resolved relative path, return the relative path compliant with
// Nodejs module resolution, i.e., must start with `./` or `../`.
export function normalizeRelativePathForNode(relativePath: string): string {
  if (relativePath.startsWith("../") || relativePath.startsWith("./")) {
    return relativePath;
  } else {
    return "./" + relativePath;
  }
}

// Both paths are relative path, where `basePath` is relative to CWD and
// outputPath is relative to `basePath`. Return the relative path to import
// `basePath` from `outputPath`.
export function reverseImport(basePath: string, outputPath: string): string {
  let absoluteOutputPath = path.resolve(outputPath);
  return normalizeRelativePathForNode(
    path.relative(path.dirname(absoluteOutputPath), basePath)
  );
}

// Both imports are relative path, where `firstImport` is relative to some base
// module and `secondImport` is relative to `firstImport`. Return the relative
// path to import `secondImport` from the base module. When `secondImport` is
// `undefined`, it means to import `firstImport`.
export function transitImport(
  firstImport: string,
  secondImport: string | undefined
): string | undefined {
  let importPath: string;
  if (secondImport) {
    importPath = normalizeRelativePathForNode(
      path.join(path.dirname(firstImport), secondImport)
    );
  } else {
    importPath = firstImport;
  }
  return importPath;
}
