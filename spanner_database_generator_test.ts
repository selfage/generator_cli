import { Definition } from "./definition";
import { MockDefinitionResolver } from "./definition_resolver_mock";
import { OutputContentBuilder } from "./output_content_builder";
import { SpannerDatabaseGenerator } from "./spanner_database_generator";
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
        new SpannerDatabaseGenerator(
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
                    name: "int53Value",
                    type: "int53",
                  },
                  {
                    name: "float64Value",
                    type: "float64",
                    nullable: true,
                  },
                  {
                    name: "timestampValue",
                    type: "timestamp",
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
                    name: "int53ArrayValue",
                    type: "int53",
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
                insert: "InsertTypesTable",
                delete: "DeleteTypesTable",
                get: "GetTypesTable",
              },
            ],
            inserts: [
              {
                name: "InsertPartialRow",
                table: "TypesTable",
                set: ["id", "stringValue", "timestampValue"],
              },
            ],
            updates: [
              {
                name: "UpdateARow",
                table: "TypesTable",
                set: ["stringValue", "timestampValue"],
                where: {
                  op: "AND",
                  exprs: [
                    {
                      op: "=",
                      lColumn: "stringValue",
                    },
                    {
                      op: "OR",
                      exprs: [
                        {
                          op: "AND",
                          exprs: [
                            {
                              op: ">=",
                              lColumn: "float64Value",
                            },
                            {
                              op: "!=",
                              lColumn: "boolValue",
                            },
                          ],
                        },
                        {
                          op: ">",
                          lColumn: "timestampValue",
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
                  exprs: [
                    {
                      op: "=",
                      lColumn: "id",
                    },
                    {
                      op: "IS NULL",
                      lColumn: "float64Value",
                    },
                  ],
                },
              },
            ],
            selects: [
              {
                name: "GetARow",
                from: "TypesTable",
                getAllColumnsFrom: ["TypesTable"],
              },
              {
                name: "GetPartialRow",
                from: "TypesTable",
                get: ["id", "stringValue", "userTypeArray"],
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockDefinitionResolver,
          outputContentMap,
        ).generate();

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
      "name": "int53Value",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN int53Value INT64 NOT NULL"
    }, {
      "name": "float64Value",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN float64Value FLOAT64"
    }, {
      "name": "timestampValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN timestampValue TIMESTAMP NOT NULL"
    }, {
      "name": "stringArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN stringArrayValue Array<STRING(MAX)> NOT NULL"
    }, {
      "name": "boolArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN boolArrayValue Array<BOOL> NOT NULL"
    }, {
      "name": "int53ArrayValue",
      "addColumnDdl": "ALTER TABLE TypesTable ADD COLUMN int53ArrayValue Array<INT64> NOT NULL"
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
    "createTableDdl": "CREATE TABLE TypesTable (id STRING(MAX) NOT NULL, stringValue STRING(MAX) NOT NULL, boolValue BOOL NOT NULL, int53Value INT64 NOT NULL, float64Value FLOAT64, timestampValue TIMESTAMP NOT NULL, stringArrayValue Array<STRING(MAX)> NOT NULL, boolArrayValue Array<BOOL> NOT NULL, int53ArrayValue Array<INT64> NOT NULL, float64ArrayValue Array<FLOAT64>, timestampArrayValue Array<TIMESTAMP> NOT NULL, user BYTES(MAX) NOT NULL, userType FLOAT64, userArray Array<BYTES(MAX)>, userTypeArray Array<FLOAT64> NOT NULL) PRIMARY KEY (id DESC, stringValue ASC)",
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

export function insertTypesTableStatement(
  id: string,
  stringValue: string,
  boolValue: boolean,
  int53Value: number,
  float64Value: number | null | undefined,
  timestampValue: number,
  stringArrayValue: Array<string>,
  boolArrayValue: Array<boolean>,
  int53ArrayValue: Array<number>,
  float64ArrayValue: Array<number> | null | undefined,
  timestampArrayValue: Array<number>,
  user: User,
  userType: UserType | null | undefined,
  userArray: Array<User> | null | undefined,
  userTypeArray: Array<UserType>,
): Statement {
  return {
    sql: "INSERT TypesTable (id, stringValue, boolValue, int53Value, float64Value, timestampValue, stringArrayValue, boolArrayValue, int53ArrayValue, float64ArrayValue, timestampArrayValue, user, userType, userArray, userTypeArray) VALUES (@id, @stringValue, @boolValue, @int53Value, @float64Value, @timestampValue, @stringArrayValue, @boolArrayValue, @int53ArrayValue, @float64ArrayValue, @timestampArrayValue, @user, @userType, @userArray, @userTypeArray)",
    params: {
      id: id,
      stringValue: stringValue,
      boolValue: boolValue,
      int53Value: int53Value.toString(),
      float64Value: float64Value == null ? null : Spanner.float(float64Value),
      timestampValue: new Date(timestampValue).toISOString(),
      stringArrayValue: stringArrayValue,
      boolArrayValue: boolArrayValue,
      int53ArrayValue: int53ArrayValue.map((e) => e.toString()),
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
      int53Value: { type: "int53" },
      float64Value: { type: "float64" },
      timestampValue: { type: "timestamp" },
      stringArrayValue: { type: "array", child: { type: "string" } },
      boolArrayValue: { type: "array", child: { type: "bool" } },
      int53ArrayValue: { type: "array", child: { type: "int53" } },
      float64ArrayValue: { type: "array", child: { type: "float64" } },
      timestampArrayValue: { type: "array", child: { type: "timestamp" } },
      user: { type: "bytes" },
      userType: { type: "float64" },
      userArray: { type: "array", child: { type: "bytes" } },
      userTypeArray: { type: "array", child: { type: "float64" } },
    }
  };
}

export function deleteTypesTableStatement(
  typesTableIdEq: string,
  typesTableStringValueEq: string,
): Statement {
  return {
    sql: "DELETE TypesTable WHERE (TypesTable.id = @typesTableIdEq AND TypesTable.stringValue = @typesTableStringValueEq)",
    params: {
      typesTableIdEq: typesTableIdEq,
      typesTableStringValueEq: typesTableStringValueEq,
    },
    types: {
      typesTableIdEq: { type: "string" },
      typesTableStringValueEq: { type: "string" },
    }
  };
}

export interface GetTypesTableRow {
  typesTableId?: string,
  typesTableStringValue?: string,
  typesTableBoolValue?: boolean,
  typesTableInt53Value?: number,
  typesTableFloat64Value?: number,
  typesTableTimestampValue?: number,
  typesTableStringArrayValue?: Array<string>,
  typesTableBoolArrayValue?: Array<boolean>,
  typesTableInt53ArrayValue?: Array<number>,
  typesTableFloat64ArrayValue?: Array<number>,
  typesTableTimestampArrayValue?: Array<number>,
  typesTableUser?: User,
  typesTableUserType?: UserType,
  typesTableUserArray?: Array<User>,
  typesTableUserTypeArray?: Array<UserType>,
}

export let GET_TYPES_TABLE_ROW: MessageDescriptor<GetTypesTableRow> = {
  name: 'GetTypesTableRow',
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
    name: 'typesTableInt53Value',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableFloat64Value',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableTimestampValue',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableStringArrayValue',
    index: 7,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'typesTableBoolArrayValue',
    index: 8,
    primitiveType: PrimitiveType.BOOLEAN,
    isArray: true,
  }, {
    name: 'typesTableInt53ArrayValue',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableFloat64ArrayValue',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableTimestampArrayValue',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableUser',
    index: 12,
    messageType: USER,
  }, {
    name: 'typesTableUserType',
    index: 13,
    enumType: USER_TYPE,
  }, {
    name: 'typesTableUserArray',
    index: 14,
    messageType: USER,
    isArray: true,
  }, {
    name: 'typesTableUserTypeArray',
    index: 15,
    enumType: USER_TYPE,
    isArray: true,
  }],
};

export async function getTypesTable(
  runner: Database | Transaction,
  typesTableIdEq: string,
  typesTableStringValueEq: string,
): Promise<Array<GetTypesTableRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TypesTable.id, TypesTable.stringValue, TypesTable.boolValue, TypesTable.int53Value, TypesTable.float64Value, TypesTable.timestampValue, TypesTable.stringArrayValue, TypesTable.boolArrayValue, TypesTable.int53ArrayValue, TypesTable.float64ArrayValue, TypesTable.timestampArrayValue, TypesTable.user, TypesTable.userType, TypesTable.userArray, TypesTable.userTypeArray FROM TypesTable WHERE (TypesTable.id = @typesTableIdEq AND TypesTable.stringValue = @typesTableStringValueEq)",
    params: {
      typesTableIdEq: typesTableIdEq,
      typesTableStringValueEq: typesTableStringValueEq,
    },
    types: {
      typesTableIdEq: { type: "string" },
      typesTableStringValueEq: { type: "string" },
    }
  });
  let resRows = new Array<GetTypesTableRow>();
  for (let row of rows) {
    resRows.push({
      typesTableId: row.at(0).value == null ? undefined : row.at(0).value,
      typesTableStringValue: row.at(1).value == null ? undefined : row.at(1).value,
      typesTableBoolValue: row.at(2).value == null ? undefined : row.at(2).value,
      typesTableInt53Value: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
      typesTableFloat64Value: row.at(4).value == null ? undefined : row.at(4).value.value,
      typesTableTimestampValue: row.at(5).value == null ? undefined : row.at(5).value.valueOf(),
      typesTableStringArrayValue: row.at(6).value == null ? undefined : row.at(6).value,
      typesTableBoolArrayValue: row.at(7).value == null ? undefined : row.at(7).value,
      typesTableInt53ArrayValue: row.at(8).value == null ? undefined : row.at(8).value.map((e) => e.valueOf()),
      typesTableFloat64ArrayValue: row.at(9).value == null ? undefined : row.at(9).value.map((e) => e.value),
      typesTableTimestampArrayValue: row.at(10).value == null ? undefined : row.at(10).value.map((e) => e.valueOf()),
      typesTableUser: row.at(11).value == null ? undefined : deserializeMessage(row.at(11).value, USER),
      typesTableUserType: row.at(12).value == null ? undefined : toEnumFromNumber(row.at(12).value.value, USER_TYPE),
      typesTableUserArray: row.at(13).value == null ? undefined : row.at(13).value.map((e) => deserializeMessage(e, USER)),
      typesTableUserTypeArray: row.at(14).value == null ? undefined : row.at(14).value.map((e) => toEnumFromNumber(e.value, USER_TYPE)),
    });
  }
  return resRows;
}

