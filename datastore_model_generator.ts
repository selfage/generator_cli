import path = require("path");
import { DatastoreIndexBuilder } from "./datastore_index_builder";
import {
  DatastoreFilterTemplate,
  DatastoreOrdering,
  MessageDefinition,
  MessageFieldDefinition,
} from "./definition";
import { DefinitionFinder } from "./definition_finder";
import { OutputContentBuilder } from "./output_content_builder";
import {
  generateComment,
  normalizeRelativePathForNode,
  reverseImport,
  toInitialUppercased,
  toUppercaseSnaked,
  transitImport,
} from "./util";

let OPERATOR_NAME_MAP = new Map<string, string>([
  ["=", "equalTo"],
  [">", "greaterThan"],
  ["<", "lessThan"],
  [">=", "greaterThanOrEqualTo"],
  ["<=", "lessThanOrEqualTo"],
]);

let PRIMITIVE_TYPES = new Set<string>(["string", "number", "boolean"]);

export function generateDatastoreModel(
  modulePath: string,
  messageName: string,
  messageDefinition: MessageDefinition,
  definitionFinder: DefinitionFinder,
  indexBuilder: DatastoreIndexBuilder,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  let outputPath = normalizeRelativePathForNode(
    path.posix.join(
      path.posix.dirname(modulePath),
      messageDefinition.datastore.output,
    ),
  );
  let outputContentBuilder = OutputContentBuilder.get(contentMap, outputPath);
  let importMessagePath = reverseImport(modulePath, outputPath);
  let messageDescriptorName = toUppercaseSnaked(messageName);

  let fieldToDefinitions = new Map<string, MessageFieldDefinition>();
  let excludedIndexes = new Set<string>();
  for (let field of messageDefinition.fields) {
    fieldToDefinitions.set(field.name, field);
    excludedIndexes.add(field.name);
  }

  let indexContentList = new Array<string>();
  if (messageDefinition.datastore.queries) {
    for (let query of messageDefinition.datastore.queries) {
      if (!query.filters) {
        query.filters = new Array<DatastoreFilterTemplate>();
      }
      if (!query.orderings) {
        query.orderings = new Array<DatastoreOrdering>();
      }
      let inequalityFilteredFieldName: string;
      for (let filter of query.filters) {
        if (!OPERATOR_NAME_MAP.has(filter.operator)) {
          throw new Error(
            `Unknown operator ${filter.operator} on query ${query.name}.`,
          );
        }
        if (filter.operator !== "=") {
          if (!inequalityFilteredFieldName) {
            inequalityFilteredFieldName = filter.fieldName;
          } else if (inequalityFilteredFieldName !== filter.fieldName) {
            throw new Error(
              `More than 1 fields are used in inequality filters in query ` +
                `${query.name} which is not allowed by Datastore.`,
            );
          }
        }
      }

      indexBuilder.addIndex(messageName, query);
      outputContentBuilder.importFromDatastoreModelDescriptor(
        "DatastoreQuery",
        "DatastoreFilter",
      );
      indexContentList.push(`${generateComment(query.comment)}
export class ${query.name}QueryBuilder {
  private datastoreQuery: DatastoreQuery<${messageName}> = {
    modelDescriptor: ${messageDescriptorName}_MODEL,
    filters: new Array<DatastoreFilter>(),
    orderings: [`);
      for (let ordering of query.orderings) {
        validateFieldAndNeedsToBeIndexed(
          ordering.fieldName,
          fieldToDefinitions,
          definitionFinder,
          excludedIndexes,
        );
        indexContentList.push(`
      {
        fieldName: "${ordering.fieldName}",
        descending: ${ordering.descending}
      },`);
        excludedIndexes.delete(ordering.fieldName);
      }
      indexContentList.push(`
    ]
  };

  public start(cursor: string): this {
    this.datastoreQuery.startCursor = cursor;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }`);
      for (let filter of query.filters) {
        let { fieldDefinition, isEnum } = validateFieldAndNeedsToBeIndexed(
          filter.fieldName,
          fieldToDefinitions,
          definitionFinder,
          excludedIndexes,
        );
        if (isEnum) {
          outputContentBuilder.importFromPath(
            transitImport(importMessagePath, fieldDefinition.import),
            fieldDefinition.type,
          );
        }
        indexContentList.push(`
  public ${OPERATOR_NAME_MAP.get(filter.operator)}${toInitialUppercased(
    filter.fieldName,
  )}(value: ${fieldDefinition.type}): this {
    this.datastoreQuery.filters.push({
      fieldName: "${filter.fieldName}",
      fieldValue: value,
      operator: "${filter.operator}",
    });
    return this;
  }`);
      }
      indexContentList.push(`
  public build(): DatastoreQuery<${messageName}> {
    return this.datastoreQuery;
  }
}
`);
    }
  }

  let keyDefinition = fieldToDefinitions.get(messageDefinition.datastore.key);
  if (!keyDefinition) {
    throw new Error(
      `Datastore key ${messageDefinition.datastore.key} is not found from ` +
        `${messageName}.`,
    );
  }
  if (keyDefinition.type !== "string") {
    throw new Error(
      `Datastore key can only be a string, but it is ` +
        `${keyDefinition.type}.`,
    );
  }
  if (keyDefinition.isArray) {
    throw new Error(`Datastore key cannot be an array.`);
  }
  outputContentBuilder.importFromPath(
    importMessagePath,
    messageName,
    messageDescriptorName,
  );
  outputContentBuilder.importFromDatastoreModelDescriptor(
    "DatastoreModelDescriptor",
  );
  outputContentBuilder.push(`${generateComment(
    messageDefinition.datastore.comment,
  )}
export let ${messageDescriptorName}_MODEL: DatastoreModelDescriptor<${messageName}> = {
  name: "${messageName}",
  key: "${messageDefinition.datastore.key}",
  excludedIndexes: ["${Array.from(excludedIndexes).join(`", "`)}"],
  valueDescriptor: ${messageDescriptorName},
}
`);
  outputContentBuilder.push(...indexContentList);
}

function validateFieldAndNeedsToBeIndexed(
  fieldName: string,
  fieldToDefinitions: Map<string, MessageFieldDefinition>,
  definitionFinder: DefinitionFinder,
  excludedIndexes: Set<string>,
): { fieldDefinition: MessageFieldDefinition; isEnum: boolean } {
  if (!fieldToDefinitions.has(fieldName)) {
    throw new Error(
      `Field ${fieldName} is not defined and cannot be used to be ordered by ` +
        `or filtered by.`,
    );
  }

  let fieldDefinition = fieldToDefinitions.get(fieldName);
  if (PRIMITIVE_TYPES.has(fieldDefinition.type)) {
    excludedIndexes.delete(fieldName);
    return { fieldDefinition, isEnum: false };
  } else {
    let typeDefinition = definitionFinder.getDefinition(
      fieldDefinition.type,
      fieldDefinition.import,
    );
    if (!typeDefinition || !typeDefinition.enum) {
      throw new Error(
        `${fieldName} is of ${fieldDefinition.type} which cannot be used to be ordered by or filtered by in Datastore.`,
      );
    }

    excludedIndexes.delete(fieldName);
    return { fieldDefinition, isEnum: true };
  }
}
