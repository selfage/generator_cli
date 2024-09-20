import fs = require("fs");
import { Definition } from "./definition";
import { generateEnum } from "./enum_generator";
import { stripFileExtension } from "./io_helper";
import { generateMessage } from "./message_generator";
import { MessageResolver } from "./message_resolver";
import { OutputContentBuilder } from "./output_content_builder";
import { generateService } from "./service_generator";
import { generateSpannerDatabase } from "./spanner_database_generator";
import { normalizeRelativePathForNode } from "./util";
import { parse } from "yaml";

export function generate(inputFile: string, dryRun?: boolean): void {
  let modulePath = normalizeRelativePathForNode(stripFileExtension(inputFile));
  let definitions = parse(
    fs.readFileSync(modulePath + ".yaml").toString(),
  ) as Array<Definition>;

  let messageResolver = new MessageResolver(modulePath);
  let outputContentMap = new Map<string, OutputContentBuilder>();
  for (let definition of definitions) {
    if (definition.enum) {
      generateEnum(modulePath, definition.enum, outputContentMap);
    } else if (definition.message) {
      generateMessage(
        modulePath,
        definition.message,
        messageResolver,
        outputContentMap,
      );
    } else if (definition.webService) {
      generateService(
        modulePath,
        definition.webService,
        "web",
        messageResolver,
        outputContentMap,
      );
    } else if (definition.nodeService) {
      generateService(
        modulePath,
        definition.nodeService,
        "node",
        messageResolver,
        outputContentMap,
      );
    } else if (definition.spannerDatabase) {
      generateSpannerDatabase(
        modulePath,
        definition.spannerDatabase,
        messageResolver,
        outputContentMap,
      );
    }
  }

  for (let outputContentBuilder of outputContentMap.values()) {
    outputContentBuilder.writeSync(dryRun);
  }
}