export function insertPartialRowStatement(
  id: string,
  stringValue: string,
  timestampValue: number,
): Statement {
  return {
    sql: "INSERT TypesTable (id, stringValue, timestampValue) VALUES (@id, @stringValue, @timestampValue)",
    params: {
      id: id,
      stringValue: stringValue,
      timestampValue: new Date(timestampValue).toISOString(),
    },
    types: {
      id: { type: "string" },
      stringValue: { type: "string" },
      timestampValue: { type: "timestamp" },
    }
  };
}

export function updateARowStatement(
  typesTableStringValueEq: string,
  typesTableFloat64ValueGe: number | null | undefined,
  typesTableBoolValueNe: boolean,
  typesTableTimestampValueGt: number,
  setStringValue: string,
  setTimestampValue: number,
): Statement {
  return {
    sql: "UPDATE TypesTable SET stringValue = @setStringValue, timestampValue = @setTimestampValue WHERE (TypesTable.stringValue = @typesTableStringValueEq AND ((TypesTable.float64Value >= @typesTableFloat64ValueGe AND TypesTable.boolValue != @typesTableBoolValueNe) OR TypesTable.timestampValue > @typesTableTimestampValueGt))",
    params: {
      typesTableStringValueEq: typesTableStringValueEq,
      typesTableFloat64ValueGe: typesTableFloat64ValueGe == null ? null : Spanner.float(typesTableFloat64ValueGe),
      typesTableBoolValueNe: typesTableBoolValueNe,
      typesTableTimestampValueGt: new Date(typesTableTimestampValueGt).toISOString(),
      setStringValue: setStringValue,
      setTimestampValue: new Date(setTimestampValue).toISOString(),
    },
    types: {
      typesTableStringValueEq: { type: "string" },
      typesTableFloat64ValueGe: { type: "float64" },
      typesTableBoolValueNe: { type: "bool" },
      typesTableTimestampValueGt: { type: "timestamp" },
      setStringValue: { type: "string" },
      setTimestampValue: { type: "timestamp" },
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

export interface GetARowRow {
  typesTableId?: string,
  typesTableStringValue?: string,
  typesTableBoolValue?: boolean,
  typesTableInt53Value?: number,
  typesTableFloat64Value?: number,
  typesTableTimestampValue?: number,
  typesTableStringArrayValue?: Array<string>,
  typesTableBoolArrayValue?: Array<boolean>,
  typesTableInt53ArrayValue?: Array<number>,
  typesTableFloat64ArrayValue?: Array<number>,
  typesTableTimestampArrayValue?: Array<number>,
  typesTableUser?: User,
  typesTableUserType?: UserType,
  typesTableUserArray?: Array<User>,
  typesTableUserTypeArray?: Array<UserType>,
}

export let GET_A_ROW_ROW: MessageDescriptor<GetARowRow> = {
  name: 'GetARowRow',
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
    name: 'typesTableInt53Value',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableFloat64Value',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableTimestampValue',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'typesTableStringArrayValue',
    index: 7,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'typesTableBoolArrayValue',
    index: 8,
    primitiveType: PrimitiveType.BOOLEAN,
    isArray: true,
  }, {
    name: 'typesTableInt53ArrayValue',
    index: 9,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableFloat64ArrayValue',
    index: 10,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableTimestampArrayValue',
    index: 11,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'typesTableUser',
    index: 12,
    messageType: USER,
  }, {
    name: 'typesTableUserType',
    index: 13,
    enumType: USER_TYPE,
  }, {
    name: 'typesTableUserArray',
    index: 14,
    messageType: USER,
    isArray: true,
  }, {
    name: 'typesTableUserTypeArray',
    index: 15,
    enumType: USER_TYPE,
    isArray: true,
  }],
};

export async function getARow(
  runner: Database | Transaction,
): Promise<Array<GetARowRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TypesTable.id, TypesTable.stringValue, TypesTable.boolValue, TypesTable.int53Value, TypesTable.float64Value, TypesTable.timestampValue, TypesTable.stringArrayValue, TypesTable.boolArrayValue, TypesTable.int53ArrayValue, TypesTable.float64ArrayValue, TypesTable.timestampArrayValue, TypesTable.user, TypesTable.userType, TypesTable.userArray, TypesTable.userTypeArray FROM TypesTable",
    params: {
    },
    types: {
    }
  });
  let resRows = new Array<GetARowRow>();
  for (let row of rows) {
    resRows.push({
      typesTableId: row.at(0).value == null ? undefined : row.at(0).value,
      typesTableStringValue: row.at(1).value == null ? undefined : row.at(1).value,
      typesTableBoolValue: row.at(2).value == null ? undefined : row.at(2).value,
      typesTableInt53Value: row.at(3).value == null ? undefined : row.at(3).value.valueOf(),
      typesTableFloat64Value: row.at(4).value == null ? undefined : row.at(4).value.value,
      typesTableTimestampValue: row.at(5).value == null ? undefined : row.at(5).value.valueOf(),
      typesTableStringArrayValue: row.at(6).value == null ? undefined : row.at(6).value,
      typesTableBoolArrayValue: row.at(7).value == null ? undefined : row.at(7).value,
      typesTableInt53ArrayValue: row.at(8).value == null ? undefined : row.at(8).value.map((e) => e.valueOf()),
      typesTableFloat64ArrayValue: row.at(9).value == null ? undefined : row.at(9).value.map((e) => e.value),
      typesTableTimestampArrayValue: row.at(10).value == null ? undefined : row.at(10).value.map((e) => e.valueOf()),
      typesTableUser: row.at(11).value == null ? undefined : deserializeMessage(row.at(11).value, USER),
      typesTableUserType: row.at(12).value == null ? undefined : toEnumFromNumber(row.at(12).value.value, USER_TYPE),
      typesTableUserArray: row.at(13).value == null ? undefined : row.at(13).value.map((e) => deserializeMessage(e, USER)),
      typesTableUserTypeArray: row.at(14).value == null ? undefined : row.at(14).value.map((e) => toEnumFromNumber(e.value, USER_TYPE)),
    });
  }
  return resRows;
}

