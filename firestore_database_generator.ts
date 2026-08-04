import {
  Definition,
  FirestoreCollectionDefinition,
  FirestoreDatabaseDefinition,
  FirestoreIndexDefinition,
  FirestoreIndexFieldDefinition,
  FirestoreIndexMode,
  FirestoreQueryDefinition,
  FirestoreWhereConcat,
  FirestoreWhereLeaf,
  MessageDefinition,
  MessageFieldDefinition,
} from "./definition";
import { DefinitionResolver } from "./definition_resolver";
import {
  OutputContentBuilder,
  SimpleContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toInitalLowercased, toUppercaseSnaked } from "./util";

let PRIMITIVE_TYPES = new Set<string>(["boolean", "number", "string"]);

let WHERE_OPERATOR_SUFFIX = new Map<string, string>([
  ["==", "Eq"],
  ["!=", "Ne"],
  ["<", "Lt"],
  ["<=", "Le"],
  [">", "Gt"],
  [">=", "Ge"],
  ["array-contains", "ArrayContains"],
  ["array-contains-any", "ArrayContainsAny"],
  ["in", "In"],
  ["not-in", "NotIn"],
]);

let ALL_INDEX_MODES = new Set<FirestoreIndexMode>(["ASC", "DESC", "CONTAINS"]);

let CAMEL_CASE_REGEXP = /^[a-z][A-Za-z0-9]*$/;
let PASCAL_CASE_REGEXP = /^[A-Z][A-Za-z0-9]*$/;

interface ResolvedCollection {
  definition: FirestoreCollectionDefinition;
  messageDefinition: MessageDefinition;
  messageModulePath?: string;
}

interface ResolvedField {
  definition: MessageFieldDefinition;
  typeDefinition?: Definition;
  typeModulePath?: string;
}

interface QueryArg {
  name: string;
  type: string;
}

interface FirestoreCompositeIndexFieldJson {
  fieldPath: string;
  order?: "ASCENDING" | "DESCENDING";
  arrayConfig?: "CONTAINS";
}

interface FirestoreCompositeIndexJson {
  collectionGroup: string;
  queryScope: "COLLECTION";
  fields: Array<FirestoreCompositeIndexFieldJson>;
}

interface FirestoreSingleFieldIndexJson {
  order?: "ASCENDING" | "DESCENDING";
  arrayConfig?: "CONTAINS";
  queryScope: "COLLECTION";
}

interface FirestoreFieldOverrideJson {
  collectionGroup: string;
  fieldPath: string;
  indexes: Array<FirestoreSingleFieldIndexJson>;
}

export class FirestoreDatabaseGenerator {
  private queriesContentBuilder: TsContentBuilder;
  private indexesContentBuilder: SimpleContentBuilder;
  private collectionNames = new Set<string>();
  private collectionGroupNames = new Array<string>();
  private collectionGroupNameSet = new Set<string>();
  private compositeIndexes = new Array<FirestoreCompositeIndexJson>();
  private compositeIndexKeys = new Set<string>();
  private singleFieldIndexes = new Map<
    string,
    Map<string, Set<FirestoreIndexMode>>
  >();
  private queryArgs = new Array<QueryArg>();

  public constructor(
    private definitionModulePath: string,
    private firestoreDatabaseDefinition: FirestoreDatabaseDefinition,
    private definitionResolver: DefinitionResolver,
    private outputContentMap: Map<string, OutputContentBuilder>,
  ) {}

