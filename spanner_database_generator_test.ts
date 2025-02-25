import { Definition } from "./definition";
import { MockDefinitionResolver } from "./definition_resolver_mock";
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
      name: "AllDataTypes",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
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
                  kind: "Message",
                  name: "User",
                  fields: [],
                };
              case "UserType":
                assertThat(importPath, eq(undefined), "import path");
                return {
                  kind: "Enum",
                  name: "UserType",
                  values: [],
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
            kind: "SpannerDatabase",
            name: "UserDatabase",
            tables: [
              {
                kind: "Table",
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
                    name: "float64Value",
                    type: "float64",
                    nullable: true,
                  },
                  {
                    name: "timestampValue",
                    type: "timestamp",
                    allowCommitTimestamp: true,
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
                    name: "float64ArrayValue",
                    type: "float64",
                    nullable: true,
                    isArray: true,
                  },
                  {
                    name: "timestampArrayValue",
                    type: "timestamp",
                    isArray: true,
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
                    columns: ["stringValue", "float64Value"],
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
                  "float64Value",
                  "timestampValue",
                  "stringArrayValue",
                  "boolArrayValue",
                  "float64ArrayValue",
                  "timestampArrayValue",
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
                      op: "IS NULL",
                      leftColumn: "float64Value",
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
                  "float64Value",
                  "timestampValue",
                  "stringArrayValue",
                  "boolArrayValue",
                  "float64ArrayValue",
                  "timestampArrayValue",
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
          mockDefinitionResolver,
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
      "name": "float64Value",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN float64Value FLOAT64"
    }, {
      "name": "timestampValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN timestampValue TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)"
    }, {
      "name": "stringArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN stringArrayValue Array<STRING(MAX)> NOT NULL"
    }, {
      "name": "boolArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN boolArrayValue Array<BOOL> NOT NULL"
    }, {
      "name": "float64ArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN float64ArrayValue Array<FLOAT64>"
    }, {
      "name": "timestampArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN timestampArrayValue Array<TIMESTAMP> NOT NULL"
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
    "createTableDdl": "CREATE TABLE TypesTable (id STRING(MAX) NOT NULL, stringValue STRING(MAX) NOT NULL, boolValue BOOL NOT NULL, float64Value FLOAT64, timestampValue TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true), stringArrayValue Array<STRING(MAX)> NOT NULL, boolArrayValue Array<BOOL> NOT NULL, float64ArrayValue Array<FLOAT64>, timestampArrayValue Array<TIMESTAMP> NOT NULL, user BYTES(MAX) NOT NULL, userType FLOAT64, userArray Array<BYTES(MAX)>, userTypeArray Array<FLOAT64> NOT NULL) PRIMARY KEY (id DESC, stringValue ASC)",
    "indexes": [{
      "name": "Sort",
      "createIndexDdl": "CREATE INDEX Sort ON TypesTable(stringValue, float64Value)"
    }, {
      "name": "Sort2",
      "createIndexDdl": "CREATE UNIQUE NULL_FILTERED INDEX Sort2 ON TypesTable(float64Value DESC)"
    }]
  }]
}`),
          "ddl",
        );
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { User, USER, UserType, USER_TYPE } from './user';
import { serializeMessage, deserializeMessage, toEnumFromNumber } from '@selfage/message/serializer';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertNewRowStatement(
  id: string,
  stringValue: string,
  boolValue: boolean,
  float64Value: number | null | undefined,
  stringArrayValue: Array<string>,
  boolArrayValue: Array<boolean>,
  float64ArrayValue: Array<number> | null | undefined,
  timestampArrayValue: Array<number>,
  user: User,
  userType: UserType | null | undefined,
  userArray: Array<User> | null | undefined,
  userTypeArray: Array<UserType>,
): Statement {
  return {
    sql: "INSERT TypesTable (id, stringValue, boolValue, float64Value, timestampValue, stringArrayValue, boolArrayValue, float64ArrayValue, timestampArrayValue, user, userType, userArray, userTypeArray) VALUES (@id, @stringValue, @boolValue, @float64Value, PENDING_COMMIT_TIMESTAMP(), @stringArrayValue, @boolArrayValue, @float64ArrayValue, @timestampArrayValue, @user, @userType, @userArray, @userTypeArray)",
    params: {
      id: id,
      stringValue: stringValue,
      boolValue: boolValue,
      float64Value: float64Value == null ? null : Spanner.float(float64Value),
      stringArrayValue: stringArrayValue,
      boolArrayValue: boolArrayValue,
      float64ArrayValue: float64ArrayValue == null ? null : float64ArrayValue.map((e) => Spanner.float(e)),
      timestampArrayValue: timestampArrayValue.map((e) => new Date(e).toISOString()),
      user: Buffer.from(serializeMessage(user, USER).buffer),
      userType: userType == null ? null : Spanner.float(userType),
      userArray: userArray == null ? null : userArray.map((e) => Buffer.from(serializeMessage(e, USER).buffer)),
      userTypeArray: userTypeArray.map((e) => Spanner.float(e)),
    },
    types: {
      id: { type: "string" },
      stringValue: { type: "string" },
      boolValue: { type: "bool" },
      float64Value: { type: "float64" },
      stringArrayValue: { type: "array", child: { type: "string" } },
      boolArrayValue: { type: "array", child: { type: "bool" } },
      float64ArrayValue: { type: "array", child: { type: "float64" } },
      timestampArrayValue: { type: "array", child: { type: "timestamp" } },
      user: { type: "bytes" },
      userType: { type: "float64" },
      userArray: { type: "array", child: { type: "bytes" } },
      userTypeArray: { type: "array", child: { type: "float64" } },
    }
  };
}

export function updateARowStatement(
  typesTableStringValueEq: string,
  typesTableFloat64ValueGe: number | null | undefined,
  typesTableBoolValueNe: boolean,
  typesTableTimestampValueGt: number,
  setStringValue: string,
): Statement {
  return {
    sql: "UPDATE TypesTable SET stringValue = @setStringValue, timestampValue = PENDING_COMMIT_TIMESTAMP() WHERE (TypesTable.stringValue = @typesTableStringValueEq AND ((TypesTable.float64Value >= @typesTableFloat64ValueGe AND TypesTable.boolValue != @typesTableBoolValueNe) OR TypesTable.timestampValue > @typesTableTimestampValueGt))",
    params: {
      typesTableStringValueEq: typesTableStringValueEq,
      typesTableFloat64ValueGe: typesTableFloat64ValueGe == null ? null : Spanner.float(typesTableFloat64ValueGe),
      typesTableBoolValueNe: typesTableBoolValueNe,
      typesTableTimestampValueGt: new Date(typesTableTimestampValueGt).toISOString(),
      setStringValue: setStringValue,
    },
    types: {
      typesTableStringValueEq: { type: "string" },
      typesTableFloat64ValueGe: { type: "float64" },
      typesTableBoolValueNe: { type: "bool" },
      typesTableTimestampValueGt: { type: "timestamp" },
      setStringValue: { type: "string" },
    }
  };
}

export function deleteARowStatement(
  typesTableIdEq: string,
): Statement {
  return {
    sql: "DELETE TypesTable WHERE (TypesTable.id = @typesTableIdEq AND TypesTable.float64Value IS NULL)",
    params: {
      typesTableIdEq: typesTableIdEq,
    },
    types: {
      typesTableIdEq: { type: "string" },
    }
  };
}

export interface SelectARowRow {
  typesTableId: string,
  typesTableStringValue: string,
  typesTableBoolValue: boolean,
  typesTableFloat64Value: number | undefined,
  typesTableTimestampValue: number,
  typesTableStringArrayValue: Array<string>,
  typesTableBoolArrayValue: Array<boolean>,
  typesTableFloat64ArrayValue: Array<number> | undefined,
  typesTableTimestampArrayValue: Array<number>,
  typesTableUser: User,
  typesTableUserType: UserType | undefined,
  typesTableUserArray: Array<User> | undefined,
  typesTableUserTypeArray: Array<UserType>,
}

export let SELECT_A_ROW_ROW: MessageDescriptor<SelectARowRow> = {
  name: 'SelectARowRow',
  fields: [{
    name: 'typesTableId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'typesTableStringValue',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'typesTableBoolValue',
    index: 3,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'typesTableFloat64Value',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableTimestampValue',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableStringArrayValue',
    index: 6,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'typesTableBoolArrayValue',
    index: 7,
    primitiveType: PrimitiveType.BOOLEAN,
    isArray: true,
  }, {
    name: 'typesTableFloat64ArrayValue',
    index: 8,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableTimestampArrayValue',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableUser',
    index: 10,
    messageType: USER,
  }, {
    name: 'typesTableUserType',
    index: 11,
    enumType: USER_TYPE,
  }, {
    name: 'typesTableUserArray',
    index: 12,
    messageType: USER,
    isArray: true,
  }, {
    name: 'typesTableUserTypeArray',
    index: 13,
    enumType: USER_TYPE,
    isArray: true,
  }],
};

export async function selectARow(
  runner: Database | Transaction,
): Promise<Array<SelectARowRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TypesTable.id, TypesTable.stringValue, TypesTable.boolValue, TypesTable.float64Value, TypesTable.timestampValue, TypesTable.stringArrayValue, TypesTable.boolArrayValue, TypesTable.float64ArrayValue, TypesTable.timestampArrayValue, TypesTable.user, TypesTable.userType, TypesTable.userArray, TypesTable.userTypeArray FROM TypesTable",
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
      typesTableFloat64Value: row.at(3).value == null ? undefined : row.at(3).value.value,
      typesTableTimestampValue: row.at(4).value.valueOf(),
      typesTableStringArrayValue: row.at(5).value,
      typesTableBoolArrayValue: row.at(6).value,
      typesTableFloat64ArrayValue: row.at(7).value == null ? undefined : row.at(7).value.map((e) => e.value),
      typesTableTimestampArrayValue: row.at(8).value.map((e) => e.valueOf()),
      typesTableUser: deserializeMessage(row.at(9).value, USER),
      typesTableUserType: row.at(10).value == null ? undefined : toEnumFromNumber(row.at(10).value.value, USER_TYPE),
      typesTableUserArray: row.at(11).value == null ? undefined : row.at(11).value.map((e) => deserializeMessage(e, USER)),
      typesTableUserTypeArray: row.at(12).value.map((e) => toEnumFromNumber(e.value, USER_TYPE)),
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
      name: "StringWithAllowCommitTimestamp",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        generateSpannerDatabase(
          "./database/user",
          {
            kind: "SpannerDatabase",
            name: "UserDatabase",
            tables: [
              {
                kind: "Table",
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
                kind: "Table",
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
          mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
                  name: "ChildTable",
                  columns: [
                    {
                      name: "pid",
                      type: "float64",
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
            mockDefinitionResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              `primary key pid's type "float64" doesn't match the type "string"`,
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "MessageTable",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(
            loggingPrefix: string,
            typeName: string,
            importPath?: string,
          ): Definition {
            this.called += 1;
            switch (typeName) {
              case "SomeData":
                assertThat(importPath, eq(undefined), "import path");
                return {
                  kind: "Message",
                  name: "SomeData",
                  fields: [
                    {
                      name: "id1",
                      type: "string",
                      index: 1,
                    },
                    {
                      name: "id2",
                      type: "number",
                      index: 2,
                    },
                    {
                      name: "stringValue",
                      type: "string",
                      index: 3,
                    },
                    {
                      name: "boolValue",
                      type: "boolean",
                      index: 4,
                    },
                    {
                      name: "numberValue",
                      type: "number",
                      index: 5,
                    },
                  ],
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
            kind: "SpannerDatabase",
            name: "UserDatabase",
            tables: [
              {
                kind: "MessageTable",
                name: "SomeData",
                storedInColumn: "someData",
                columns: ["id2", "boolValue", "id1", "numberValue"],
                primaryKeys: [
                  "id1",
                  {
                    name: "id2",
                    desc: true,
                  },
                ],
                indexes: [
                  {
                    name: "Sort",
                    columns: ["numberValue"],
                  },
                  {
                    name: "Filter",
                    columns: ["boolValue", "numberValue"],
                  },
                ],
                insert: "InsertNewSomeData",
                delete: "DeleteSomeData",
                get: "GetSomeData",
                update: "UpdateSomeData",
              },
            ],
            selects: [
              {
                name: "ListData",
                table: "SomeData",
                where: {
                  op: "AND",
                  exps: [
                    {
                      op: "<",
                      leftColumn: "numberValue",
                    },
                  ],
                },
                getColumns: ["someData"],
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/schema_ddl").build(),
          eqLongStr(`{
  "tables": [{
    "name": "SomeData",
    "columns": [{
      "name": "id2",
      "addColumnDdl": "ALTER TABLE SomeData ADD COLUMN id2 FLOAT64 NOT NULL"
    }, {
      "name": "boolValue",
      "addColumnDdl": "ALTER TABLE SomeData ADD COLUMN boolValue BOOL NOT NULL"
    }, {
      "name": "id1",
      "addColumnDdl": "ALTER TABLE SomeData ADD COLUMN id1 STRING(MAX) NOT NULL"
    }, {
      "name": "numberValue",
      "addColumnDdl": "ALTER TABLE SomeData ADD COLUMN numberValue FLOAT64 NOT NULL"
    }, {
      "name": "someData",
      "addColumnDdl": "ALTER TABLE SomeData ADD COLUMN someData BYTES(MAX) NOT NULL"
    }],
    "createTableDdl": "CREATE TABLE SomeData (id2 FLOAT64 NOT NULL, boolValue BOOL NOT NULL, id1 STRING(MAX) NOT NULL, numberValue FLOAT64 NOT NULL, someData BYTES(MAX) NOT NULL) PRIMARY KEY (id1 ASC, id2 DESC)",
    "indexes": [{
      "name": "Sort",
      "createIndexDdl": "CREATE INDEX Sort ON SomeData(numberValue)"
    }, {
      "name": "Filter",
      "createIndexDdl": "CREATE INDEX Filter ON SomeData(boolValue, numberValue)"
    }]
  }]
}`),
          "ddl",
        );
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { SomeData, SOME_DATA } from './user';
import { serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { MessageDescriptor } from '@selfage/message/descriptor';

export function insertNewSomeDataStatement(
  someData: SomeData,
): Statement {
  return insertNewSomeDataInternalStatement(
    someData.id2,
    someData.boolValue,
    someData.id1,
    someData.numberValue,
    someData
  );
}

export function insertNewSomeDataInternalStatement(
  id2: number,
  boolValue: boolean,
  id1: string,
  numberValue: number,
  someData: SomeData,
): Statement {
  return {
    sql: "INSERT SomeData (id2, boolValue, id1, numberValue, someData) VALUES (@id2, @boolValue, @id1, @numberValue, @someData)",
    params: {
      id2: Spanner.float(id2),
      boolValue: boolValue,
      id1: id1,
      numberValue: Spanner.float(numberValue),
      someData: Buffer.from(serializeMessage(someData, SOME_DATA).buffer),
    },
    types: {
      id2: { type: "float64" },
      boolValue: { type: "bool" },
      id1: { type: "string" },
      numberValue: { type: "float64" },
      someData: { type: "bytes" },
    }
  };
}

export function deleteSomeDataStatement(
  someDataId1Eq: string,
  someDataId2Eq: number,
): Statement {
  return {
    sql: "DELETE SomeData WHERE (SomeData.id1 = @someDataId1Eq AND SomeData.id2 = @someDataId2Eq)",
    params: {
      someDataId1Eq: someDataId1Eq,
      someDataId2Eq: Spanner.float(someDataId2Eq),
    },
    types: {
      someDataId1Eq: { type: "string" },
      someDataId2Eq: { type: "float64" },
    }
  };
}

export interface GetSomeDataRow {
  someDataSomeData: SomeData,
}

export let GET_SOME_DATA_ROW: MessageDescriptor<GetSomeDataRow> = {
  name: 'GetSomeDataRow',
  fields: [{
    name: 'someDataSomeData',
    index: 1,
    messageType: SOME_DATA,
  }],
};

export async function getSomeData(
  runner: Database | Transaction,
  someDataId1Eq: string,
  someDataId2Eq: number,
): Promise<Array<GetSomeDataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SomeData.someData FROM SomeData WHERE (SomeData.id1 = @someDataId1Eq AND SomeData.id2 = @someDataId2Eq)",
    params: {
      someDataId1Eq: someDataId1Eq,
      someDataId2Eq: Spanner.float(someDataId2Eq),
    },
    types: {
      someDataId1Eq: { type: "string" },
      someDataId2Eq: { type: "float64" },
    }
  });
  let resRows = new Array<GetSomeDataRow>();
  for (let row of rows) {
    resRows.push({
      someDataSomeData: deserializeMessage(row.at(0).value, SOME_DATA),
    });
  }
  return resRows;
}

export function updateSomeDataStatement(
  someData: SomeData,
): Statement {
  return updateSomeDataInternalStatement(
    someData.id1,
    someData.id2,
    someData.boolValue,
    someData.numberValue,
    someData
  );
}

export function updateSomeDataInternalStatement(
  someDataId1Eq: string,
  someDataId2Eq: number,
  setBoolValue: boolean,
  setNumberValue: number,
  setSomeData: SomeData,
): Statement {
  return {
    sql: "UPDATE SomeData SET boolValue = @setBoolValue, numberValue = @setNumberValue, someData = @setSomeData WHERE (SomeData.id1 = @someDataId1Eq AND SomeData.id2 = @someDataId2Eq)",
    params: {
      someDataId1Eq: someDataId1Eq,
      someDataId2Eq: Spanner.float(someDataId2Eq),
      setBoolValue: setBoolValue,
      setNumberValue: Spanner.float(setNumberValue),
      setSomeData: Buffer.from(serializeMessage(setSomeData, SOME_DATA).buffer),
    },
    types: {
      someDataId1Eq: { type: "string" },
      someDataId2Eq: { type: "float64" },
      setBoolValue: { type: "bool" },
      setNumberValue: { type: "float64" },
      setSomeData: { type: "bytes" },
    }
  };
}

export interface ListDataRow {
  someDataSomeData: SomeData,
}

export let LIST_DATA_ROW: MessageDescriptor<ListDataRow> = {
  name: 'ListDataRow',
  fields: [{
    name: 'someDataSomeData',
    index: 1,
    messageType: SOME_DATA,
  }],
};

export async function listData(
  runner: Database | Transaction,
  someDataNumberValueLt: number,
): Promise<Array<ListDataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT SomeData.someData FROM SomeData WHERE (SomeData.numberValue < @someDataNumberValueLt)",
    params: {
      someDataNumberValueLt: Spanner.float(someDataNumberValueLt),
    },
    types: {
      someDataNumberValueLt: { type: "float64" },
    }
  });
  let resRows = new Array<ListDataRow>();
  for (let row of rows) {
    resRows.push({
      someDataSomeData: deserializeMessage(row.at(0).value, SOME_DATA),
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
      name: "TaskTable",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        generateSpannerDatabase(
          "./database/task",
          {
            kind: "SpannerDatabase",
            name: "TaskDatabase",
            tables: [
              {
                kind: "TaskTable",
                name: "WorkingTask",
                columns: [
                  {
                    name: "id1",
                    type: "string",
                  },
                  {
                    name: "id2",
                    type: "string",
                  },
                  {
                    name: "payload",
                    type: "string",
                  },
                ],
                retryCountColumn: "retryCount",
                executionTimeColumn: "executionTime",
                createdTimeColumn: "createdTime",
                primaryKeys: [
                  "id1",
                  {
                    name: "id2",
                    desc: true,
                  },
                ],
                executionTimeIndex: "ByExecutionTime",
                insert: "InsertWorkingTask",
                delete: "DeleteWorkingTask",
                get: "GetWorkingTask",
                getMetadata: "GetWorkingTaskMetadata",
                listPendingTasks: "ListPendingWorkingTasks",
                updateMetadata: "UpdateWorkingTaskMetadata",
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/schema_ddl").build(),
          eqLongStr(`{
  "tables": [{
    "name": "WorkingTask",
    "columns": [{
      "name": "id1",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN id1 STRING(MAX) NOT NULL"
    }, {
      "name": "id2",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN id2 STRING(MAX) NOT NULL"
    }, {
      "name": "payload",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN payload STRING(MAX) NOT NULL"
    }, {
      "name": "retryCount",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN retryCount FLOAT64 NOT NULL"
    }, {
      "name": "executionTime",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN executionTime TIMESTAMP NOT NULL"
    }, {
      "name": "createdTime",
      "addColumnDdl": "ALTER TABLE WorkingTask ADD COLUMN createdTime TIMESTAMP NOT NULL"
    }],
    "createTableDdl": "CREATE TABLE WorkingTask (id1 STRING(MAX) NOT NULL, id2 STRING(MAX) NOT NULL, payload STRING(MAX) NOT NULL, retryCount FLOAT64 NOT NULL, executionTime TIMESTAMP NOT NULL, createdTime TIMESTAMP NOT NULL) PRIMARY KEY (id1 ASC, id2 DESC)",
    "indexes": [{
      "name": "ByExecutionTime",
      "createIndexDdl": "CREATE INDEX ByExecutionTime ON WorkingTask(executionTime)"
    }]
  }]
}`),
          "ddl",
        );
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertWorkingTaskStatement(
  id1: string,
  id2: string,
  payload: string,
  retryCount: number,
  executionTime: number,
  createdTime: number,
): Statement {
  return {
    sql: "INSERT WorkingTask (id1, id2, payload, retryCount, executionTime, createdTime) VALUES (@id1, @id2, @payload, @retryCount, @executionTime, @createdTime)",
    params: {
      id1: id1,
      id2: id2,
      payload: payload,
      retryCount: Spanner.float(retryCount),
      executionTime: new Date(executionTime).toISOString(),
      createdTime: new Date(createdTime).toISOString(),
    },
    types: {
      id1: { type: "string" },
      id2: { type: "string" },
      payload: { type: "string" },
      retryCount: { type: "float64" },
      executionTime: { type: "timestamp" },
      createdTime: { type: "timestamp" },
    }
  };
}

export function deleteWorkingTaskStatement(
  workingTaskId1Eq: string,
  workingTaskId2Eq: string,
): Statement {
  return {
    sql: "DELETE WorkingTask WHERE (WorkingTask.id1 = @workingTaskId1Eq AND WorkingTask.id2 = @workingTaskId2Eq)",
    params: {
      workingTaskId1Eq: workingTaskId1Eq,
      workingTaskId2Eq: workingTaskId2Eq,
    },
    types: {
      workingTaskId1Eq: { type: "string" },
      workingTaskId2Eq: { type: "string" },
    }
  };
}

export interface GetWorkingTaskRow {
  workingTaskId1: string,
  workingTaskId2: string,
  workingTaskPayload: string,
  workingTaskRetryCount: number,
  workingTaskExecutionTime: number,
  workingTaskCreatedTime: number,
}

export let GET_WORKING_TASK_ROW: MessageDescriptor<GetWorkingTaskRow> = {
  name: 'GetWorkingTaskRow',
  fields: [{
    name: 'workingTaskId1',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'workingTaskId2',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'workingTaskPayload',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'workingTaskRetryCount',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'workingTaskExecutionTime',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'workingTaskCreatedTime',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getWorkingTask(
  runner: Database | Transaction,
  workingTaskId1Eq: string,
  workingTaskId2Eq: string,
): Promise<Array<GetWorkingTaskRow>> {
  let [rows] = await runner.run({
    sql: "SELECT WorkingTask.id1, WorkingTask.id2, WorkingTask.payload, WorkingTask.retryCount, WorkingTask.executionTime, WorkingTask.createdTime FROM WorkingTask WHERE (WorkingTask.id1 = @workingTaskId1Eq AND WorkingTask.id2 = @workingTaskId2Eq)",
    params: {
      workingTaskId1Eq: workingTaskId1Eq,
      workingTaskId2Eq: workingTaskId2Eq,
    },
    types: {
      workingTaskId1Eq: { type: "string" },
      workingTaskId2Eq: { type: "string" },
    }
  });
  let resRows = new Array<GetWorkingTaskRow>();
  for (let row of rows) {
    resRows.push({
      workingTaskId1: row.at(0).value,
      workingTaskId2: row.at(1).value,
      workingTaskPayload: row.at(2).value,
      workingTaskRetryCount: row.at(3).value.value,
      workingTaskExecutionTime: row.at(4).value.valueOf(),
      workingTaskCreatedTime: row.at(5).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingWorkingTasksRow {
  workingTaskId1: string,
  workingTaskId2: string,
  workingTaskPayload: string,
}

export let LIST_PENDING_WORKING_TASKS_ROW: MessageDescriptor<ListPendingWorkingTasksRow> = {
  name: 'ListPendingWorkingTasksRow',
  fields: [{
    name: 'workingTaskId1',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'workingTaskId2',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'workingTaskPayload',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function listPendingWorkingTasks(
  runner: Database | Transaction,
  workingTaskExecutionTimeLe: number,
): Promise<Array<ListPendingWorkingTasksRow>> {
  let [rows] = await runner.run({
    sql: "SELECT WorkingTask.id1, WorkingTask.id2, WorkingTask.payload FROM WorkingTask WHERE WorkingTask.executionTime <= @workingTaskExecutionTimeLe",
    params: {
      workingTaskExecutionTimeLe: new Date(workingTaskExecutionTimeLe).toISOString(),
    },
    types: {
      workingTaskExecutionTimeLe: { type: "timestamp" },
    }
  });
  let resRows = new Array<ListPendingWorkingTasksRow>();
  for (let row of rows) {
    resRows.push({
      workingTaskId1: row.at(0).value,
      workingTaskId2: row.at(1).value,
      workingTaskPayload: row.at(2).value,
    });
  }
  return resRows;
}

export interface GetWorkingTaskMetadataRow {
  workingTaskRetryCount: number,
  workingTaskExecutionTime: number,
}

export let GET_WORKING_TASK_METADATA_ROW: MessageDescriptor<GetWorkingTaskMetadataRow> = {
  name: 'GetWorkingTaskMetadataRow',
  fields: [{
    name: 'workingTaskRetryCount',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'workingTaskExecutionTime',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getWorkingTaskMetadata(
  runner: Database | Transaction,
  workingTaskId1Eq: string,
  workingTaskId2Eq: string,
): Promise<Array<GetWorkingTaskMetadataRow>> {
  let [rows] = await runner.run({
    sql: "SELECT WorkingTask.retryCount, WorkingTask.executionTime FROM WorkingTask WHERE (WorkingTask.id1 = @workingTaskId1Eq AND WorkingTask.id2 = @workingTaskId2Eq)",
    params: {
      workingTaskId1Eq: workingTaskId1Eq,
      workingTaskId2Eq: workingTaskId2Eq,
    },
    types: {
      workingTaskId1Eq: { type: "string" },
      workingTaskId2Eq: { type: "string" },
    }
  });
  let resRows = new Array<GetWorkingTaskMetadataRow>();
  for (let row of rows) {
    resRows.push({
      workingTaskRetryCount: row.at(0).value.value,
      workingTaskExecutionTime: row.at(1).value.valueOf(),
    });
  }
  return resRows;
}

export function updateWorkingTaskMetadataStatement(
  workingTaskId1Eq: string,
  workingTaskId2Eq: string,
  setRetryCount: number,
  setExecutionTime: number,
): Statement {
  return {
    sql: "UPDATE WorkingTask SET retryCount = @setRetryCount, executionTime = @setExecutionTime WHERE (WorkingTask.id1 = @workingTaskId1Eq AND WorkingTask.id2 = @workingTaskId2Eq)",
    params: {
      workingTaskId1Eq: workingTaskId1Eq,
      workingTaskId2Eq: workingTaskId2Eq,
      setRetryCount: Spanner.float(setRetryCount),
      setExecutionTime: new Date(setExecutionTime).toISOString(),
    },
    types: {
      workingTaskId1Eq: { type: "string" },
      workingTaskId2Eq: { type: "string" },
      setRetryCount: { type: "float64" },
      setExecutionTime: { type: "timestamp" },
    }
  };
}
`),
          "sql",
        );
      },
    },
    {
      name: "ComplexSelect",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        generateSpannerDatabase(
          "./database/user",
          {
            kind: "SpannerDatabase",
            name: "UserDatabase",
            tables: [
              {
                kind: "Table",
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
                kind: "Table",
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
                kind: "Table",
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
                withLimit: true,
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
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { Database, Transaction } from '@google-cloud/spanner';

export interface S1Row {
  t1F1: string,
  t1F2: string,
  t2TableF2: string,
  t3F2: string,
}

export let S1_ROW: MessageDescriptor<S1Row> = {
  name: 'S1Row',
  fields: [{
    name: 't1F1',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 't1F2',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 't2TableF2',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 't3F2',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function s1(
  runner: Database | Transaction,
  t1F2Eq: string,
  t3F1Eq: string,
  t2TableF2Ne: string,
  limit: number,
): Promise<Array<S1Row>> {
  let [rows] = await runner.run({
    sql: "SELECT t1.f1, t1.f2, T2Table.f2, t3.f2 FROM T1Table AS t1 INNER JOIN T2Table ON t1.f1 = T2Table.f1 CROSS JOIN T3Table AS t3 ON ((T2Table.f1 = t3.f1 OR t1.f1 != t3.f1) AND (T2Table.f2 = t3.f2 OR t1.f2 != t3.f2)) WHERE (t1.f2 = @t1F2Eq AND t3.f1 = @t3F1Eq AND T2Table.f2 != @t2TableF2Ne) ORDER BY t1.f2, t1.f1, T2Table.f2 DESC, t3.f1 LIMIT @limit",
    params: {
      t1F2Eq: t1F2Eq,
      t3F1Eq: t3F1Eq,
      t2TableF2Ne: t2TableF2Ne,
      limit: limit.toString(),
    },
    types: {
      t1F2Eq: { type: "string" },
      t3F1Eq: { type: "string" },
      t2TableF2Ne: { type: "string" },
      limit: { type: "int64" },
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
                  kind: "Table",
                  name: "T2Table",
                  columns: [
                    {
                      name: "f1",
                      type: "string",
                    },
                    {
                      name: "f2",
                      type: "float64",
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
            mockDefinitionResolver,
            outputContentMap,
          ),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "when joining T2Table, the left column T1Table.f2 whose type is string doesn't match the right column t2.f2 whose type is float64.",
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
      name: "SelectOrderByTableNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          generateSpannerDatabase(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
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
            mockDefinitionResolver,
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
