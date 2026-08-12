import {
  Definition,
  FirestoreCollectionDefinition,
  FirestoreDatabaseDefinition,
  FirestoreIndexFieldDefinition,
  FirestoreIndexMode,
  FirestoreQueryDefinition,
  FirestoreTaskCollectionDefinition,
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

interface ResolvedField {
  fieldDefinition: MessageFieldDefinition;
  typeDefinition?: Definition;
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
      if ("kind" in collection && collection.kind === "TaskCollection") {
        this.generateTaskCollection(collection);
      } else {
        this.generateCollection(collection);
      }
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
    this.resolveMessage(loggingPrefix, collectionDefinition);

    this.validatePrimaryKeys(loggingPrefix, collectionDefinition);
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
          collectionDefinition,
          indexDefinition.fields,
        );
      }
    }

    if (collectionDefinition.insert) {
      this.generateWrite(
        loggingPrefix,
        collectionDefinition,
        collectionDefinition.insert,
        "create",
      );
    }
    if (collectionDefinition.upsert) {
      this.generateWrite(
        loggingPrefix,
        collectionDefinition,
        collectionDefinition.upsert,
        "set",
      );
    }
    if (collectionDefinition.update) {
      this.generateWrite(
        loggingPrefix,
        collectionDefinition,
        collectionDefinition.update,
        "update",
      );
    }
    if (collectionDefinition.get) {
      this.generateGet(
        loggingPrefix,
        collectionDefinition,
        collectionDefinition.get,
      );
    }
    if (collectionDefinition.delete) {
      this.generateDelete(
        loggingPrefix,
        collectionDefinition,
        collectionDefinition.delete,
      );
    }
    if (collectionDefinition.queries) {
      for (let query of collectionDefinition.queries) {
        this.generateQuery(loggingPrefix, collectionDefinition, query);
      }
    }
  }

  private generateTaskCollection(
    taskCollectionDefinition: FirestoreTaskCollectionDefinition,
  ): void {
    this.generateCollection(taskCollectionDefinition);
    let loggingPrefix = `When generating Firestore task collection ${taskCollectionDefinition.name},`;
    this.validateTaskField(
      loggingPrefix,
      taskCollectionDefinition,
      taskCollectionDefinition.retryCountField,
      "retryCountField",
    );
    this.validateTaskField(
      loggingPrefix,
      taskCollectionDefinition,
      taskCollectionDefinition.executionTimeField,
      "executionTimeField",
    );
    this.validateTaskField(
      loggingPrefix,
      taskCollectionDefinition,
      taskCollectionDefinition.createdTimeField,
      "createdTimeField",
    );

    if (!taskCollectionDefinition.insert) {
      throw new Error(`${loggingPrefix} "insert" is missing.`);
    }
    if (!taskCollectionDefinition.delete) {
      throw new Error(`${loggingPrefix} "delete" is missing.`);
    }
    if (!taskCollectionDefinition.get) {
      throw new Error(`${loggingPrefix} "get" is missing.`);
    }
    if (!taskCollectionDefinition.update) {
      throw new Error(`${loggingPrefix} "update" is missing.`);
    }
    if (!taskCollectionDefinition.listPendingTasks) {
      throw new Error(`${loggingPrefix} "listPendingTasks" is missing.`);
    }
    if (!taskCollectionDefinition.registerSnapshotListener) {
      throw new Error(
        `${loggingPrefix} "registerSnapshotListener" is missing.`,
      );
    }

    this.generateIndex(
      `${loggingPrefix} within the implicit execution-time index,`,
      taskCollectionDefinition,
      [
        {
          name: taskCollectionDefinition.executionTimeField,
          mode: "ASC",
        },
      ],
    );
    this.generateQuery(loggingPrefix, taskCollectionDefinition, {
      name: taskCollectionDefinition.listPendingTasks,
      where: {
        field: taskCollectionDefinition.executionTimeField,
        op: "<=",
      },
    });
    this.generateTaskSnapshotListener(
      loggingPrefix,
      taskCollectionDefinition,
      taskCollectionDefinition.registerSnapshotListener,
    );
  }

  private validatePrimaryKeys(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
  ): void {
    let primaryKeys = collectionDefinition.primaryKeys;
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
      let { fieldDefinition } = this.lookUpAndResolveField(
        loggingPrefix,
        collectionDefinition,
        primaryKey,
      );
      if (fieldDefinition.type !== "string" || fieldDefinition.isArray) {
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
    collectionDefinition: FirestoreCollectionDefinition,
    fieldDefinitions: Array<FirestoreIndexFieldDefinition>,
  ): void {
    let collectionGroupName = collectionDefinition.collectionName;
    if (!fieldDefinitions || fieldDefinitions.length === 0) {
      throw new Error(`${loggingPrefix} "fields" must not be empty.`);
    }
    if (fieldDefinitions.length === 1) {
      let fieldDefinition = fieldDefinitions[0];
      this.validateIndexField(
        loggingPrefix,
        collectionDefinition,
        fieldDefinition,
      );
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
    for (let fieldDefinition of fieldDefinitions) {
      this.validateIndexField(
        loggingPrefix,
        collectionDefinition,
        fieldDefinition,
      );
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
    collectionDefinition: FirestoreCollectionDefinition,
    indexFieldDefinition: FirestoreIndexFieldDefinition,
  ): void {
    if (!indexFieldDefinition.name) {
      throw new Error(`${loggingPrefix} "name" is missing on an index field.`);
    }
    if (!ALL_INDEX_MODES.has(indexFieldDefinition.mode)) {
      throw new Error(
        `${loggingPrefix} index mode ${indexFieldDefinition.mode} is not supported.`,
      );
    }
    if (indexFieldDefinition.name === "__name__") {
      if (indexFieldDefinition.mode === "CONTAINS") {
        throw new Error(`${loggingPrefix} __name__ cannot use CONTAINS.`);
      }
      return;
    }
    let { fieldDefinition, typeDefinition } = this.lookUpAndResolveField(
      loggingPrefix,
      collectionDefinition,
      indexFieldDefinition.name,
    );
    if (typeDefinition?.kind === "Message") {
      throw new Error(
        `${loggingPrefix} field ${indexFieldDefinition.name} cannot be indexed or queried because it has message type ${fieldDefinition.type}.`,
      );
    }
    if (indexFieldDefinition.mode === "CONTAINS" && !fieldDefinition.isArray) {
      throw new Error(
        `${loggingPrefix} field ${indexFieldDefinition.name} must be an array to use CONTAINS.`,
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
    collectionDefinition: FirestoreCollectionDefinition,
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
      collectionDefinition.importMessage,
      collectionDefinition.message,
    );
    this.queriesContentBuilder.importFromFirestore("Firestore", "Transaction");
    let pathExpression = this.buildDocumentPathExpression(
      collectionDefinition,
      "message",
    );
    let primaryKeyChecks = collectionDefinition.primaryKeys
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
  message: ${collectionDefinition.message},
): void {
${primaryKeyChecks}  transaction.${firestoreMethod}(firestore.doc(${pathExpression}), message);
}
`);
  }

  private generateGet(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
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
      collectionDefinition.importMessage,
      collectionDefinition.message,
      toUppercaseSnaked(collectionDefinition.message),
    );
    this.queriesContentBuilder.importFromFirestore("Firestore", "Transaction");
    this.queriesContentBuilder.importFromMessageParser("parseMessage");
    let pathExpression = this.buildDocumentPathExpression(
      collectionDefinition,
      "args",
    );
    this.queriesContentBuilder.push(`
export async function ${functionName}(
  firestore: Firestore,
  args: {
${this.toArgsForPrimaryKeys(collectionDefinition)}  },
  transaction?: Transaction,
): Promise<${collectionDefinition.message} | undefined> {
  let document = firestore.doc(${pathExpression});
  let snapshot = transaction
    ? await transaction.get(document)
    : await document.get();
  if (!snapshot.exists) {
    return undefined;
  }
  return parseMessage(snapshot.data(), ${toUppercaseSnaked(collectionDefinition.message)});
}
`);
  }

  private generateDelete(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
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
    let pathExpression = this.buildDocumentPathExpression(
      collectionDefinition,
      "args",
    );
    this.queriesContentBuilder.push(`
export function ${functionName}(
  firestore: Firestore,
  transaction: Transaction,
  args: {
${this.toArgsForPrimaryKeys(collectionDefinition)}  },
): void {
  transaction.delete(firestore.doc(${pathExpression}));
}
`);
  }

  private generateTaskSnapshotListener(
    loggingPrefix: string,
    taskCollectionDefinition: FirestoreTaskCollectionDefinition,
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
      taskCollectionDefinition.importMessage,
      taskCollectionDefinition.message,
      toUppercaseSnaked(taskCollectionDefinition.message),
    );
    this.queriesContentBuilder.importFromFirestore("Firestore");
    this.queriesContentBuilder.importFromMessageParser("parseMessage");
    this.queriesContentBuilder.push(`
export function ${functionName}(
  firestore: Firestore,
  removeCallbackFn: (taskId: string) => void,
  updateCallbackFn: (
    taskId: string,
    executionTimeMs: number,
    task: ${taskCollectionDefinition.message},
  ) => void,
  handleErrorFn: (error: unknown) => void,
): () => void {
  return firestore.collection("${taskCollectionDefinition.collectionName}").onSnapshot(
    (snapshot) => {
      for (let change of snapshot.docChanges()) {
        if (change.type === "removed") {
          removeCallbackFn(change.doc.id);
          continue;
        }

        let task = parseMessage(
          change.doc.data(),
          ${toUppercaseSnaked(taskCollectionDefinition.message)},
        );
        updateCallbackFn(change.doc.id, task.${taskCollectionDefinition.executionTimeField}!, task);
      }
    },
    handleErrorFn,
  );
}
`);
  }

  private generateQuery(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
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
      collectionDefinition.importMessage,
      collectionDefinition.message,
      toUppercaseSnaked(collectionDefinition.message),
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
        collectionDefinition,
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
          let { fieldDefinition, typeDefinition } =
            this.lookUpAndResolveField(
              loggingPrefix,
              collectionDefinition,
              orderBy.field,
            );
          if (typeDefinition?.kind === "Message") {
            throw new Error(
              `${loggingPrefix} field ${orderBy.field} cannot be indexed or queried because it has message type ${fieldDefinition.type}.`,
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
): Promise<Array<${collectionDefinition.message}>> {
  let query: Query = firestore.collection("${collectionDefinition.collectionName}");${queryLines.join("")}
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ${toUppercaseSnaked(collectionDefinition.message)}));
}
`);
  }

  private generateWhereExpression(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
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
      let { fieldDefinition, typeDefinition } = this.lookUpAndResolveField(
        loggingPrefix,
        collectionDefinition,
        leaf.field,
      );
      if (typeDefinition?.kind === "Message") {
        throw new Error(
          `${loggingPrefix} field ${leaf.field} cannot be indexed or queried because it has message type ${fieldDefinition.type}.`,
        );
      }
      if (typeDefinition?.kind === "Enum") {
        this.queriesContentBuilder.importFromDefinition(
          fieldDefinition.import ?? collectionDefinition.importMessage,
          fieldDefinition.type,
        );
      }
      if (
        (leaf.op === "array-contains" || leaf.op === "array-contains-any") &&
        !fieldDefinition.isArray
      ) {
        throw new Error(
          `${loggingPrefix} field ${leaf.field} must be an array to use ${leaf.op}.`,
        );
      }
      let rVar = leaf.rVar ?? `${leaf.field}${operatorSuffix}`;
      let valueType = this.getWhereValueType(fieldDefinition, leaf.op);
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
          return this.generateWhereExpression(
            loggingPrefix,
            collectionDefinition,
            expr,
          );
        })
        .join(", ")})`;
    }
  }

  private getWhereValueType(
    fieldDefinition: MessageFieldDefinition,
    operator: string,
  ): string {
    let elementType = fieldDefinition.type;
    let fieldType = fieldDefinition.isArray
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
    collectionDefinition: FirestoreCollectionDefinition,
    source: "args" | "message",
  ): string {
    let primaryKeyExpressions = collectionDefinition.primaryKeys.map(
      (primaryKey) => `${source}.${primaryKey}`,
    );
    return `["${collectionDefinition.collectionName}", ${primaryKeyExpressions.join(" + ")}].join("/")`;
  }

  private toArgsForPrimaryKeys(
    collectionDefinition: FirestoreCollectionDefinition,
  ): string {
    return collectionDefinition.primaryKeys
      .map((primaryKey) => `    ${primaryKey}: string,\n`)
      .join("");
  }

  private toArgsObject(args: Array<QueryArg>): string {
    return args.map((arg) => `    ${arg.name}: ${arg.type},\n`).join("");
  }

  private validateTaskField(
    loggingPrefix: string,
    taskCollectionDefinition: FirestoreTaskCollectionDefinition,
    fieldName: string,
    what: string,
  ): void {
    if (!fieldName) {
      throw new Error(`${loggingPrefix} "${what}" is missing.`);
    }
    let { fieldDefinition } = this.lookUpAndResolveField(
      loggingPrefix,
      taskCollectionDefinition,
      fieldName,
    );
    if (fieldDefinition.type !== "number" || fieldDefinition.isArray) {
      throw new Error(
        `${loggingPrefix} ${what} ${fieldName} must be a non-array number field.`,
      );
    }
  }

  private lookUpAndResolveField(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
    fieldName: string,
  ): ResolvedField {
    if (!CAMEL_CASE_REGEXP.test(fieldName)) {
      throw new Error(
        `${loggingPrefix} field ${fieldName} must be a top-level camelCase field.`,
      );
    }
    let messageDefinition = this.resolveMessage(
      loggingPrefix,
      collectionDefinition,
    );
    let fieldDefinition = messageDefinition.fields?.find((field) => {
      return field.name === fieldName;
    });
    if (!fieldDefinition || fieldDefinition.deprecated) {
      throw new Error(
        `${loggingPrefix} field ${fieldName} is not found on message ${messageDefinition.name}.`,
      );
    }
    let typeDefinition: Definition | undefined;
    if (!PRIMITIVE_TYPES.has(fieldDefinition.type)) {
      typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        fieldDefinition.type,
        fieldDefinition.import ?? collectionDefinition.importMessage,
      );
      if (typeDefinition.kind !== "Message" && typeDefinition.kind !== "Enum") {
        throw new Error(
          `${loggingPrefix} field ${fieldName} has unsupported type ${fieldDefinition.type}.`,
        );
      }
    }
    return {
      fieldDefinition,
      typeDefinition,
    };
  }

  private resolveMessage(
    loggingPrefix: string,
    collectionDefinition: FirestoreCollectionDefinition,
  ): MessageDefinition {
    let messageDefinition = this.definitionResolver.resolve(
      loggingPrefix,
      collectionDefinition.message,
      collectionDefinition.importMessage,
    );
    if (messageDefinition.kind !== "Message") {
      throw new Error(
        `${loggingPrefix} ${collectionDefinition.message} is not a message.`,
      );
    }
    return messageDefinition;
  }
}