  public generate(): void {
    if (!this.firestoreDatabaseDefinition.name) {
      throw new Error(`"name" is missing on a firestoreDatabase.`);
    }
    if (!PASCAL_CASE_REGEXP.test(this.firestoreDatabaseDefinition.name)) {
      throw new Error(
        `Firestore database name ${this.firestoreDatabaseDefinition.name} must be of CamelCase.`,
      );
    }
    if (!this.firestoreDatabaseDefinition.outputQueries) {
      throw new Error(
        `"outputQueries" is missing on firestoreDatabase ${this.firestoreDatabaseDefinition.name}.`,
      );
    }
    if (!this.firestoreDatabaseDefinition.outputIndexes) {
      throw new Error(
        `"outputIndexes" is missing on firestoreDatabase ${this.firestoreDatabaseDefinition.name}.`,
      );
    }
    this.queriesContentBuilder = TsContentBuilder.get(
      this.outputContentMap,
      this.definitionModulePath,
      this.firestoreDatabaseDefinition.outputQueries,
    );
    this.indexesContentBuilder = SimpleContentBuilder.get(
      this.outputContentMap,
      ".json",
      this.firestoreDatabaseDefinition.outputIndexes,
    );

    if (!this.firestoreDatabaseDefinition.collections) {
      throw new Error(
        `"collections" is missing on firestoreDatabase ${this.firestoreDatabaseDefinition.name}.`,
      );
    }
    for (let collection of this.firestoreDatabaseDefinition.collections) {
      this.generateCollection(collection);
    }

    this.indexesContentBuilder.push(
      JSON.stringify(
        {
          indexes: this.compositeIndexes,
          fieldOverrides: this.buildFieldOverrides(),
        },
        undefined,
        2,
      ),
      "\n",
    );
  }

  private generateCollection(
    collectionDefinition: FirestoreCollectionDefinition,
  ): void {
    if (!collectionDefinition.name) {
      throw new Error(`"name" is missing on a Firestore collection.`);
    }
    let loggingPrefix = `When generating Firestore collection ${collectionDefinition.name},`;
    if (!PASCAL_CASE_REGEXP.test(collectionDefinition.name)) {
      throw new Error(`${loggingPrefix} "name" must be of CamelCase.`);
    }
    if (this.collectionNames.has(collectionDefinition.name)) {
      throw new Error(
        `${loggingPrefix} another collection has the same logical name.`,
      );
    }
    this.collectionNames.add(collectionDefinition.name);

    if (!collectionDefinition.collectionName) {
      throw new Error(`${loggingPrefix} "collectionName" is missing.`);
    }
    this.validateCollectionName(
      loggingPrefix,
      collectionDefinition.collectionName,
    );

    if (!collectionDefinition.message) {
      throw new Error(`${loggingPrefix} "message" is missing.`);
    }
    let resolvedMessage = this.definitionResolver.resolve(
      loggingPrefix,
      collectionDefinition.message,
      collectionDefinition.importMessage,
    );
    if (resolvedMessage.kind !== "Message") {
      throw new Error(
        `${loggingPrefix} ${collectionDefinition.message} is not a message.`,
      );
    }
    let collection: ResolvedCollection = {
      definition: collectionDefinition,
      messageDefinition: resolvedMessage,
      messageModulePath: collectionDefinition.importMessage,
    };

    this.validatePrimaryKeys(loggingPrefix, collection);
    let collectionGroupName = collectionDefinition.collectionName;
    if (!this.collectionGroupNameSet.has(collectionGroupName)) {
      this.collectionGroupNameSet.add(collectionGroupName);
      this.collectionGroupNames.push(collectionGroupName);
    }

    if (collectionDefinition.indexes) {
      let indexNames = new Set<string>();
      for (
        let index = 0;
        index < collectionDefinition.indexes.length;
        index++
      ) {
        let indexDefinition = collectionDefinition.indexes[index];
        if (!indexDefinition.name) {
          throw new Error(
            `${loggingPrefix} index ${index + 1} is missing "name".`,
          );
        }
        if (!PASCAL_CASE_REGEXP.test(indexDefinition.name)) {
          throw new Error(
            `${loggingPrefix} index name ${indexDefinition.name} must be of CamelCase.`,
          );
        }
        if (indexNames.has(indexDefinition.name)) {
          throw new Error(
            `${loggingPrefix} index name ${indexDefinition.name} is duplicated.`,
          );
        }
        indexNames.add(indexDefinition.name);
        this.generateIndex(
          `${loggingPrefix} within ${indexDefinition.name},`,
          collection,
          indexDefinition,
        );
      }
    }

    if (collectionDefinition.insert) {
      this.generateWrite(
        loggingPrefix,
        collection,
        collectionDefinition.insert,
        "create",
      );
    }
    if (collectionDefinition.upsert) {
      this.generateWrite(
        loggingPrefix,
        collection,
        collectionDefinition.upsert,
        "set",
      );
    }
    if (collectionDefinition.update) {
      this.generateWrite(
        loggingPrefix,
        collection,
        collectionDefinition.update,
        "update",
      );
    }
    if (collectionDefinition.get) {
      this.generateGet(loggingPrefix, collection, collectionDefinition.get);
    }
    if (collectionDefinition.delete) {
      this.generateDelete(
        loggingPrefix,
        collection,
        collectionDefinition.delete,
      );
    }
    if (collectionDefinition.queries) {
      for (let query of collectionDefinition.queries) {
        this.generateQuery(loggingPrefix, collection, query);
      }
    }
  }

