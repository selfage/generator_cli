import fs = require("fs");
import path = require("path");
import { DatastoreIndexBuilder } from "./datastore_index_builder";
import { generateDatastoreModel } from "./datastore_model_generator";
import { Definition } from "./definition";
import { generateEnumDescriptor } from "./enum_generator";
import { stripFileExtension, writeFileSync } from "./io_helper";
import { generateMessageDescriptor } from "./message_generator";
import { generateObservableDescriptor } from "./observable_generator";
import { OutputContentBuilder } from "./output_content_builder";
import { generateServiceDescriptor } from "./service_generator";
import { generateSpannerSql } from "./spanner_sql_generator";
import { TypeLoader } from "./type_loader";
import { normalizeRelativePathForNode } from "./util";

export function generate(
  inputFile: string,
  inputIndexFile?: string,
  dryRun?: boolean,
  packageJsonFile = "./package.json",
): void {
  let modulePath = normalizeRelativePathForNode(stripFileExtension(inputFile));
  let definitions = JSON.parse(
    fs.readFileSync(modulePath + ".json").toString(),
  ) as Array<Definition>;

  let hasDatastoreDefinition = definitions.some((definition) => {
    return definition.message && definition.message.datastore;
  });
  let indexBuilder: DatastoreIndexBuilder;
  if (hasDatastoreDefinition) {
    let indexFile = inputIndexFile;
    if (!indexFile) {
      let packageIndexFile = JSON.parse(
        fs.readFileSync(packageJsonFile).toString(),
      ).datastoreIndex;
      if (!packageIndexFile) {
        throw new Error(
          "An index file is required for generating datastore model.",
        );
      }
      indexFile = path.posix.join(
        path.posix.dirname(packageJsonFile),
        packageIndexFile,
      );
    }
    indexBuilder = DatastoreIndexBuilder.create(
      stripFileExtension(indexFile) + ".yaml",
    );
  }

  let typeLoader = new TypeLoader(modulePath);
  let contentMap = new Map<string, OutputContentBuilder>();
  for (let definition of definitions) {
    if (definition.enum) {
      generateEnumDescriptor(
        modulePath,
        definition.name,
        definition.enum,
        contentMap,
      );
    } else if (definition.message) {
      generateMessageDescriptor(
        modulePath,
        definition.name,
        definition.message,
        typeLoader,
        contentMap,
      );
      if (definition.message.datastore) {
        generateDatastoreModel(
          modulePath,
          definition.name,
          definition.message,
          typeLoader,
          indexBuilder,
          contentMap,
        );
      }
    } else if (definition.observable) {
      generateObservableDescriptor(
        modulePath,
        definition.name,
        definition.observable,
        typeLoader,
        contentMap,
      );
    } else if (definition.service) {
      generateServiceDescriptor(
        modulePath,
        definition.name,
        definition.service,
        typeLoader,
        contentMap,
      );
    } else if (definition.spannerSql) {
      generateSpannerSql(
        modulePath,
        definition.name,
        definition.spannerSql,
        contentMap,
      );
    }
  }

  if (indexBuilder) {
    indexBuilder.writeFileSync(dryRun);
  }
  for (let [outputModulePath, outputContentBuilder] of contentMap) {
    writeFileSync(
      outputModulePath + ".ts",
      outputContentBuilder.toString(),
      dryRun,
    );
  }
}
