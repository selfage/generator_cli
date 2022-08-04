import fs = require("fs");
import path = require("path");
import resolve = require("resolve");
import { Definition } from "./definition";

export class TypeLoader {
  private currentDir: string;
  private currentModuleBase: string;
  private cachedPathToNameToDefinitions = new Map<
    string,
    Map<string, Definition>
  >();

  public constructor(currentModulePath: string) {
    let pathObj = path.parse(currentModulePath);
    this.currentDir = pathObj.dir;
    this.currentModuleBase = "./" + pathObj.base;
  }

  public getDefinition(typeName: string, importPath?: string): Definition {
    if (!importPath) {
      importPath = this.currentModuleBase;
    }
    let filePath = resolve.sync(importPath, {
      basedir: this.currentDir,
      extensions: [".json"],
    });
    let nameToDefinitions = this.cachedPathToNameToDefinitions.get(filePath);
    if (!nameToDefinitions) {
      nameToDefinitions = new Map<string, Definition>();
      this.cachedPathToNameToDefinitions.set(filePath, nameToDefinitions);

      let jsonStr = fs.readFileSync(filePath).toString();
      let definitions: Array<Definition>;
      try {
        definitions = JSON.parse(jsonStr) as Array<Definition>;
      } catch (e) {
        e.message =
          `Failed to parse JSON read from "${filePath}".\n` + e.message;
        throw e;
      }
      for (let definition of definitions) {
        nameToDefinitions.set(definition.name, definition);
      }
    }
    return nameToDefinitions.get(typeName);
  }
}