export interface GetPartialRowRow {
  typesTableId?: string,
  typesTableStringValue?: string,
  typesTableUserTypeArray?: Array<UserType>,
}

export let GET_PARTIAL_ROW_ROW: MessageDescriptor<GetPartialRowRow> = {
  name: 'GetPartialRowRow',
  fields: [{
    name: 'typesTableId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'typesTableStringValue',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'typesTableUserTypeArray',
    index: 3,
    enumType: USER_TYPE,
    isArray: true,
  }],
};

export async function getPartialRow(
  runner: Database | Transaction,
): Promise<Array<GetPartialRowRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TypesTable.id, TypesTable.stringValue, TypesTable.userTypeArray FROM TypesTable",
    params: {
    },
    types: {
    }
  });
  let resRows = new Array<GetPartialRowRow>();
  for (let row of rows) {
    resRows.push({
      typesTableId: row.at(0).value == null ? undefined : row.at(0).value,
      typesTableStringValue: row.at(1).value == null ? undefined : row.at(1).value,
      typesTableUserTypeArray: row.at(2).value == null ? undefined : row.at(2).value.map((e) => toEnumFromNumber(e.value, USER_TYPE)),
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
      name: "ArrayAsPrimaryKey",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
        new SpannerDatabaseGenerator(
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
        ).generate();

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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
          ).generate(),
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
      name: "TaskTable",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        new SpannerDatabaseGenerator(
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
        ).generate();

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
  workingTaskId1?: string,
  workingTaskId2?: string,
  workingTaskPayload?: string,
  workingTaskRetryCount?: number,
  workingTaskExecutionTime?: number,
  workingTaskCreatedTime?: number,
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
      workingTaskId1: row.at(0).value == null ? undefined : row.at(0).value,
      workingTaskId2: row.at(1).value == null ? undefined : row.at(1).value,
      workingTaskPayload: row.at(2).value == null ? undefined : row.at(2).value,
      workingTaskRetryCount: row.at(3).value == null ? undefined : row.at(3).value.value,
      workingTaskExecutionTime: row.at(4).value == null ? undefined : row.at(4).value.valueOf(),
      workingTaskCreatedTime: row.at(5).value == null ? undefined : row.at(5).value.valueOf(),
    });
  }
  return resRows;
}