  private validatePrimaryKeys(
    loggingPrefix: string,
    collection: ResolvedCollection,
  ): void {
    let primaryKeys = collection.definition.primaryKeys;
    if (!primaryKeys || primaryKeys.length === 0) {
      throw new Error(`${loggingPrefix} "primaryKeys" must not be empty.`);
    }
    let keyFields = new Set<string>();
    for (let primaryKey of primaryKeys) {
      if (!primaryKey) {
        throw new Error(`${loggingPrefix} a primary key field is missing.`);
      }
      if (!CAMEL_CASE_REGEXP.test(primaryKey)) {
        throw new Error(
          `${loggingPrefix} primary key field ${primaryKey} must be of camelCase.`,
        );
      }
      if (keyFields.has(primaryKey)) {
        throw new Error(
          `${loggingPrefix} primary key field ${primaryKey} is duplicated.`,
        );
      }
      keyFields.add(primaryKey);
      let field = this.resolveField(
        loggingPrefix,
        collection,
        primaryKey,
      ).definition;
      if (field.type !== "string" || field.isArray) {
        throw new Error(
          `${loggingPrefix} primary key field ${primaryKey} must be a non-array string.`,
        );
      }
    }
  }

  private validateCollectionName(
    loggingPrefix: string,
    collectionName: string,
  ): void {
    if (
      !collectionName ||
      collectionName.includes("/") ||
      collectionName === "." ||
      collectionName === ".." ||
      /^__.*__$/.test(collectionName) ||
      Buffer.byteLength(collectionName, "utf8") > 1500
    ) {
      throw new Error(
        `${loggingPrefix} collectionName ${collectionName} is not a valid Firestore collection name.`,
      );
    }
  }

  private generateIndex(
    loggingPrefix: string,
    collection: ResolvedCollection,
    indexDefinition: FirestoreIndexDefinition,
  ): void {
    let collectionGroupName = collection.definition.collectionName;
    if (!indexDefinition.fields || indexDefinition.fields.length === 0) {
      throw new Error(`${loggingPrefix} "fields" must not be empty.`);
    }
    if (indexDefinition.fields.length === 1) {
      let fieldDefinition = indexDefinition.fields[0];
      this.validateIndexField(loggingPrefix, collection, fieldDefinition);
      let fieldToModes = this.singleFieldIndexes.get(collectionGroupName);
      if (!fieldToModes) {
        fieldToModes = new Map<string, Set<FirestoreIndexMode>>();
        this.singleFieldIndexes.set(collectionGroupName, fieldToModes);
      }
      let modes = fieldToModes.get(fieldDefinition.name);
      if (!modes) {
        modes = new Set<FirestoreIndexMode>();
        fieldToModes.set(fieldDefinition.name, modes);
      }
      modes.add(fieldDefinition.mode);
      return;
    }

    let usedFields = new Set<string>();
    let arrayFieldCount = 0;
    let indexFields = new Array<FirestoreCompositeIndexFieldJson>();
    for (let fieldDefinition of indexDefinition.fields) {
      this.validateIndexField(loggingPrefix, collection, fieldDefinition);
      if (usedFields.has(fieldDefinition.name)) {
        throw new Error(
          `${loggingPrefix} field ${fieldDefinition.name} is duplicated.`,
        );
      }
      usedFields.add(fieldDefinition.name);
      if (fieldDefinition.mode === "CONTAINS") {
        arrayFieldCount += 1;
      }
      indexFields.push(
        this.buildFirestoreCompositeIndexFieldJson(
          fieldDefinition.name,
          fieldDefinition.mode,
        ),
      );
    }
    if (arrayFieldCount > 1) {
      throw new Error(`${loggingPrefix} at most one field can use CONTAINS.`);
    }

    let index: FirestoreCompositeIndexJson = {
      collectionGroup: collectionGroupName,
      queryScope: "COLLECTION",
      fields: indexFields,
    };
    let indexKey = JSON.stringify(index);
    if (!this.compositeIndexKeys.has(indexKey)) {
      this.compositeIndexKeys.add(indexKey);
      this.compositeIndexes.push(index);
    }
  }

