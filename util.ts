import path = require("path");

let UPPER_CASES_REGEXP = /[A-Z]/;

export function isRelativePath(p: string): boolean {
  return p.startsWith("../") || p.startsWith("./");
}

// Given a resolved relative path, return the relative path compliant with
// Nodejs module resolution, i.e., must start with `./` or `../`.
export function normalizeRelativePathForNode(relativePath: string): string {
  if (isRelativePath(relativePath)) {
    return relativePath;
  } else {
    return "./" + relativePath;
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

// Add prefix and suffix to each statement.
export function joinArray(statements: Array<string>, prefix: string, suffix: string): string {
  return statements.map((s) => `${prefix}${s}${suffix}`).join("");
}

export function toUnixPath(originalPath?: string): string {
  if (!originalPath) {
    return undefined;
  } 
  return originalPath.split(path.sep).join(path.posix.sep);
}