export interface ListPendingWorkingTasksRow {
  workingTaskId1?: string,
  workingTaskId2?: string,
  workingTaskPayload?: string,
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
      workingTaskId1: row.at(0).value == null ? undefined : row.at(0).value,
      workingTaskId2: row.at(1).value == null ? undefined : row.at(1).value,
      workingTaskPayload: row.at(2).value == null ? undefined : row.at(2).value,
    });
  }
  return resRows;
}

export interface GetWorkingTaskMetadataRow {
  workingTaskRetryCount?: number,
  workingTaskExecutionTime?: number,
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
      workingTaskRetryCount: row.at(0).value == null ? undefined : row.at(0).value.value,
      workingTaskExecutionTime: row.at(1).value == null ? undefined : row.at(1).value.valueOf(),
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
        new SpannerDatabaseGenerator(
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
                from: "T1Table",
                as: "t1",
                join: [
                  {
                    type: "INNER",
                    with: "T2Table",
                    on: {
                      lColumn: "f1",
                      lTable: "t1",
                      op: "=",
                      rColumn: "f1",
                    },
                  },
                  {
                    type: "CROSS",
                    with: "T3Table",
                    as: "t3",
                    on: {
                      op: "AND",
                      exprs: [
                        {
                          op: "OR",
                          exprs: [
                            {
                              op: "=",
                              lColumn: "f1",
                              lTable: "T2Table",
                              rColumn: "f1",
                            },
                            {
                              op: "!=",
                              lColumn: "f1",
                              lTable: "t1",
                              rColumn: "f1",
                            },
                          ],
                        },
                        {
                          op: "OR",
                          exprs: [
                            {
                              op: "=",
                              lColumn: "f2",
                              lTable: "T2Table",
                              rColumn: "f2",
                            },
                            {
                              op: "!=",
                              lColumn: "f2",
                              lTable: "t1",
                              rColumn: "f2",
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
                where: {
                  op: "AND",
                  exprs: [
                    {
                      op: "=",
                      lColumn: "f2",
                    },
                    {
                      op: "=",
                      lColumn: "f1",
                      lTable: "t3",
                    },
                    {
                      op: "!=",
                      lColumn: "f2",
                      lTable: "T2Table",
                    },
                  ],
                },
                orderBy: [
                  "f2",
                  {
                    column: "f1",
                  },
                  {
                    column: "f2",
                    table: "T2Table",
                    desc: true,
                  },
                  {
                    column: "f1",
                    table: "t3",
                  },
                ],
                withLimit: true,
                get: [
                  "f1",
                  {
                    column: "f2",
                    table: "t1",
                  },
                  {
                    column: "f2",
                    table: "T2Table",
                  },
                  {
                    column: "f2",
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
        ).generate();

        // Verify
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(`import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { Database, Transaction } from '@google-cloud/spanner';

export interface S1Row {
  t1F1?: string,
  t1F2?: string,
  t2TableF2?: string,
  t3F2?: string,
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
      limit: { type: "int53" },
    }
  });
  let resRows = new Array<S1Row>();
  for (let row of rows) {
    resRows.push({
      t1F1: row.at(0).value == null ? undefined : row.at(0).value,
      t1F2: row.at(1).value == null ? undefined : row.at(1).value,
      t2TableF2: row.at(2).value == null ? undefined : row.at(2).value,
      t3F2: row.at(3).value == null ? undefined : row.at(3).value,
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
          new SpannerDatabaseGenerator(
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
                  from: "T2Table",
                  as: "T1Table",
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      with: "T2Table",
                      as: "t2",
                    },
                  ],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      with: "T2Table",
                      as: "t2",
                      on: {
                        op: "=",
                        lColumn: "f3",
                        lTable: "T1Table",
                        rColumn: "f1",
                      },
                    },
                  ],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      with: "T2Table",
                      as: "t2",
                      on: {
                        op: "=",
                        lColumn: "f1",
                        lTable: "T1Table",
                        rColumn: "f3",
                      },
                    },
                  ],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  join: [
                    {
                      type: "CROSS",
                      with: "T2Table",
                      as: "t2",
                      on: {
                        op: "=",
                        lColumn: "f2",
                        lTable: "T1Table",
                        rColumn: "f2",
                      },
                    },
                  ],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  where: {
                    op: "=",
                    lColumn: "f1",
                    lTable: "t2",
                  },
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  where: {
                    op: "=",
                    lColumn: "f3",
                    lTable: "t1",
                  },
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  where: {
                    op: "IS NULL",
                    lColumn: "f1",
                    lTable: "t1",
                  },
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  where: {
                    op: "IS NOT NULL",
                    lColumn: "f1",
                    lTable: "t1",
                  },
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  orderBy: [
                    {
                      column: "f1",
                      table: "t2",
                    },
                  ],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  orderBy: ["f3"],
                  get: [],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  get: ["f3"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
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
          new SpannerDatabaseGenerator(
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
                  from: "T1Table",
                  as: "t1",
                  get: [
                    {
                      column: "f3",
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
          ).generate(),
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
    {
      name: "Search",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        new SpannerDatabaseGenerator(
          "./database/user",
          {
            kind: "SpannerDatabase",
            name: "UserDatabase",
            tables: [
              {
                kind: "Table",
                name: "TextTable",
                columns: [
                  {
                    name: "id",
                    type: "string",
                  },
                  {
                    name: "uploaderId",
                    type: "string",
                  },
                  {
                    name: "title",
                    type: "string",
                  },
                  {
                    name: "content",
                    type: "string",
                  },
                  {
                    name: "updatedTimeMs",
                    type: "int53",
                  },
                  {
                    name: "index",
                    type: "int53",
                  },
                ],
                primaryKeys: ["id"],
                searchColumns: [
                  {
                    name: "textTokens",
                    columnRefs: ["title", "content"],
                  },
                  {
                    name: "titleTokens",
                    columnRefs: ["title"],
                  },
                  {
                    name: "contentTokens",
                    columnRefs: ["content"],
                  },
                ],
                searchIndexes: [
                  {
                    name: "ByText",
                    columns: ["textTokens"],
                  },
                  {
                    name: "ByTitleAndContent",
                    columns: ["titleTokens", "contentTokens"],
                    partitionByColumns: ["uploaderId"],
                    orderByColumns: [
                      "updatedTimeMs",
                      {
                        name: "index",
                        desc: true,
                      },
                    ],
                  },
                ],
              },
            ],
            selects: [
              {
                name: "SearchText",
                from: "TextTable",
                where: {
                  op: "AND",
                  exprs: [
                    {
                      op: "SEARCH",
                      lColumn: "textTokens",
                    },
                    {
                      op: "<",
                      func: "SCORE",
                      lColumn: "textTokens",
                    },
                  ],
                },
                orderBy: [
                  {
                    func: "SCORE",
                    column: "textTokens",
                    desc: true,
                  },
                ],
                withLimit: true,
                getAllColumnsFrom: ["TextTable"],
              },
              {
                name: "SearchTitleAndContent",
                from: "TextTable",
                where: {
                  op: "AND",
                  exprs: [
                    {
                      op: "=",
                      lColumn: "uploaderId",
                    },
                    {
                      op: "OR",
                      exprs: [
                        {
                          op: "SEARCH",
                          lColumn: "titleTokens",
                        },
                        {
                          op: "SEARCH",
                          lColumn: "contentTokens",
                        },
                      ],
                    },
                  ],
                },
                orderBy: [
                  "updatedTimeMs",
                  {
                    column: "index",
                    desc: true,
                  },
                ],
                get: ["id"],
              },
            ],
            outputDdl: "./database/schema_ddl",
            outputSql: "./database/queries",
          },
          mockDefinitionResolver,
          outputContentMap,
        ).generate();

        // Verify
        assertThat(
          outputContentMap.get("./database/schema_ddl").build(),
          eqLongStr(`{
  "tables": [{
    "name": "TextTable",
    "columns": [{
      "name": "id",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN id STRING(MAX) NOT NULL"
    }, {
      "name": "uploaderId",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN uploaderId STRING(MAX) NOT NULL"
    }, {
      "name": "title",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN title STRING(MAX) NOT NULL"
    }, {
      "name": "content",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN content STRING(MAX) NOT NULL"
    }, {
      "name": "updatedTimeMs",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN updatedTimeMs INT64 NOT NULL"
    }, {
      "name": "index",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN index INT64 NOT NULL"
    }, {
      "name": "textTokens",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN textTokens TOKENLIST AS (TOKENIZE_FULLTEXT(title || ' ' || content)) HIDDEN"
    }, {
      "name": "titleTokens",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN titleTokens TOKENLIST AS (TOKENIZE_FULLTEXT(title)) HIDDEN"
    }, {
      "name": "contentTokens",
      "addColumnDdl": "ALTER TABLE TextTable ADD COLUMN contentTokens TOKENLIST AS (TOKENIZE_FULLTEXT(content)) HIDDEN"
    }],
    "createTableDdl": "CREATE TABLE TextTable (id STRING(MAX) NOT NULL, uploaderId STRING(MAX) NOT NULL, title STRING(MAX) NOT NULL, content STRING(MAX) NOT NULL, updatedTimeMs INT64 NOT NULL, index INT64 NOT NULL, textTokens TOKENLIST AS (TOKENIZE_FULLTEXT(title || ' ' || content)) HIDDEN, titleTokens TOKENLIST AS (TOKENIZE_FULLTEXT(title)) HIDDEN, contentTokens TOKENLIST AS (TOKENIZE_FULLTEXT(content)) HIDDEN) PRIMARY KEY (id ASC)",
    "indexes": [{
      "name": "ByText",
      "createIndexDdl": "CREATE SEARCH INDEX ByText ON TextTable(textTokens)"
    }, {
      "name": "ByTitleAndContent",
      "createIndexDdl": "CREATE SEARCH INDEX ByTitleAndContent ON TextTable(titleTokens, contentTokens) PARTITION BY uploaderId ORDER BY updatedTimeMs, index DESC"
    }]
  }]
}`),
          "ddl",
        );
        assertThat(
          outputContentMap.get("./database/queries").build(),
          eqLongStr(
            `import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface SearchTextRow {
  textTableId?: string,
  textTableUploaderId?: string,
  textTableTitle?: string,
  textTableContent?: string,
  textTableUpdatedTimeMs?: number,
  textTableIndex?: number,
}

export let SEARCH_TEXT_ROW: MessageDescriptor<SearchTextRow> = {
  name: 'SearchTextRow',
  fields: [{
    name: 'textTableId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'textTableUploaderId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'textTableTitle',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'textTableContent',
    index: 4,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'textTableUpdatedTimeMs',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'textTableIndex',
    index: 6,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function searchText(
  runner: Database | Transaction,
  textTableTextTokensSearch: string,
  textTableTextTokensScoreWhere: string,
  textTableTextTokensScoreLt: number,
  textTableTextTokensScoreOrderBy: string,
  limit: number,
): Promise<Array<SearchTextRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TextTable.id, TextTable.uploaderId, TextTable.title, TextTable.content, TextTable.updatedTimeMs, TextTable.index FROM TextTable WHERE (SEARCH(TextTable.textTokens, @textTableTextTokensSearch) AND SCORE(TextTable.textTokens, @textTableTextTokensScoreWhere) < @textTableTextTokensScoreLt) ORDER BY SCORE(TextTable.textTokens, @textTableTextTokensScoreOrderBy) DESC LIMIT @limit",
    params: {
      textTableTextTokensSearch: textTableTextTokensSearch,
      textTableTextTokensScoreWhere: textTableTextTokensScoreWhere,
      textTableTextTokensScoreLt: Spanner.float(textTableTextTokensScoreLt),
      textTableTextTokensScoreOrderBy: textTableTextTokensScoreOrderBy,
      limit: limit.toString(),
    },
    types: {
      textTableTextTokensSearch: { type: "string" },
      textTableTextTokensScoreWhere: { type: "string" },
      textTableTextTokensScoreLt: { type: "float64" },
      textTableTextTokensScoreOrderBy: { type: "string" },
      limit: { type: "int53" },
    }
  });
  let resRows = new Array<SearchTextRow>();
  for (let row of rows) {
    resRows.push({
      textTableId: row.at(0).value == null ? undefined : row.at(0).value,
      textTableUploaderId: row.at(1).value == null ? undefined : row.at(1).value,
      textTableTitle: row.at(2).value == null ? undefined : row.at(2).value,
      textTableContent: row.at(3).value == null ? undefined : row.at(3).value,
      textTableUpdatedTimeMs: row.at(4).value == null ? undefined : row.at(4).value.valueOf(),
      textTableIndex: row.at(5).value == null ? undefined : row.at(5).value.valueOf(),
    });
  }
  return resRows;
}

export interface SearchTitleAndContentRow {
  textTableId?: string,
}

export let SEARCH_TITLE_AND_CONTENT_ROW: MessageDescriptor<SearchTitleAndContentRow> = {
  name: 'SearchTitleAndContentRow',
  fields: [{
    name: 'textTableId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function searchTitleAndContent(
  runner: Database | Transaction,
  textTableUploaderIdEq: string,
  textTableTitleTokensSearch: string,
  textTableContentTokensSearch: string,
): Promise<Array<SearchTitleAndContentRow>> {
  let [rows] = await runner.run({
    sql: "SELECT TextTable.id FROM TextTable WHERE (TextTable.uploaderId = @textTableUploaderIdEq AND (SEARCH(TextTable.titleTokens, @textTableTitleTokensSearch) OR SEARCH(TextTable.contentTokens, @textTableContentTokensSearch))) ORDER BY TextTable.updatedTimeMs, TextTable.index DESC",
    params: {
      textTableUploaderIdEq: textTableUploaderIdEq,
      textTableTitleTokensSearch: textTableTitleTokensSearch,
      textTableContentTokensSearch: textTableContentTokensSearch,
    },
    types: {
      textTableUploaderIdEq: { type: "string" },
      textTableTitleTokensSearch: { type: "string" },
      textTableContentTokensSearch: { type: "string" },
    }
  });
  let resRows = new Array<SearchTitleAndContentRow>();
  for (let row of rows) {
    resRows.push({
      textTableId: row.at(0).value == null ? undefined : row.at(0).value,
    });
  }
  return resRows;
}
`,
          ),
          "sql",
        );
      },
    },
    {
      name: "SearchColumnIsNotString",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "int53",
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content", "updatedTimeMs"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "column updatedTimeMs is not a string and cannot be used in a search column",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SearchColumnIsAnArray",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                      isArray: true,
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "column content is an array and cannot be used in a search column",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SearchIndexNotReferringSearchColumn",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "int53",
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content"],
                    },
                  ],
                  searchIndexes: [
                    {
                      name: "ByUpdatedTimeMs",
                      columns: ["updatedTimeMs"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error(
              "search column updatedTimeMs is not found in the table TextTable",
            ),
          ),
          "error",
        );
      },
    },
    {
      name: "SearchIndexPartitionColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "int53",
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content"],
                    },
                  ],
                  searchIndexes: [
                    {
                      name: "ByUpdatedTimeMs",
                      columns: ["tokens"],
                      partitionByColumns: ["nonExistent"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error("column nonExistent is not found in the table TextTable"),
          ),
          "error",
        );
      },
    },
    {
      name: "SearchIndexOrderByColumnNotFound",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "int53",
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content"],
                    },
                  ],
                  searchIndexes: [
                    {
                      name: "ByUpdatedTimeMs",
                      columns: ["tokens"],
                      orderByColumns: ["nonExistent"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(
            new Error("column nonExistent is not found in the table TextTable"),
          ),
          "error",
        );
      },
    },
    {
      name: "SearchIndexOrderByColumnIsNotInt",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "float64",
                    },
                  ],
                  primaryKeys: ["id"],
                  searchColumns: [
                    {
                      name: "tokens",
                      columnRefs: ["content"],
                    },
                  ],
                  searchIndexes: [
                    {
                      name: "ByUpdatedTimeMs",
                      columns: ["tokens"],
                      orderByColumns: ["updatedTimeMs"],
                    },
                  ],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("order by column updatedTimeMs is not an int53")),
          "error",
        );
      },
    },
    {
      name: "SearchQuery",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver =
          new (class extends MockDefinitionResolver {})();

        // Execute
        let error = assertThrow(() =>
          new SpannerDatabaseGenerator(
            "./database/user",
            {
              kind: "SpannerDatabase",
              name: "UserDatabase",
              tables: [
                {
                  kind: "Table",
                  name: "TextTable",
                  columns: [
                    {
                      name: "id",
                      type: "string",
                    },
                    {
                      name: "content",
                      type: "string",
                    },
                    {
                      name: "updatedTimeMs",
                      type: "float64",
                    },
                  ],
                  primaryKeys: ["id"],
                },
              ],
              selects: [
                {
                  name: "SearchText",
                  from: "TextTable",
                  where: {
                    op: "SEARCH",
                    lColumn: "content",
                  },
                  withLimit: true,
                  getAllColumnsFrom: ["TextTable"],
                },
              ],
              outputDdl: "./database/schema_ddl",
              outputSql: "./database/queries",
            },
            mockDefinitionResolver,
            outputContentMap,
          ).generate(),
        );

        // Verify
        assertThat(
          error,
          eqError(new Error("search column content is not found in the table TextTable")),
          "error",
        );
      },
    },
  ],
});