  private validateIndexField(
    loggingPrefix: string,
    collection: ResolvedCollection,
    fieldDefinition: FirestoreIndexFieldDefinition,
  ): void {
    if (!fieldDefinition.name) {
      throw new Error(`${loggingPrefix} "name" is missing on an index field.`);
    }
    if (!ALL_INDEX_MODES.has(fieldDefinition.mode)) {
      throw new Error(
        `${loggingPrefix} index mode ${fieldDefinition.mode} is not supported.`,
      );
    }
    if (fieldDefinition.name === "__name__") {
      if (fieldDefinition.mode === "CONTAINS") {
        throw new Error(`${loggingPrefix} __name__ cannot use CONTAINS.`);
      }
      return;
    }
    let field = this.resolveField(
      loggingPrefix,
      collection,
      fieldDefinition.name,
    );
    if (field.typeDefinition?.kind === "Message") {
      throw new Error(
        `${loggingPrefix} field ${fieldDefinition.name} cannot be indexed or queried because it has message type ${field.definition.type}.`,
      );
    }
    if (fieldDefinition.mode === "CONTAINS" && !field.definition.isArray) {
      throw new Error(
        `${loggingPrefix} field ${fieldDefinition.name} must be an array to use CONTAINS.`,
      );
    }
  }

  private buildFirestoreCompositeIndexFieldJson(
    fieldName: string,
    mode: FirestoreIndexMode,
  ): FirestoreCompositeIndexFieldJson {
    if (mode === "CONTAINS") {
      return {
        fieldPath: fieldName,
        arrayConfig: "CONTAINS",
      };
    }
    return {
      fieldPath: fieldName,
      order: mode === "ASC" ? "ASCENDING" : "DESCENDING",
    };
  }

  private buildFieldOverrides(): Array<FirestoreFieldOverrideJson> {
    let fieldOverrides = new Array<FirestoreFieldOverrideJson>();
    for (let collectionGroupName of this.collectionGroupNames) {
      fieldOverrides.push({
        collectionGroup: collectionGroupName,
        fieldPath: "*",
        indexes: [],
      });
      let fieldToModes = this.singleFieldIndexes.get(collectionGroupName);
      if (!fieldToModes) {
        continue;
      }
      for (let [field, modes] of fieldToModes) {
        fieldOverrides.push({
          collectionGroup: collectionGroupName,
          fieldPath: field,
          indexes: Array.from(modes).map((mode) => {
            if (mode === "CONTAINS") {
              return {
                arrayConfig: "CONTAINS",
                queryScope: "COLLECTION",
              };
            }
            return {
              order: mode === "ASC" ? "ASCENDING" : "DESCENDING",
              queryScope: "COLLECTION",
            };
          }),
        });
      }
    }
    return fieldOverrides;
  }

