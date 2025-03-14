import fs = require("fs");
import { Definition } from "./definition";
import { DefinitionResolver } from "./definition_resolver";
import { generateEnum } from "./enum_generator";
import { stripFileExtension } from "./io_helper";
import { generateMessage } from "./message_generator";
import { OutputContentBuilder } from "./output_content_builder";
import { generateRemoteCallsGroup, generateService } from "./service_generator";
import { SpannerDatabaseGenerator } from "./spanner_database_generator";
import { normalizeRelativePathForNode } from "./util";
import { parse } from "yaml";

export function generate(inputFile: string, dryRun?: boolean): void {
  let modulePath = normalizeRelativePathForNode(stripFileExtension(inputFile));
  let definitions = parse(
    fs.readFileSync(modulePath + ".yaml").toString(),
  ) as Array<Definition>;

  let definitionResolver = new DefinitionResolver(modulePath);
  let outputContentMap = new Map<string, OutputContentBuilder>();
  for (let definition of definitions) {
    if (definition.kind === "Enum") {
      generateEnum(modulePath, definition, outputContentMap);
    } else if (definition.kind === "Message") {
      generateMessage(
        modulePath,
        definition,
        definitionResolver,
        outputContentMap,
      );
    } else if (definition.kind === "Service") {
      generateService(modulePath, definition, outputContentMap);
    } else if (definition.kind === "RemoteCallsGroup") {
      generateRemoteCallsGroup(
        modulePath,
        definition,
        definitionResolver,
        outputContentMap,
      );
    } else if (definition.kind === "SpannerDatabase") {
      new SpannerDatabaseGenerator(
        modulePath,
        definition,
        definitionResolver,
        outputContentMap,
      ).generate();
    }
  }

  for (let outputContentBuilder of outputContentMap.values()) {
    outputContentBuilder.writeSync(dryRun);
  }
}
