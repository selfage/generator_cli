import { Definition } from "./definition";
import { MockMessageResolver } from "./message_resolver_mock";
import { OutputContentBuilder } from "./output_content_builder";
import { generateSpannerDatabase } from "./spanner_database_generator";
import {
  assertThat,
  assertThrow,
  eq,
  eqError,
  eqLongStr,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SpannerDatabaseGeneratorTest",
  cases: [
    {
      name: "AllTypes",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {
          public resolve(
            loggingPrefix: string,
            typeName: string,
            importPath?: string,
          ): Definition {
            this.called += 1;
            switch (typeName) {
              case "User":
                assertThat(importPath, eq(undefined), "import path");
                return {
                  message: {
                    name: "User",
                    fields: [],
                  },
                };
              case "UserType":
                assertThat(importPath, eq(undefined), "import path");
                return {
                  enum: {
                    name: "UserType",
                    values: [],
                  },
                };
              default:
                throw new Error(`Unexpeced type ${typeName}`);
            }
          }
        })();

        // Execute
        generateSpannerDatabase(
          "./database/user",
          {
            name: "UserDatabase",
            tables: [
              {
                name: "TypesTable",
                columns: [
                  {
                    name: "id",
                    type: "string",
                  },
                  {
                    name: "stringValue",
                    type: "string",
                  },
                  {
                    name: "boolValue",
                    type: "bool",
                  },
                  {
                    name: "int64Value",
                    type: "int64",
                    nullable: true,
                  },
                  {
                    name: "float64Value",
                    type: "float64",
                  },
                  {
                    name: "timestampValue",
                    type: "timestamp",
                    allowCommitTimestamp: true,
                  },
                  {
                    name: "bytesValue",
                    type: "bytes",
                    nullable: true,
                  },
                  {
                    name: "stringArrayValue",
                    type: "string",
                    isArray: true,
                  },
                  {
                    name: "boolArrayValue",
                    type: "bool",
                    isArray: true,
                  },
                  {
                    name: "int64ArrayValue",
                    type: "int64",
                    nullable: true,
                    isArray: true,
                  },
                  {
                    name: "float64ArrayValue",
                    type: "float64",
                    isArray: true,
                  },
                  {
                    name: "timestampArrayValue",
                    type: "timestamp",
                    isArray: true,
                  },
                  {
                    name: "bytesArrayValue",
                    type: "bytes",
                    isArray: true,
                    nullable: true,
                  },
                  {
                    name: "user",
                    type: "User",
                  },
                  {
                    name: "userType",
                    type: "UserType",
                    nullable: true,
                  },
                  {
                    name: "userArray",
                    type: "User",
                    isArray: true,
                    nullable: true,
                  },
                  {
                    name: "userTypeArray",
                    type: "UserType",
                    isArray: true,
                  },
                ],
                primaryKeys: [
                  {
                    name: "id",
                    desc: true,
                  },
                  "stringValue",
                ],
                indexes: [
                  {
                    name: "Sort",
                    columns: ["stringValue", "int64Value"],
                  },
                  {
                    name: "Sort2",
                    columns: [
                      {
                        name: "float64Value",
                        desc: true,
                      },
                    ],
                    nullFiltered: true,
                    unique: true,
                  },
                ],
              },
            ],
            inserts: [
              {
                name: "InsertNewRow",
                table: "TypesTable",
                setColumns: [
                  "id",
                  "stringValue",
                  "boolValue",
                  "int64Value",
                  "float64Value",
                  "timestampValue",
                  "bytesValue",
                  "stringArrayValue",
                  "boolArrayValue",
                  "int64ArrayValue",
                  "float64ArrayValue",
                  "timestampArrayValue",
                  "bytesArrayValue",
                  "user",
                  "userType",
                  "userArray",
                  "userTypeArray",
                ],
              },
            ],
            updates: [
              {
                name: "UpdateARow",
                table: "TypesTable",
                setColumns: ["stringValue", "timestampValue"],
                where: {
                  op: "AND",
                  exps: [
                    {
                      op: "=",
                      leftColumn: "stringValue",
                    },
                    {
                      op: "OR",
                      exps: [
                        {
                          op: "AND",
                          exps: [
                            {
                              op: "OR",
                              exps: [
                                {
                                  op: ">=",
                                  leftColumn: "float64Value",
                                },
                                {
                                  op: "!=",
                                  leftColumn: "boolValue",
                                },
                              ],
                            },
                            {
                              op: "IS NULL",
                              leftColumn: "int64Value",
                            },
                          ],
                        },
                        {
                          op: ">",
                          leftColumn: "timestampValue",
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            deletes: [
              {
                name: "DeleteARow",
                table: "TypesTable",
                where: {
                  op: "AND",
                  exps: [
                    {
                      op: "=",
                      leftColumn: "id",
                    },
                    {
                      op: "=",
                      leftColumn: "stringValue",
                    },
                  ],
                },
              },
            ],
            selects: [
              {
                name: "SelectARow",
                table: "TypesTable",
                getColumns: [
                  "id",
                  "stringValue",
                  "boolValue",
                  "int64Value",
                  "float64Value",
                  "timestampValue",
                  "bytesValue",
                  "stringArrayValue",
                  "boolArrayValue",
                  "int64ArrayValue",
                  "float64ArrayValue",
                  "timestampArrayValue",
                  "bytesArrayValue",
                  "user",
                  "userType",
                  "userArray",
                  "userTypeArray",
                ],
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockMessageResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/schema_ddl").build(),
          eqLongStr(`{
  "tables": [{
    "name": "TypesTable",
    "columns": [{
      "name": "id",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN id STRING(MAX) NOT NULL"
    }, {
      "name": "stringValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN stringValue STRING(MAX) NOT NULL"
    }, {
      "name": "boolValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN boolValue BOOL NOT NULL"
    }, {
      "name": "int64Value",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN int64Value INT64"
    }, {
      "name": "float64Value",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN float64Value FLOAT64 NOT NULL"
    }, {
      "name": "timestampValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN timestampValue TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)"
    }, {
      "name": "bytesValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN bytesValue BYTES(MAX)"
    }, {
      "name": "stringArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN stringArrayValue Array<STRING(MAX)> NOT NULL"
    }, {
      "name": "boolArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN boolArrayValue Array<BOOL> NOT NULL"
    }, {
      "name": "int64ArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN int64ArrayValue Array<INT64>"
    }, {
      "name": "float64ArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN float64ArrayValue Array<FLOAT64> NOT NULL"
    }, {
      "name": "timestampArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN timestampArrayValue Array<TIMESTAMP> NOT NULL"
    }, {
      "name": "bytesArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN bytesArrayValue Array<BYTES(MAX)>"
    }, {
      "name": "user",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN user BYTES(MAX) NOT NULL"
    }, {
      "name": "userType",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN userType FLOAT64"
    }, {
      "name": "userArray",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN userArray Array<BYTES(MAX)>"
    }, {
      "name": "userTypeArray",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN userTypeArray Array<FLOAT64> NOT NULL"
    }],
    "createTableDdl": "CREATE TABLE TypesTable (id STRING(MAX) NOT NULL, stringValue STRING(MAX) NOT NULL, boolValue BOOL NOT NULL, int64Value INT64, float64Value FLOAT64 NOT NULL, timestampValue TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true), bytesValue BYTES(MAX), stringArrayValue Array<STRING(MAX)> NOT NULL, boolArrayValue Array<BOOL> NOT NULL, int64ArrayValue Array<INT64>, float64ArrayValue Array<FLOAT64> NOT NULL, timestampArrayValue Array<TIMESTAMP> NOT NULL, bytesArrayValue Array<BYTES(MAX)>, user BYTES(MAX) NOT NULL, userType FLOAT64, userArray Array<BYTES(MAX)>, userTypeArray Array<FLOAT64> NOT NULL) PRIMARY KEY (id DESC, stringValue ASC)",
    "indexes": [{
      "name": "Sort",
      "createIndexDdl": "CREATE INDEX Sort ON TypesTable(stringValue, int64Value)"
    }, {
      "name": "Sort2",
      "createIndexDdl": "CREATE INDEX UNIQUE NULL_FILTERED Sort2 ON TypesTable(float64Value DESC)"
    }]
  }]
}`),
          "ddl",
        );
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { User, USER, UserType, USER_TYPE } from './user';
import { deserializeMessage, toEnumFromNumber, serializeMessage } from '@selfage/message/serializer';
import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';
import { Spanner } from '@google-cloud/spanner';

export interface SelectARowRow {
  typesTableId: string,
  typesTableStringValue: string,
  typesTableBoolValue: boolean,
  typesTableInt64Value: bigint | undefined,
  typesTableFloat64Value: number,
  typesTableTimestampValue: number,
  typesTableBytesValue: Buffer | undefined,
  typesTableStringArrayValue: Array<string>,
  typesTableBoolArrayValue: Array<boolean>,
  typesTableInt64ArrayValue: Array<bigint> | undefined,
  typesTableFloat64ArrayValue: Array<number>,
  typesTableTimestampArrayValue: Array<number>,
  typesTableBytesArrayValue: Array<Buffer> | undefined,
  typesTableUser: User,
  typesTableUserType: UserType | undefined,
  typesTableUserArray: Array<User> | undefined,
  typesTableUserTypeArray: Array<UserType>,
}

export async function selectARow(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
): Promise<Array<SelectARowRow>> {
  let [rows] = await run({
    sql: "SELECT TypesTable.id, TypesTable.stringValue, TypesTable.boolValue, TypesTable.int64Value, TypesTable.float64Value, TypesTable.timestampValue, TypesTable.bytesValue, TypesTable.stringArrayValue, TypesTable.boolArrayValue, TypesTable.int64ArrayValue, TypesTable.float64ArrayValue, TypesTable.timestampArrayValue, TypesTable.bytesArrayValue, TypesTable.user, TypesTable.userType, TypesTable.userArray, TypesTable.userTypeArray FROM TypesTable",
    params: {
    },
    types: {
    }
  });
  let resRows = new Array<SelectARowRow>();
  for (let row of rows) {
    resRows.push({
      typesTableId: row.at(0).value,
      typesTableStringValue: row.at(1).value,
      typesTableBoolValue: row.at(2).value,
      typesTableInt64Value: row.at(3).value == null ? undefined : BigInt(row.at(3).value.value),
      typesTableFloat64Value: row.at(4).value.value,
      typesTableTimestampValue: row.at(5).value.valueOf(),
      typesTableBytesValue: row.at(6).value == null ? undefined : row.at(6).value,
      typesTableStringArrayValue: row.at(7).value,
      typesTableBoolArrayValue: row.at(8).value,
      typesTableInt64ArrayValue: row.at(9).value == null ? undefined : row.at(9).value.map((e) => BigInt(e.value.value)),
      typesTableFloat64ArrayValue: row.at(10).value.map((e) => e.value),
      typesTableTimestampArrayValue: row.at(11).value.map((e) => e.valueOf()),
      typesTableBytesArrayValue: row.at(12).value == null ? undefined : row.at(12).value,
      typesTableUser: deserializeMessage(row.at(13).value, USER),
      typesTableUserType: row.at(14).value == null ? undefined : toEnumFromNumber(row.at(14).value.value, USER_TYPE),
      typesTableUserArray: row.at(15).value == null ? undefined : row.at(15).value.map((e) => deserializeMessage(e, USER)),
      typesTableUserTypeArray: row.at(16).value.map((e) => toEnumFromNumber(e.value, USER_TYPE)),
    });
  }
  return resRows;
}

export async function insertNewRow(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  id: string,
  stringValue: string,
  boolValue: boolean,
  int64Value: bigint | null | undefined,
  float64Value: number,
  bytesValue: Buffer | null | undefined,
  stringArrayValue: Array<string>,
  boolArrayValue: Array<boolean>,
  int64ArrayValue: Array<bigint> | null | undefined,
  float64ArrayValue: Array<number>,
  timestampArrayValue: Array<number>,
  bytesArrayValue: Array<Buffer> | null | undefined,
  user: User,
  userType: UserType | null | undefined,
  userArray: Array<User> | null | undefined,
  userTypeArray: Array<UserType>,
): Promise<void> {
  await run({
    sql: "INSERT TypesTable (id, stringValue, boolValue, int64Value, float64Value, timestampValue, bytesValue, stringArrayValue, boolArrayValue, int64ArrayValue, float64ArrayValue, timestampArrayValue, bytesArrayValue, user, userType, userArray, userTypeArray) VALUES (@id, @stringValue, @boolValue, @int64Value, @float64Value, PENDING_COMMIT_TIMESTAMP(), @bytesValue, @stringArrayValue, @boolArrayValue, @int64ArrayValue, @float64ArrayValue, @timestampArrayValue, @bytesArrayValue, @user, @userType, @userArray, @userTypeArray)",
    params: {
      id: id,
      stringValue: stringValue,
      boolValue: boolValue,
      int64Value: int64Value == null ? null : int64Value.toString(),
      float64Value: Spanner.float(float64Value),
      bytesValue: bytesValue == null ? null : bytesValue,
      stringArrayValue: stringArrayValue,
      boolArrayValue: boolArrayValue,
      int64ArrayValue: int64ArrayValue == null ? null : int64ArrayValue.map((e) => e.toString()),
      float64ArrayValue: float64ArrayValue.map((e) => Spanner.float(e)),
      timestampArrayValue: timestampArrayValue.map((e) => new Date(e).toISOString()),
      bytesArrayValue: bytesArrayValue == null ? null : bytesArrayValue,
      user: Buffer.from(serializeMessage(user, USER).buffer),
      userType: userType == null ? null : Spanner.float(userType),
      userArray: userArray == null ? null : userArray.map((e) => Buffer.from(serializeMessage(e, USER).buffer)),
      userTypeArray: userTypeArray.map((e) => Spanner.float(e)),
    },
    types: {
      id: { type: "string" },
      stringValue: { type: "string" },
      boolValue: { type: "bool" },
      int64Value: { type: "int64" },
      float64Value: { type: "float64" },
      bytesValue: { type: "bytes" },
      stringArrayValue: { type: "array", child: { type: "string" } },
      boolArrayValue: { type: "array", child: { type: "bool" } },
      int64ArrayValue: { type: "array", child: { type: "int64" } },
      float64ArrayValue: { type: "array", child: { type: "float64" } },
      timestampArrayValue: { type: "array", child: { type: "timestamp" } },
      bytesArrayValue: { type: "array", child: { type: "bytes" } },
      user: { type: "bytes" },
      userType: { type: "float64" },
      userArray: { type: "array", child: { type: "bytes" } },
      userTypeArray: { type: "array", child: { type: "float64" } },
    }
  });
}

export async function updateARow(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setStringValue: string,
  typesTableStringValueEq: string,
  typesTableFloat64ValueGe: number,
  typesTableBoolValueNe: boolean,
  typesTableTimestampValueGt: number,
): Promise<void> {
  await run({
    sql: "UPDATE TypesTable SET stringValue = @setStringValue, timestampValue = PENDING_COMMIT_TIMESTAMP() WHERE (TypesTable.stringValue = @typesTableStringValueEq AND (((TypesTable.float64Value >= @typesTableFloat64ValueGe OR TypesTable.boolValue != @typesTableBoolValueNe) AND TypesTable.int64Value IS NULL) OR TypesTable.timestampValue > @typesTableTimestampValueGt))",
    params: {
      setStringValue: setStringValue,
      typesTableStringValueEq: typesTableStringValueEq,
      typesTableFloat64ValueGe: Spanner.float(typesTableFloat64ValueGe),
      typesTableBoolValueNe: typesTableBoolValueNe,
      typesTableTimestampValueGt: new Date(typesTableTimestampValueGt).toISOString(),
    },
    types: {
      setStringValue: { type: "string" },
      typesTableStringValueEq: { type: "string" },
      typesTableFloat64ValueGe: { type: "float64" },
      typesTableBoolValueNe: { type: "bool" },
      typesTableTimestampValueGt: { type: "timestamp" },
    }
  });
}

export async function deleteARow(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  typesTableIdEq: string,
  typesTableStringValueEq: string,
): Promise<void> {
  await run({
    sql: "DELETE TypesTable WHERE (TypesTable.id = @typesTableIdEq AND TypesTable.stringValue = @typesTableStringValueEq)",
    params: {
      typesTableIdEq: typesTableIdEq,
      typesTableStringValueEq: typesTableStringValueEq,
    },
    types: {
      typesTableIdEq: { type: "string" },
      typesTableStringValueEq: { type: "string" },
    }
  });
}
`),
          "sql",
        );
      },
    },
    {
      name: "StringWithAllowCommitTimestamp",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "TypesTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "stringValue",
                      type: "string",
                      allowCommitTimestamp: true,
                    },
                  ],
                  primaryKeys: ["id"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "is not timestamp and cannot set allowCommitTimestamp to true",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "ArrayWithAllowCommitTimestamp",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "TypesTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "timestampValue",
                      type: "timestamp",
                      isArray: true,
                      allowCommitTimestamp: true,
                    },
                  ],
                  primaryKeys: ["id"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "is an array and cannot set allowCommitTimestamp to true",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "ArrayAsPrimaryKey",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "TypesTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "strings",
                      type: "string",
                      isArray: true,
                    },
                  ],
                  primaryKeys: ["id", "strings"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("is an array and cannot be used as a primary key")),
          "error",
        );
      },
    },
    {
      name: "PrimaryKeyNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "TypesTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["id", "something"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("when generating primary keys,")),
          "error",
        );
      },
    },
    {
      name: "IndexedColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "TypesTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                  ],
                  primaryKeys: [
                    {
                      name: "id",
                      desc: true,
                    },
                  ],
                  indexes: [
                    {
                      name: "Sort1",
                      columns: ["id2"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("when generating indexes,")),
          "error",
        );
      },
    },
    {
      name: "InterleavedTable",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        generateSpannerDatabase(
          "./database/user",
          {
            name: "UserDatabase",
            tables: [
              {
                name: "ParentTable",
                columns: [
                  {
                    name: "pid",
                    type: "string",
                  },
                ],
                primaryKeys: ["pid"],
              },
              {
                name: "ChildTable",
                columns: [
                  {
                    name: "pid",
                    type: "string",
                  },
                  {
                    name: "cid",
                    type: "string",
                  },
                ],
                primaryKeys: ["pid", "cid"],
                interleave: {
                  parentTable: "ParentTable",
                  cascadeOnDelete: true,
                },
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockMessageResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/schema_ddl").build(),
          eqLongStr(`{
  "tables": [{
    "name": "ParentTable",
    "columns": [{
      "name": "pid",
      "addColumnDdl": "ALTER TABLE ParentTable ADD COLUMN pid STRING(MAX) NOT NULL"
    }],
    "createTableDdl": "CREATE TABLE ParentTable (pid STRING(MAX) NOT NULL) PRIMARY KEY (pid ASC)",
    "indexes": []
  }, {
    "name": "ChildTable",
    "columns": [{
      "name": "pid",
      "addColumnDdl": "ALTER TABLE ChildTable ADD COLUMN pid STRING(MAX) NOT NULL"
    }, {
      "name": "cid",
      "addColumnDdl": "ALTER TABLE ChildTable ADD COLUMN cid STRING(MAX) NOT NULL"
    }],
    "createTableDdl": "CREATE TABLE ChildTable (pid STRING(MAX) NOT NULL, cid STRING(MAX) NOT NULL) PRIMARY KEY (pid ASC, cid ASC), INTERLEAVE IN PARENT ParentTable ON DELETE CASCADE",
    "indexes": []
  }]
}`),
          "ddl",
        );
      },
    },
    {
      name: "ParentTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "ParentTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                },
                {
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                    {
                      name: "cid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid", "cid"],
                  interleave: {
                    parentTable: "SomeTable",
                    cascadeOnDelete: true,
                  },
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "the parent table SomeTable is not found in the database.",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "PrimaryKeysSameLength",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "ParentTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                },
                {
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                    {
                      name: "cid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                  interleave: {
                    parentTable: "ParentTable",
                    cascadeOnDelete: true,
                  },
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error("the child table should be more than the parent table"),
          ),
          "error",
        );
      },
    },
    {
      name: "PrimaryKeyNameDoesNotMatch",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "ParentTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                },
                {
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                    {
                      name: "cid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["cid", "pid"],
                  interleave: {
                    parentTable: "ParentTable",
                    cascadeOnDelete: true,
                  },
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              `pimary key "cid" doesn't match the key "pid" of the parent table.`,
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "PrimaryKeyDescDoesNotMatch",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "ParentTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                },
                {
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                    {
                      name: "cid",
                      type: "string",
                    },
                  ],
                  primaryKeys: [
                    {
                      name: "pid",
                      desc: true,
                    },
                    "cid",
                  ],
                  interleave: {
                    parentTable: "ParentTable",
                    cascadeOnDelete: true,
                  },
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error(`pimary key "pid" is DESC which doesn't match`)),
          "error",
        );
      },
    },
    {
      name: "PrimaryKeyTypeDoesNotMatch",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "ParentTable",
                  columns: [
                    {
                      name: "pid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid"],
                },
                {
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "int64",
                    },
                    {
                      name: "cid",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["pid", "cid"],
                  interleave: {
                    parentTable: "ParentTable",
                    cascadeOnDelete: true,
                  },
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              `primary key pid's type "int64" doesn't match the type "string"`,
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "ComplexSelect",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        generateSpannerDatabase(
          "./database/user",
          {
            name: "UserDatabase",
            tables: [
              {
                name: "T1Table",
                columns: [
                  {
                    name: "f1",
                    type: "string",
                  },
                  {
                    name: "f2",
                    type: "string",
                  },
                ],
                primaryKeys: ["f1"],
              },
              {
                name: "T2Table",
                columns: [
                  {
                    name: "f1",
                    type: "string",
                  },
                  {
                    name: "f2",
                    type: "string",
                  },
                ],
                primaryKeys: ["f1"],
              },
              {
                name: "T3Table",
                columns: [
                  {
                    name: "f1",
                    type: "string",
                  },
                  {
                    name: "f2",
                    type: "string",
                  },
                ],
                primaryKeys: ["f1"],
              },
            ],
            selects: [
              {
                name: "S1",
                table: {
                  name: "T1Table",
                  as: "t1",
                },
                join: [
                  {
                    type: "INNER",
                    table: "T2Table",
                    on: {
                      leftColumn: {
                        name: "f1",
                        table: "t1",
                      },
                      op: "=",
                      rightColumn: "f1",
                    },
                  },
                  {
                    type: "CROSS",
                    table: {
                      name: "T3Table",
                      as: "t3",
                    },
                    on: {
                      op: "AND",
                      exps: [
                        {
                          op: "OR",
                          exps: [
                            {
                              op: "=",
                              leftColumn: { name: "f1", table: "T2Table" },
                              rightColumn: "f1",
                            },
                            {
                              op: "!=",
                              leftColumn: { name: "f1", table: "t1" },
                              rightColumn: "f1",
                            },
                          ],
                        },
                        {
                          op: "OR",
                          exps: [
                            {
                              op: "=",
                              leftColumn: { name: "f2", table: "T2Table" },
                              rightColumn: "f2",
                            },
                            {
                              op: "!=",
                              leftColumn: { name: "f2", table: "t1" },
                              rightColumn: "f2",
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
                where: {
                  op: "AND",
                  exps: [
                    {
                      op: "=",
                      leftColumn: "f2",
                    },
                    {
                      op: "=",
                      leftColumn: {
                        name: "f1",
                        table: "t3",
                      },
                    },
                    {
                      op: "!=",
                      leftColumn: {
                        name: "f2",
                        table: "T2Table",
                      },
                    },
                  ],
                },
                orderBy: [
                  "f2",
                  {
                    column: "f1",
                  },
                  {
                    column: {
                      name: "f2",
                      table: "T2Table",
                    },
                    desc: true,
                  },
                  {
                    column: {
                      name: "f1",
                      table: "t3",
                    },
                  },
                ],
                limit: 2,
                getColumns: [
                  "f1",
                  {
                    name: "f2",
                    table: "t1",
                  },
                  {
                    name: "f2",
                    table: "T2Table",
                  },
                  {
                    name: "f2",
                    table: "t3",
                  },
                ],
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockMessageResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';

export interface S1Row {
  t1F1: string,
  t1F2: string,
  t2TableF2: string,
  t3F2: string,
}

export async function s1(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  t1F2Eq: string,
  t3F1Eq: string,
  t2TableF2Ne: string,
): Promise<Array<S1Row>> {
  let [rows] = await run({
    sql: "SELECT t1.f1, t1.f2, T2Table.f2, t3.f2 FROM T1Table AS t1 INNER JOIN T2Table ON t1.f1 = T2Table.f1 CROSS JOIN T3Table AS t3 ON ((T2Table.f1 = t3.f1 OR t1.f1 != t3.f1) AND (T2Table.f2 = t3.f2 OR t1.f2 != t3.f2)) WHERE (t1.f2 = @t1F2Eq AND t3.f1 = @t3F1Eq AND T2Table.f2 != @t2TableF2Ne) ORDER BY t1.f2, t1.f1, T2Table.f2 DESC, t3.f1 LIMIT 2",
    params: {
      t1F2Eq: t1F2Eq,
      t3F1Eq: t3F1Eq,
      t2TableF2Ne: t2TableF2Ne,
    },
    types: {
      t1F2Eq: { type: "string" },
      t3F1Eq: { type: "string" },
      t2TableF2Ne: { type: "string" },
    }
  });
  let resRows = new Array<S1Row>();
  for (let row of rows) {
    resRows.push({
      t1F1: row.at(0).value,
      t1F2: row.at(1).value,
      t2TableF2: row.at(2).value,
      t3F2: row.at(3).value,
    });
  }
  return resRows;
}
`),
          "sql",
        );
      },
    },
    {
      name: "SelectFromTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T2Table",
                    as: "T1Table",
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("table T2Table is not found")),
          "error",
        );
      },
    },
    {
      name: "SelectJoinTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      table: {
                        name: "T2Table",
                        as: "t2",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("table T2Table is not found")),
          "error",
        );
      },
    },
    {
      name: "SelectJoinOnLeftColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
                {
                  name: "T2Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      table: {
                        name: "T2Table",
                        as: "t2",
                      },
                      on: {
                        op: "=",
                        leftColumn: {
                          name: "f3",
                          table: "T1Table",
                        },
                        rightColumn: "f1",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when joining T2Table, column f3 is not found in the table T1Table",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectJoinOnRightColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
                {
                  name: "T2Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      table: {
                        name: "T2Table",
                        as: "t2",
                      },
                      on: {
                        op: "=",
                        leftColumn: {
                          name: "f1",
                          table: "T1Table",
                        },
                        rightColumn: "f3",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when joining T2Table, column f3 is not found in the table T2Table",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectJoinOnColumnTypeNotMatch",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
                {
                  name: "T2Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "int64",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      table: {
                        name: "T2Table",
                        as: "t2",
                      },
                      on: {
                        op: "=",
                        leftColumn: {
                          name: "f2",
                          table: "T1Table",
                        },
                        rightColumn: "f2",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when joining T2Table, the left column T1Table.f2 whose type is string doesn't match the right column t2.f2 whose type is int64.",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectJoinOnColumnTypeInequal",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
                {
                  name: "T2Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      table: {
                        name: "T2Table",
                        as: "t2",
                      },
                      on: {
                        op: ">",
                        leftColumn: {
                          name: "f2",
                          table: "T1Table",
                        },
                        rightColumn: "f2",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when joining T2Table, operator > cannot be used to compare the left column T1Table.f2 and the right column t2.f2.",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectWhereTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  where: {
                    op: "=",
                    leftColumn: {
                      name: "f1",
                      table: "t2",
                    },
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating where clause, t2.f1 refers to a table not found",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectWhereColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  where: {
                    op: "=",
                    leftColumn: {
                      name: "f3",
                      table: "t1",
                    },
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating where clause, column f3 is not found in the table T1Table.",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectWhereColumnNotNullable",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  where: {
                    op: "IS NULL",
                    leftColumn: {
                      name: "f1",
                      table: "t1",
                    },
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating where clause, column t1.f1 is not nullable",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectWhereColumnNotNullable2",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  where: {
                    op: "IS NOT NULL",
                    leftColumn: {
                      name: "f1",
                      table: "t1",
                    },
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating where clause, column t1.f1 is not nullable",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectWhereColumnInequal",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  where: {
                    op: ">=",
                    leftColumn: {
                      name: "f1",
                      table: "t1",
                    },
                  },
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating where clause, operator >= cannot be used on the column t1.f1",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectOrderByTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  orderBy: [
                    {
                      column: {
                        name: "f1",
                        table: "t2",
                      },
                    },
                  ],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating order by clause, t2.f1 refers to a table not found",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectOrderByColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  orderBy: ["f3"],
                  getColumns: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating order by clause, column f3 is not found in the table T1Table",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  getColumns: ["f3"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating select columns, column f3 is not found in the table T1Table",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SelectTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              name: "UserDatabase",
              tables: [
                {
                  name: "T1Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "string",
                    },
                  ],
                  primaryKeys: ["f1"],
                },
              ],
              selects: [
                {
                  name: "S1",
                  table: {
                    name: "T1Table",
                    as: "t1",
                  },
                  getColumns: [
                    {
                      name: "f3",
                      table: "t2",
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockMessageResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when generating select columns, t2.f3 refers to a table not found",
            ),
          ),
          "error",
        );
      },
    },
  ],
});
