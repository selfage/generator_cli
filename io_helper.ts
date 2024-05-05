import fs = require("fs");
import path = require("path");

export function stripFileExtension(file: string): string {
  let pathObj = path.posix.parse(file);
  pathObj.base = undefined;
  pathObj.ext = undefined;
  return path.posix.format(pathObj);
}

export function writeFileSync(
  file: string,
  content: string,
  dryRun?: boolean
): void {
  if (dryRun) {
    console.log(file);
    console.log(content);
  } else {
    fs.writeFileSync(file, content);
  }
}
