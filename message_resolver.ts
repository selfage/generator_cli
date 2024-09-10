import fs = require("fs");
import resolve = require("resolve");
import { Definition } from "./definition";

export class MessageResolver {
  private cachedPathToNameToDefinitions = new Map<
    string,
    Map<string, Definition>
  >();

  public constructor(private baseModulePath: string) {}

  public resolve(
    loggingPrefix: string,
    name: string,
    importPath?: string,
  ): Definition {
    if (!importPath) {
      importPath = this.baseModulePath;
    }
    let filePath = resolve.sync(importPath, {
      basedir: ".",
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
          `${loggingPrefix} failed to parse JSON read from "${filePath}".\n` +
          e.message;
        throw e;
      }
      for (let definition of definitions) {
        if (definition.message) {
          nameToDefinitions.set(definition.message.name, definition);
        } else if (definition.enum) {
          nameToDefinitions.set(definition.enum.name, definition);
        }
      }
    }
    let definition = nameToDefinitions.get(name);
    if (!definition) {
      throw new Error(
        `${loggingPrefix} message/enum definition ${name} is not found in "${filePath}".`,
      );
    }
    return definition;
  }
}
