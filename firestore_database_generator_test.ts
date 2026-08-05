import { Definition, FirestoreDatabaseDefinition } from "./definition";
import { MockDefinitionResolver } from "./definition_resolver_mock";
import { FirestoreDatabaseGenerator } from "./firestore_database_generator";
import { OutputContentBuilder } from "./output_content_builder";
import {
  assertThat,
  assertThrow,
  eqError,
  eqLongStr,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

function newDefinitionResolver(): MockDefinitionResolver {
  return new (class extends MockDefinitionResolver {
    public resolve(
      loggingPrefix: string,
      name: string,
      importPath?: string,
    ): Definition {
      this.called += 1;
      if (name === "RecordDetails") {
        return {
          kind: "Message",
          name: "RecordDetails",
          fields: [
            {
              name: "category",
              type: "string",
              index: 1,
            },
          ],
        };
      }
      if (name === "RecordStatus") {
        return {
          kind: "Enum",
          name: "RecordStatus",
          values: [
            {
              name: "ACTIVE",
              value: 1,
            },
          ],
        };
      }
      if (name === "Record") {
        return {
          kind: "Message",
          name: "Record",
          fields: [
            {
              name: "ownerId",
              type: "string",
              index: 1,
            },
            {
              name: "recordId",
              type: "string",
              index: 2,
            },
            {
              name: "score",
              type: "number",
              index: 3,
            },
            {
              name: "labels",
              type: "string",
              isArray: true,
              index: 4,
            },
            {
              name: "details",
              type: "RecordDetails",
              index: 5,
            },
            {
              name: "active",
              type: "boolean",
              index: 6,
            },
            {
              name: "status",
              type: "RecordStatus",
              index: 7,
            },
          ],
        };
      }
      if (name === "WorkingTask") {
        return {
          kind: "Message",
          name: "WorkingTask",
          fields: [
            {
              name: "taskId",
              type: "string",
              index: 1,
            },
            {
              name: "payload",
              type: "string",
              index: 2,
            },
            {
              name: "retryCount",
              type: "number",
              index: 3,
            },
            {
              name: "executionTime",
              type: "number",
              index: 4,
            },
            {
              name: "createdTime",
              type: "number",
              index: 5,
            },
          ],
        };
      }
      throw new Error(`${loggingPrefix} unexpected definition ${name}.`);
    }
  })();
}

function newTaskDatabaseDefinition(): FirestoreDatabaseDefinition {
  return {
    kind: "FirestoreDatabase",
    name: "TaskDatabase",
    collections: [
      {
        kind: "TaskCollection",
        name: "WorkingTaskCollection",
        collectionName: "workingTasks",
        message: "WorkingTask",
        importMessage: "./tasks",
        primaryKeys: ["taskId"],
        retryCountField: "retryCount",
        executionTimeField: "executionTime",
        createdTimeField: "createdTime",
        insert: "InsertWorkingTask",
        update: "UpdateWorkingTask",
        get: "GetWorkingTask",
        delete: "DeleteWorkingTask",
        listPendingTasks: "ListPendingWorkingTasks",
      },
    ],
    outputQueries: "./queries",
    outputIndexes: "./indexes",
  };
}

function newDatabaseDefinition(): FirestoreDatabaseDefinition {
  return {
    kind: "FirestoreDatabase",
    name: "RecordDatabase",
    collections: [
      {
        name: "RecordCollection",
        collectionName: "records",
        message: "Record",
        importMessage: "./records",
        primaryKeys: ["ownerId", "recordId"],
        indexes: [
          {
            name: "LabelsIndex",
            fields: [
              {
                name: "labels",
                mode: "CONTAINS",
              },
            ],
          },
          {
            name: "StatusScoreIndex",
            fields: [
              {
                name: "status",
                mode: "ASC",
              },
              {
                name: "score",
                mode: "DESC",
              },
            ],
          },
        ],
        queries: [
          {
            name: "ListRecords",
          },
          {
            name: "ListRecordsByOwner",
            where: {
              field: "ownerId",
              op: "==",
            },
          },
          {
            name: "ListRecordsByDifferentStatus",
            where: {
              field: "status",
              op: "!=",
            },
          },
          {
            name: "ListRecordsBelowScore",
            where: {
              field: "score",
              op: "<",
            },
          },
          {
            name: "ListRecordsAtMostScore",
            where: {
              field: "score",
              op: "<=",
            },
          },
          {
            name: "ListRecordsAboveScore",
            where: {
              field: "score",
              op: ">",
            },
          },
          {
            name: "ListRecordsAtLeastScore",
            where: {
              field: "score",
              op: ">=",
              rVar: "minimumScore",
            },
          },
          {
            name: "ListRecordsContainingLabel",
            where: {
              field: "labels",
              op: "array-contains",
            },
          },
          {
            name: "ListRecordsContainingAnyLabel",
            where: {
              field: "labels",
              op: "array-contains-any",
            },
          },
          {
            name: "ListRecordsInLabelSets",
            where: {
              field: "labels",
              op: "in",
            },
          },
          {
            name: "ListRecordsInStatuses",
            where: {
              field: "status",
              op: "in",
            },
          },
          {
            name: "ListRecordsOutsideOwners",
            where: {
              field: "ownerId",
              op: "not-in",
            },
          },
          {
            name: "ListActiveRecords",
            where: {
              field: "active",
              op: "==",
            },
          },
          {
            name: "ListRecordsByNestedFilters",
            where: {
              op: "AND",
              exprs: [
                {
                  field: "ownerId",
                  op: "==",
                },
                {
                  op: "OR",
                  exprs: [
                    {
                      field: "score",
                      op: ">",
                    },
                    {
                      field: "score",
                      op: "<=",
                    },
                  ],
                },
                {
                  field: "active",
                  op: "==",
                },
              ],
            },
            orderBy: [
              {
                field: "score",
              },
              {
                field: "__name__",
                desc: true,
              },
            ],
            withLimit: true,
          },
        ],
        insert: "InsertRecord",
        upsert: "UpsertRecord",
        update: "UpdateRecord",
        get: "GetRecord",
        delete: "DeleteRecord",
      },
    ],
    outputQueries: "./queries",
    outputIndexes: "./indexes",
  };
}

TEST_RUNNER.run({
  name: "FirestoreDatabaseGeneratorTest",
  cases: [
    {
      name: "GenerateOperationsAllQueryVariantsAndIndexes",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        new FirestoreDatabaseGenerator(
          "./definitions",
          newDatabaseDefinition(),
          newDefinitionResolver(),
          outputContentMap,
        ).generate();

        // Verify
        assertThat(
          outputContentMap.get("./queries").build(),
          eqLongStr(`import { Record, RECORD, RecordStatus } from './records';
import { Firestore, Transaction, Query, Filter, FieldPath } from '@google-cloud/firestore';
import { parseMessage } from '@selfage/message/parser';

export function insertRecord(
  firestore: Firestore,
  transaction: Transaction,
  message: Record,
): void {
  if (message.ownerId == null) {
    throw new Error("Firestore primary key field ownerId is required.");
  }
  if (message.recordId == null) {
    throw new Error("Firestore primary key field recordId is required.");
  }
  transaction.create(firestore.doc(["records", message.ownerId + message.recordId].join("/")), message);
}

export function upsertRecord(
  firestore: Firestore,
  transaction: Transaction,
  message: Record,
): void {
  if (message.ownerId == null) {
    throw new Error("Firestore primary key field ownerId is required.");
  }
  if (message.recordId == null) {
    throw new Error("Firestore primary key field recordId is required.");
  }
  transaction.set(firestore.doc(["records", message.ownerId + message.recordId].join("/")), message);
}

export function updateRecord(
  firestore: Firestore,
  transaction: Transaction,
  message: Record,
): void {
  if (message.ownerId == null) {
    throw new Error("Firestore primary key field ownerId is required.");
  }
  if (message.recordId == null) {
    throw new Error("Firestore primary key field recordId is required.");
  }
  transaction.update(firestore.doc(["records", message.ownerId + message.recordId].join("/")), message);
}

export async function getRecord(
  firestore: Firestore,
  args: {
    ownerId: string,
    recordId: string,
  },
  transaction?: Transaction,
): Promise<Record | undefined> {
  let document = firestore.doc(["records", args.ownerId + args.recordId].join("/"));
  let snapshot = transaction
    ? await transaction.get(document)
    : await document.get();
  if (!snapshot.exists) {
    return undefined;
  }
  return parseMessage(snapshot.data(), RECORD);
}

export function deleteRecord(
  firestore: Firestore,
  transaction: Transaction,
  args: {
    ownerId: string,
    recordId: string,
  },
): void {
  transaction.delete(firestore.doc(["records", args.ownerId + args.recordId].join("/")));
}

export async function listRecords(
  firestore: Firestore,
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsByOwner(
  firestore: Firestore,
  args: {
    ownerIdEq: string,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("ownerId", "==", args.ownerIdEq));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsByDifferentStatus(
  firestore: Firestore,
  args: {
    statusNe: RecordStatus,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("status", "!=", args.statusNe));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsBelowScore(
  firestore: Firestore,
  args: {
    scoreLt: number,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("score", "<", args.scoreLt));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsAtMostScore(
  firestore: Firestore,
  args: {
    scoreLe: number,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("score", "<=", args.scoreLe));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsAboveScore(
  firestore: Firestore,
  args: {
    scoreGt: number,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("score", ">", args.scoreGt));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsAtLeastScore(
  firestore: Firestore,
  args: {
    minimumScore: number,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("score", ">=", args.minimumScore));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsContainingLabel(
  firestore: Firestore,
  args: {
    labelsArrayContains: string,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("labels", "array-contains", args.labelsArrayContains));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsContainingAnyLabel(
  firestore: Firestore,
  args: {
    labelsArrayContainsAny: Array<string>,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("labels", "array-contains-any", args.labelsArrayContainsAny));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsInLabelSets(
  firestore: Firestore,
  args: {
    labelsIn: Array<Array<string>>,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("labels", "in", args.labelsIn));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsInStatuses(
  firestore: Firestore,
  args: {
    statusIn: Array<RecordStatus>,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("status", "in", args.statusIn));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsOutsideOwners(
  firestore: Firestore,
  args: {
    ownerIdNotIn: Array<string>,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("ownerId", "not-in", args.ownerIdNotIn));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listActiveRecords(
  firestore: Firestore,
  args: {
    activeEq: boolean,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.where("active", "==", args.activeEq));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}

export async function listRecordsByNestedFilters(
  firestore: Firestore,
  args: {
    ownerIdEq: string,
    scoreGt: number,
    scoreLe: number,
    activeEq: boolean,
    limit: number,
  },
  transaction?: Transaction,
): Promise<Array<Record>> {
  let query: Query = firestore.collection("records");
  query = query.where(Filter.and(Filter.where("ownerId", "==", args.ownerIdEq), Filter.or(Filter.where("score", ">", args.scoreGt), Filter.where("score", "<=", args.scoreLe)), Filter.where("active", "==", args.activeEq)));
  query = query.orderBy("score", "asc");
  query = query.orderBy(FieldPath.documentId(), "desc");
  query = query.limit(args.limit);
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), RECORD));
}
`),
          "queries output",
        );
        assertThat(
          outputContentMap.get("./indexes").build(),
          eqLongStr(`{
  "indexes": [
    {
      "collectionGroup": "records",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "score",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "records",
      "fieldPath": "*",
      "indexes": []
    },
    {
      "collectionGroup": "records",
      "fieldPath": "labels",
      "indexes": [
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
`),
          "indexes output",
        );
      },
    },
    {
      name: "RejectNonStringPrimaryKey",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "number",
                  index: 1,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("must be a non-array string")),
          "error",
        );
      },
    },
    {
      name: "RejectDuplicateIndexName",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  indexes: [
                    {
                      name: "LabelsIndex",
                      fields: [
                        {
                          name: "id",
                          mode: "ASC",
                        },
                      ],
                    },
                    {
                      name: "LabelsIndex",
                      fields: [],
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("index name LabelsIndex is duplicated")),
          "error",
        );
      },
    },
    {
      name: "RejectNestedIndexField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  indexes: [
                    {
                      name: "NestedDetailsIndex",
                      fields: [
                        {
                          name: "details.category",
                          mode: "ASC",
                        },
                      ],
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "within NestedDetailsIndex, field details.category must be a top-level camelCase field",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectNestedQueryField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  queries: [
                    {
                      name: "ListRecords",
                      where: {
                        field: "details.category",
                        op: "==",
                      },
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("must be a top-level camelCase field")),
          "error",
        );
      },
    },
    {
      name: "RejectDocumentNameQueryField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  queries: [
                    {
                      name: "ListRecords",
                      where: {
                        field: "__name__",
                        op: "==",
                      },
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("must be a top-level camelCase field")),
          "error",
        );
      },
    },
    {
      name: "RejectMessageIndexField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(_loggingPrefix: string, name: string): Definition {
            if (name === "Record") {
              return {
                kind: "Message",
                name: "Record",
                fields: [
                  {
                    name: "id",
                    type: "string",
                    index: 1,
                  },
                  {
                    name: "details",
                    type: "RecordDetails",
                    index: 2,
                  },
                ],
              };
            }
            return {
              kind: "Message",
              name: "RecordDetails",
              fields: [],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  indexes: [
                    {
                      name: "DetailsIndex",
                      fields: [
                        {
                          name: "details",
                          mode: "ASC",
                        },
                      ],
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "within DetailsIndex, field details cannot be indexed or queried because it has message type RecordDetails",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectMessageFilterField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(_loggingPrefix: string, name: string): Definition {
            if (name === "Record") {
              return {
                kind: "Message",
                name: "Record",
                fields: [
                  {
                    name: "id",
                    type: "string",
                    index: 1,
                  },
                  {
                    name: "details",
                    type: "RecordDetails",
                    index: 2,
                  },
                ],
              };
            }
            return {
              kind: "Message",
              name: "RecordDetails",
              fields: [],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  queries: [
                    {
                      name: "ListRecords",
                      where: {
                        field: "details",
                        op: "==",
                      },
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "field details cannot be indexed or queried because it has message type RecordDetails",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectMessageOrderByField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(_loggingPrefix: string, name: string): Definition {
            if (name === "Record") {
              return {
                kind: "Message",
                name: "Record",
                fields: [
                  {
                    name: "id",
                    type: "string",
                    index: 1,
                  },
                  {
                    name: "details",
                    type: "RecordDetails",
                    index: 2,
                  },
                ],
              };
            }
            return {
              kind: "Message",
              name: "RecordDetails",
              fields: [],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  queries: [
                    {
                      name: "ListRecords",
                      orderBy: [
                        {
                          field: "details",
                        },
                      ],
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "field details cannot be indexed or queried because it has message type RecordDetails",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectContainsIndexOnScalarField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
                {
                  name: "score",
                  type: "number",
                  index: 2,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  indexes: [
                    {
                      name: "ScoreContainsIndex",
                      fields: [
                        {
                          name: "score",
                          mode: "CONTAINS",
                        },
                      ],
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("must be an array to use CONTAINS")),
          "error",
        );
      },
    },
    {
      name: "RejectArrayOperatorOnScalarField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "Record",
              fields: [
                {
                  name: "id",
                  type: "string",
                  index: 1,
                },
                {
                  name: "score",
                  type: "number",
                  index: 2,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "RecordDatabase",
              collections: [
                {
                  name: "RecordCollection",
                  collectionName: "records",
                  message: "Record",
                  primaryKeys: ["id"],
                  queries: [
                    {
                      name: "ListRecords",
                      where: {
                        field: "score",
                        op: "array-contains",
                      },
                    },
                  ],
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("must be an array")),
          "error",
        );
      },
    },
    {
      name: "GenerateTaskCollection",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        new FirestoreDatabaseGenerator(
          "./definitions",
          newTaskDatabaseDefinition(),
          newDefinitionResolver(),
          outputContentMap,
        ).generate();

        // Verify
        assertThat(
          outputContentMap.get("./queries").build(),
          eqLongStr(`import { WorkingTask, WORKING_TASK } from './tasks';
import { Firestore, Transaction, Query, Filter } from '@google-cloud/firestore';
import { parseMessage } from '@selfage/message/parser';

export function insertWorkingTask(
  firestore: Firestore,
  transaction: Transaction,
  message: WorkingTask,
): void {
  if (message.taskId == null) {
    throw new Error("Firestore primary key field taskId is required.");
  }
  transaction.create(firestore.doc(["workingTasks", message.taskId].join("/")), message);
}

export function updateWorkingTask(
  firestore: Firestore,
  transaction: Transaction,
  message: WorkingTask,
): void {
  if (message.taskId == null) {
    throw new Error("Firestore primary key field taskId is required.");
  }
  transaction.update(firestore.doc(["workingTasks", message.taskId].join("/")), message);
}

export async function getWorkingTask(
  firestore: Firestore,
  args: {
    taskId: string,
  },
  transaction?: Transaction,
): Promise<WorkingTask | undefined> {
  let document = firestore.doc(["workingTasks", args.taskId].join("/"));
  let snapshot = transaction
    ? await transaction.get(document)
    : await document.get();
  if (!snapshot.exists) {
    return undefined;
  }
  return parseMessage(snapshot.data(), WORKING_TASK);
}

export function deleteWorkingTask(
  firestore: Firestore,
  transaction: Transaction,
  args: {
    taskId: string,
  },
): void {
  transaction.delete(firestore.doc(["workingTasks", args.taskId].join("/")));
}

export async function listPendingWorkingTasks(
  firestore: Firestore,
  args: {
    executionTimeLe: number,
  },
  transaction?: Transaction,
): Promise<Array<WorkingTask>> {
  let query: Query = firestore.collection("workingTasks");
  query = query.where(Filter.where("executionTime", "<=", args.executionTimeLe));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), WORKING_TASK));
}
`),
          "queries output",
        );
        assertThat(
          outputContentMap.get("./indexes").build(),
          eqLongStr(`{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "workingTasks",
      "fieldPath": "*",
      "indexes": []
    },
    {
      "collectionGroup": "workingTasks",
      "fieldPath": "executionTime",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
`),
          "indexes output",
        );
      },
    },
    {
      name: "RejectInvalidTaskRetryCountField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "WorkingTask",
              fields: [
                {
                  name: "taskId",
                  type: "string",
                  index: 1,
                },
                {
                  name: "retryCount",
                  type: "string",
                  index: 2,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "TaskDatabase",
              collections: [
                {
                  kind: "TaskCollection",
                  name: "WorkingTaskCollection",
                  collectionName: "workingTasks",
                  message: "WorkingTask",
                  primaryKeys: ["taskId"],
                  retryCountField: "retryCount",
                  executionTimeField: "",
                  createdTimeField: "",
                  listPendingTasks: "",
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "retryCountField retryCount must be a non-array number field",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectInvalidTaskExecutionTimeField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "WorkingTask",
              fields: [
                {
                  name: "taskId",
                  type: "string",
                  index: 1,
                },
                {
                  name: "retryCount",
                  type: "number",
                  index: 2,
                },
                {
                  name: "executionTime",
                  type: "number",
                  isArray: true,
                  index: 3,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "TaskDatabase",
              collections: [
                {
                  kind: "TaskCollection",
                  name: "WorkingTaskCollection",
                  collectionName: "workingTasks",
                  message: "WorkingTask",
                  primaryKeys: ["taskId"],
                  retryCountField: "retryCount",
                  executionTimeField: "executionTime",
                  createdTimeField: "",
                  listPendingTasks: "",
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "executionTimeField executionTime must be a non-array number field",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "RejectInvalidTaskCreatedTimeField",
      execute: () => {
        // Prepare
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(): Definition {
            return {
              kind: "Message",
              name: "WorkingTask",
              fields: [
                {
                  name: "taskId",
                  type: "string",
                  index: 1,
                },
                {
                  name: "retryCount",
                  type: "number",
                  index: 2,
                },
                {
                  name: "executionTime",
                  type: "number",
                  index: 3,
                },
                {
                  name: "createdTime",
                  type: "boolean",
                  index: 4,
                },
              ],
            };
          }
        })();

        // Execute
        let error = assertThrow(() =>
          new FirestoreDatabaseGenerator(
            "./definitions",
            {
              kind: "FirestoreDatabase",
              name: "TaskDatabase",
              collections: [
                {
                  kind: "TaskCollection",
                  name: "WorkingTaskCollection",
                  collectionName: "workingTasks",
                  message: "WorkingTask",
                  primaryKeys: ["taskId"],
                  retryCountField: "retryCount",
                  executionTimeField: "executionTime",
                  createdTimeField: "createdTime",
                  listPendingTasks: "",
                },
              ],
              outputQueries: "./queries",
              outputIndexes: "./indexes",
            },
            mockDefinitionResolver,
            new Map<string, OutputContentBuilder>(),
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "createdTimeField createdTime must be a non-array number field",
            ),
          ),
          "error",
        );
      },
    },
  ],
});
