import fs = require("fs");
import resolve = require("resolve");
import { Definition } from "./definition";
import { parse } from "yaml";

export class DefinitionResolver {
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
      extensions: [".yaml"],
    });
    let nameToDefinitions = this.cachedPathToNameToDefinitions.get(filePath);
    if (!nameToDefinitions) {
      nameToDefinitions = new Map<string, Definition>();
      this.cachedPathToNameToDefinitions.set(filePath, nameToDefinitions);

      let yamlStr = fs.readFileSync(filePath).toString();
      let definitions: Array<Definition>;
      try {
        definitions = parse(yamlStr) as Array<Definition>;
      } catch (e) {
        e.message =
          `${loggingPrefix} failed to parse YAML read from "${filePath}".\n` +
          e.message;
        throw e;
      }
      for (let definition of definitions) {
        nameToDefinitions.set(definition.name, definition);
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