  private generateWrite(
    loggingPrefix: string,
    collection: ResolvedCollection,
    definitionName: string,
    firestoreMethod: "create" | "set" | "update",
  ): void {
    loggingPrefix = `${loggingPrefix} within ${definitionName},`;
    if (!PASCAL_CASE_REGEXP.test(definitionName)) {
      throw new Error(
        `${loggingPrefix} function definition name must be of CamelCase.`,
      );
    }
    let functionName = toInitalLowercased(definitionName);
    this.queriesContentBuilder.importFromDefinition(
      collection.messageModulePath,
      collection.definition.message,
    );
    this.queriesContentBuilder.importFromFirestore("Firestore", "Transaction");
    let pathExpression = this.buildDocumentPathExpression(
      collection,
      "message",
    );
    let primaryKeyChecks = collection.definition.primaryKeys
      .map((primaryKey) => {
        return `  if (message.${primaryKey} == null) {
    throw new Error("Firestore primary key field ${primaryKey} is required.");
  }
`;
      })
      .join("");
    this.queriesContentBuilder.push(`
export function ${functionName}(
  firestore: Firestore,
  transaction: Transaction,
  message: ${collection.definition.message},
): void {
${primaryKeyChecks}  transaction.${firestoreMethod}(firestore.doc(${pathExpression}), message);
}
`);
  }

  private generateGet(
    loggingPrefix: string,
    collection: ResolvedCollection,
    definitionName: string,
  ): void {
    loggingPrefix = `${loggingPrefix} within ${definitionName},`;
    if (!PASCAL_CASE_REGEXP.test(definitionName)) {
      throw new Error(
        `${loggingPrefix} function definition name must be of CamelCase.`,
      );
    }
    let functionName = toInitalLowercased(definitionName);
    this.queriesContentBuilder.importFromDefinition(
      collection.messageModulePath,
      collection.definition.message,
      toUppercaseSnaked(collection.definition.message),
    );
    this.queriesContentBuilder.importFromFirestore("Firestore", "Transaction");
    this.queriesContentBuilder.importFromMessageParser("parseMessage");
    let pathExpression = this.buildDocumentPathExpression(collection, "args");
    this.queriesContentBuilder.push(`
export async function ${functionName}(
  firestore: Firestore,
  args: {
${this.toArgsForPrimaryKeys(collection)}  },
  transaction?: Transaction,
): Promise<${collection.definition.message} | undefined> {
  let document = firestore.doc(${pathExpression});
  let snapshot = transaction
    ? await transaction.get(document)
    : await document.get();
  if (!snapshot.exists) {
    return undefined;
  }
  return parseMessage(snapshot.data(), ${toUppercaseSnaked(collection.definition.message)});
}
`);
  }

  private generateDelete(
    loggingPrefix: string,
    collection: ResolvedCollection,
    definitionName: string,
  ): void {
    loggingPrefix = `${loggingPrefix} within ${definitionName},`;
    if (!PASCAL_CASE_REGEXP.test(definitionName)) {
      throw new Error(
        `${loggingPrefix} function definition name must be of CamelCase.`,
      );
    }
    let functionName = toInitalLowercased(definitionName);
    this.queriesContentBuilder.importFromFirestore("Firestore", "Transaction");
    let pathExpression = this.buildDocumentPathExpression(collection, "args");
    this.queriesContentBuilder.push(`
export function ${functionName}(
  firestore: Firestore,
  transaction: Transaction,
  args: {
${this.toArgsForPrimaryKeys(collection)}  },
): void {
  transaction.delete(firestore.doc(${pathExpression}));
}
`);
  }

  private generateQuery(
    loggingPrefix: string,
    collection: ResolvedCollection,
    queryDefinition: FirestoreQueryDefinition,
  ): void {
    if (!queryDefinition.name) {
      throw new Error(`${loggingPrefix} "name" is missing on a query.`);
    }
    loggingPrefix = `${loggingPrefix} within ${queryDefinition.name},`;
    if (!PASCAL_CASE_REGEXP.test(queryDefinition.name)) {
      throw new Error(
        `${loggingPrefix} function definition name must be of CamelCase.`,
      );
    }
    let functionName = toInitalLowercased(queryDefinition.name);
    this.queriesContentBuilder.importFromDefinition(
      collection.messageModulePath,
      collection.definition.message,
      toUppercaseSnaked(collection.definition.message),
    );
    this.queriesContentBuilder.importFromFirestore(
      "Firestore",
      "Query",
      "Transaction",
    );
    this.queriesContentBuilder.importFromMessageParser("parseMessage");
    this.queryArgs = new Array<QueryArg>();

    let whereExpression: string | undefined;
    if (queryDefinition.where) {
      this.queriesContentBuilder.importFromFirestore("Filter");
      whereExpression = this.generateWhereExpression(
        loggingPrefix,
        collection,
        queryDefinition.where,
      );
    }

    let queryLines = new Array<string>();
    if (whereExpression) {
      queryLines.push(`
  query = query.where(${whereExpression});`);
    }
    if (queryDefinition.orderBy) {
      for (let orderBy of queryDefinition.orderBy) {
        if (!orderBy.field) {
          throw new Error(`${loggingPrefix} "field" is missing in orderBy.`);
        }
        let fieldExpression: string;
        if (orderBy.field === "__name__") {
          this.queriesContentBuilder.importFromFirestore("FieldPath");
          fieldExpression = `FieldPath.documentId()`;
        } else {
          let field = this.resolveField(
            loggingPrefix,
            collection,
            orderBy.field,
          );
          if (field.typeDefinition?.kind === "Message") {
            throw new Error(
              `${loggingPrefix} field ${orderBy.field} cannot be indexed or queried because it has message type ${field.definition.type}.`,
            );
          }
          fieldExpression = `"${orderBy.field}"`;
        }
        queryLines.push(`
  query = query.orderBy(${fieldExpression}, "${orderBy.desc ? "desc" : "asc"}");`);
      }
    }
    if (queryDefinition.withLimit) {
      queryLines.push(`
  query = query.limit(args.limit);`);
      this.collectQueryArg(loggingPrefix, "limit", "number");
    }

    this.queriesContentBuilder.push(`
export async function ${functionName}(
  firestore: Firestore,`);
    if (this.queryArgs.length > 0) {
      this.queriesContentBuilder.push(`
  args: {
${this.toArgsObject(this.queryArgs)}  },`);
    }
    this.queriesContentBuilder.push(`
  transaction?: Transaction,
): Promise<Array<${collection.definition.message}>> {
  let query: Query = firestore.collection("${collection.definition.collectionName}");${queryLines.join("")}
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ${toUppercaseSnaked(collection.definition.message)}));
}
`);
  }

  private generateWhereExpression(
    loggingPrefix: string,
    collection: ResolvedCollection,
    where: FirestoreWhereConcat | FirestoreWhereLeaf,
  ): string {
    if ((where as FirestoreWhereLeaf).field !== undefined) {
      let leaf = where as FirestoreWhereLeaf;
      if (!leaf.field) {
        throw new Error(`${loggingPrefix} "field" is missing in where.`);
      }
      let operatorSuffix = WHERE_OPERATOR_SUFFIX.get(leaf.op);
      if (!operatorSuffix) {
        throw new Error(
          `${loggingPrefix} where operator ${leaf.op} is not supported.`,
        );
      }
      let field = this.resolveField(loggingPrefix, collection, leaf.field);
      if (field.typeDefinition?.kind === "Message") {
        throw new Error(
          `${loggingPrefix} field ${leaf.field} cannot be indexed or queried because it has message type ${field.definition.type}.`,
        );
      }
      if (field.typeDefinition?.kind === "Enum") {
        this.queriesContentBuilder.importFromDefinition(
          field.typeModulePath,
          field.definition.type,
        );
      }
      if (
        (leaf.op === "array-contains" || leaf.op === "array-contains-any") &&
        !field.definition.isArray
      ) {
        throw new Error(
          `${loggingPrefix} field ${leaf.field} must be an array to use ${leaf.op}.`,
        );
      }
      let rVar = leaf.rVar ?? `${leaf.field}${operatorSuffix}`;
      let valueType = this.getWhereValueType(field, leaf.op);
      this.collectQueryArg(loggingPrefix, rVar, valueType);
      return `Filter.where("${leaf.field}", "${leaf.op}", args.${rVar})`;
    } else {
      let concat = where as FirestoreWhereConcat;
      if (concat.op !== "AND" && concat.op !== "OR") {
        throw new Error(
          `${loggingPrefix} where concat operator ${concat.op} is not supported.`,
        );
      }
      if (!concat.exprs || concat.exprs.length === 0) {
        throw new Error(
          `${loggingPrefix} where ${concat.op} expression must not be empty.`,
        );
      }
      return `Filter.${concat.op.toLowerCase()}(${concat.exprs
        .map((expr) => {
          return this.generateWhereExpression(loggingPrefix, collection, expr);
        })
        .join(", ")})`;
    }
  }

  private getWhereValueType(
    resolvedField: ResolvedField,
    operator: string,
  ): string {
    let elementType = resolvedField.definition.type;
    let fieldType = resolvedField.definition.isArray
      ? `Array<${elementType}>`
      : elementType;
    switch (operator) {
      case "array-contains":
        return elementType;
      case "array-contains-any":
        return `Array<${elementType}>`;
      case "in":
      case "not-in":
        return `Array<${fieldType}>`;
      default:
        return fieldType;
    }
  }

  private collectQueryArg(
    loggingPrefix: string,
    name: string,
    type: string,
  ): void {
    if (!CAMEL_CASE_REGEXP.test(name)) {
      throw new Error(
        `${loggingPrefix} input parameter ${name} must be of camelCase.`,
      );
    }
    this.queryArgs.push({ name, type });
  }

  private buildDocumentPathExpression(
    collection: ResolvedCollection,
    source: "args" | "message",
  ): string {
    let primaryKeyExpressions = collection.definition.primaryKeys.map(
      (primaryKey) => `${source}.${primaryKey}`,
    );
    return `["${collection.definition.collectionName}", ${primaryKeyExpressions.join(" + ")}].join("/")`;
  }

  private toArgsForPrimaryKeys(collection: ResolvedCollection): string {
    return collection.definition.primaryKeys
      .map((primaryKey) => `    ${primaryKey}: string,\n`)
      .join("");
  }

  private toArgsObject(args: Array<QueryArg>): string {
    return args.map((arg) => `    ${arg.name}: ${arg.type},\n`).join("");
  }

  private resolveField(
    loggingPrefix: string,
    collection: ResolvedCollection,
    fieldName: string,
  ): ResolvedField {
    if (!CAMEL_CASE_REGEXP.test(fieldName)) {
      throw new Error(
        `${loggingPrefix} field ${fieldName} must be a top-level camelCase field.`,
      );
    }
    let fieldDefinition = collection.messageDefinition.fields?.find((field) => {
      return field.name === fieldName;
    });
    if (!fieldDefinition || fieldDefinition.deprecated) {
      throw new Error(
        `${loggingPrefix} field ${fieldName} is not found on message ${collection.messageDefinition.name}.`,
      );
    }
    let typeDefinition: Definition | undefined;
    let typeModulePath = fieldDefinition.import ?? collection.messageModulePath;
    if (!PRIMITIVE_TYPES.has(fieldDefinition.type)) {
      typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        fieldDefinition.type,
        typeModulePath,
      );
      if (typeDefinition.kind !== "Message" && typeDefinition.kind !== "Enum") {
        throw new Error(
          `${loggingPrefix} field ${fieldName} has unsupported type ${fieldDefinition.type}.`,
        );
      }
    }
    return {
      definition: fieldDefinition,
      typeDefinition,
      typeModulePath,
    };
  }
}
