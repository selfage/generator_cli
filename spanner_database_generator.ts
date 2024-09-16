import {
  SpannerColumnRef,
  SpannerDatabaseDefinition,
  SpannerDeleteDefinition,
  SpannerInsertDefinition,
  SpannerJoinOnGate,
  SpannerJoinOnLeaf,
  SpannerSelectDefinition,
  SpannerTableColumnDefinition,
  SpannerTableDefinition,
  SpannerUpdateDefinition,
  SpannerWhereGate,
  SpannerWhereLeaf,
} from "./definition";
import { MessageResolver } from "./message_resolver";
import {
  OutputContentBuilder,
  SimpleContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import {
  joinArray,
  toInitalLowercased,
  toInitialUppercased,
  toUppercaseSnaked,
} from "./util";

let COLUMN_PRIMITIVE_TYPE_TO_TS_TYPE = new Map<string, string>([
  ["bool", "boolean"],
  ["int64", "bigint"],
  ["float64", "number"],
  ["timestamp", "number"],
  ["string", "string"],
  ["bytes", "Buffer"],
]);
let COLUMN_PRIMITIVE_TYPE_TO_TABLE_TYPE = new Map<string, string>([
  ["bool", "BOOL"],
  ["int64", "INT64"],
  ["float64", "FLOAT64"],
  ["timestamp", "TIMESTAMP"],
  ["string", "STRING(MAX)"],
  ["bytes", "BYTES(MAX)"],
]);
let ALL_GATE_OP = new Set().add("AND").add("OR");
let ALL_JOIN_LEAF_OP = new Set()
  .add(">")
  .add("<")
  .add(">=")
  .add("<=")
  .add("!=")
  .add("=");
let ALL_WHERE_LEAF_OP = new Set()
  .add(">")
  .add("<")
  .add(">=")
  .add("<=")
  .add("!=")
  .add("=")
  .add("IS NULL")
  .add("IS NOT NULL");
let INEQUAL_OP = new Set().add(">").add("<").add(">=").add("<=");
let COLUMN_INEQUAL_TYPE = new Set()
  .add("int64")
  .add("float64")
  .add("timestamp");
let ALL_JOIN_TYPE = new Set()
  .add("INNER")
  .add("CROSS")
  .add("FULL")
  .add("LEFT")
  .add("RIGHT");

function getColumnDefinition(
  loggingPrefix: string,
  table: SpannerTableDefinition,
  columnName: string,
): SpannerTableColumnDefinition {
  for (let column of table.columns) {
    if (column.name === columnName) {
      return column;
    }
  }
  throw new Error(
    `${loggingPrefix} column ${columnName} is not found in the table ${table.name}.`,
  );
}

function resolveColumnDefinition(
  loggingPrefix: string,
  columnRef: SpannerColumnRef,
  tableAliases: Map<string, string>,
  databaseTables: Map<string, SpannerTableDefinition>,
): SpannerTableColumnDefinition {
  let tableName = tableAliases.get(columnRef.table);
  if (!tableName) {
    throw new Error(
      `${loggingPrefix} ${columnRef.table}.${columnRef.name} refers to a table not found in the query.`,
    );
  }
  // Its presence should have checked elsewhere.
  let table = databaseTables.get(tableName);
  let columnDefinition = getColumnDefinition(
    loggingPrefix,
    table,
    columnRef.name,
  );
  return columnDefinition;
}

class InputCollector {
  public args = new Array<string>();
  public queryTypes = new Array<string>();
  public conversions = new Array<string>();

  public constructor(
    private messageResolver: MessageResolver,
    private tsContentBuilder: TsContentBuilder,
  ) {}

  public collect(
    loggingPrefix: string,
    argVariable: string,
    columnDefinition: SpannerTableColumnDefinition,
  ): void {
    let tsType = COLUMN_PRIMITIVE_TYPE_TO_TS_TYPE.get(columnDefinition.type);
    let queryType: string;
    let conversion: string;
    if (!tsType) {
      let typeDefinition = this.messageResolver.resolve(
        loggingPrefix,
        columnDefinition.type,
        columnDefinition.import,
      );
      this.tsContentBuilder.importFromDefinition(
        columnDefinition.import,
        columnDefinition.type,
      );
      if (typeDefinition.enum) {
        this.tsContentBuilder.importFromSpanner("Spanner");
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.enum.name;
          queryType = `{ type: "float64" }`;
          conversion = `Spanner.float(${argVariable})`;
        } else {
          tsType = `Array<${typeDefinition.enum.name}>`;
          queryType = `{ type: "array", child: { type: "float64" } }`;
          conversion = `${argVariable}.map((e) => Spanner.float(e))`;
        }
      } else if (typeDefinition.message) {
        this.tsContentBuilder.importFromMessageSerializer("serializeMessage");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.message.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.message.name;
          queryType = `{ type: "bytes" }`;
          conversion = `Buffer.from(serializeMessage(${argVariable}, ${tsTypeDescriptor}).buffer)`;
        } else {
          tsType = `Array<${typeDefinition.message.name}>`;
          queryType = `{ type: "array", child: { type: "bytes" } }`;
          conversion = `${argVariable}.map((e) => Buffer.from(serializeMessage(e, ${tsTypeDescriptor}).buffer))`;
        }
      }
    } else {
      if (!columnDefinition.isArray) {
        queryType = `{ type: "${columnDefinition.type}" }`;
        switch (columnDefinition.type) {
          case "int64":
            conversion = `${argVariable}.toString()`;
            break;
          case "float64":
            this.tsContentBuilder.importFromSpanner("Spanner");
            conversion = `Spanner.float(${argVariable})`;
            break;
          case "timestamp":
            conversion = `new Date(${argVariable}).toISOString()`;
            break;
          // bool, string, bytes
          default:
            conversion = `${argVariable}`;
        }
      } else {
        queryType = `{ type: "array", child: { type: "${columnDefinition.type}" } }`;
        tsType = `Array<${tsType}>`;
        switch (columnDefinition.type) {
          case "int64":
            conversion = `${argVariable}.map((e) => e.toString())`;
            break;
          case "float64":
            this.tsContentBuilder.importFromSpanner("Spanner");
            conversion = `${argVariable}.map((e) => Spanner.float(e))`;
            break;
          case "timestamp":
            conversion = `${argVariable}.map((e) => new Date(e).toISOString())`;
            break;
          // bool, string, bytes
          default:
            conversion = `${argVariable}`;
        }
      }
    }

    this.args.push(`${argVariable}: ${tsType}`);
    this.queryTypes.push(`${argVariable}: ${queryType}`);
    this.conversions.push(`${argVariable}: ${conversion}`);
  }
}

export class OuputCollector {
  public fields = new Array<string>();
  public conversions = new Array<string>();

  public constructor(
    private messageResolver: MessageResolver,
    private tsContentBuilder: TsContentBuilder,
  ) {}

  public collect(
    loggingPrefix: string,
    fieldName: string,
    columnIndex: number,
    columnDefinition: SpannerTableColumnDefinition,
  ): void {
    let columnVariable = `row.at(${columnIndex})`;
    let tsType = COLUMN_PRIMITIVE_TYPE_TO_TS_TYPE.get(columnDefinition.type);
    let conversion: string;
    if (!tsType) {
      let typeDefinition = this.messageResolver.resolve(
        loggingPrefix,
        columnDefinition.type,
        columnDefinition.import,
      );
      this.tsContentBuilder.importFromDefinition(
        columnDefinition.import,
        columnDefinition.type,
      );
      if (typeDefinition.enum) {
        this.tsContentBuilder.importFromMessageSerializer("toEnumFromNumber");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.enum.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.enum.name;
          conversion = `toEnumFromNumber(${columnVariable}.value.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.enum.name}>`;
          conversion = `${columnVariable}.value.map((e) => toEnumFromNumber(e.value, ${tsTypeDescriptor}))`;
        }
      } else if (typeDefinition.message) {
        this.tsContentBuilder.importFromMessageSerializer("deserializeMessage");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.message.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.message.name;
          conversion = `deserializeMessage(${columnVariable}.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.message.name}>`;
          conversion = `${columnVariable}.value.map((e) => deserializeMessage(e, ${tsTypeDescriptor}))`;
        }
      }
    } else {
      if (!columnDefinition.isArray) {
        switch (columnDefinition.type) {
          case "int64":
            conversion = `BigInt(${columnVariable}.value.value)`;
            break;
          case "float64":
            conversion = `${columnVariable}.value.value`;
            break;
          case "timestamp":
            conversion = `${columnVariable}.value.getMicroseconds()`;
            break;
          default:
            conversion = `${columnVariable}.value`;
            break;
        }
      } else {
        tsType = `Array<${tsType}>`;
        switch (columnDefinition.type) {
          case "int64":
            conversion = `${columnVariable}.value.map((e) => BigInt(e.value.value))`;
            break;
          case "float64":
            conversion = `${columnVariable}.value.map((e) => e.value)`;
            break;
          case "timestamp":
            conversion = `${columnVariable}.value.map((e) => e.getMicroseconds())`;
            break;
          default:
            conversion = `${columnVariable}.value`;
            break;
        }
      }
    }
    this.fields.push(`${fieldName}?: ${tsType}`);
    this.conversions.push(
      `${fieldName}: ${columnVariable}.value == null ? undefined : ${conversion}`,
    );
  }
}

class WhereClauseGenerator {
  public constructor(
    private loggingPrefix: string,
    private defaultTableAlias: string,
    private tableAliases: Map<string, string>,
    private databaseTables: Map<string, SpannerTableDefinition>,
    private inputCollector: InputCollector,
  ) {}

  public generate(where: SpannerWhereGate | SpannerWhereLeaf): string {
    switch (where.type) {
      case "gate":
        return this.generateGate(where);
      case "leaf":
        return this.generateLeaf(where);
      default:
        throw new Error(
          `${this.loggingPrefix} a new case in SpannerWhere is not handled.`,
        );
    }
  }

  private generateLeaf(leaf: SpannerWhereLeaf): string {
    if (!leaf.leftColumn) {
      throw new Error(`${this.loggingPrefix} "leftColumn" is missing.`);
    }
    leaf.leftColumn.table = leaf.leftColumn.table ?? this.defaultTableAlias;
    let columnDefinition = resolveColumnDefinition(
      this.loggingPrefix,
      leaf.leftColumn,
      this.tableAliases,
      this.databaseTables,
    );
    if (!ALL_WHERE_LEAF_OP.has(leaf.op)) {
      throw new Error(
        `${this.loggingPrefix} "op" is either missing or not one of valid types "${Array.from(ALL_WHERE_LEAF_OP).join(",")}"`,
      );
    }
    if (leaf.op === "IS NULL" || leaf.op === "IS NOT NULL") {
      if (!columnDefinition.nullable) {
        throw new Error(
          `${this.loggingPrefix} column ${leaf.leftColumn.table}.${leaf.leftColumn.name} is not nullable and doesn't need to check NULL in the query.`,
        );
      }
      return `${leaf.leftColumn.table}.${leaf.leftColumn.name} ${leaf.op}`;
    } else {
      if (
        INEQUAL_OP.has(leaf.op) &&
        !COLUMN_INEQUAL_TYPE.has(columnDefinition.type)
      ) {
        throw new Error(
          `${this.loggingPrefix} operator ${leaf.op} cannot be used on the column ${leaf.leftColumn.table}.${leaf.leftColumn.name} whose type is ${columnDefinition.type}.`,
        );
      }

      let argVariable = `${toInitalLowercased(leaf.leftColumn.table)}${toInitialUppercased(leaf.leftColumn.name)}`;
      this.inputCollector.collect(
        this.loggingPrefix,
        argVariable,
        columnDefinition,
      );
      return `${leaf.leftColumn.table}.${leaf.leftColumn.name} ${leaf.op} @${argVariable}`;
    }
  }

  private generateGate(gate: SpannerWhereGate): string {
    if (!gate.left) {
      throw new Error(`${this.loggingPrefix} "left" is missing.`);
    }
    let leftClause = this.generate(gate.left);
    if (!gate.right) {
      throw new Error(`${this.loggingPrefix} "right" is missing.`);
    }
    let rightClause = this.generate(gate.right);
    if (!ALL_GATE_OP.has(gate.op)) {
      throw new Error(
        `${this.loggingPrefix} "op" is either missing or not one of valid types "${Array.from(ALL_GATE_OP).join(",")}"`,
      );
    }
    return `(${leftClause} ${gate.op} ${rightClause})`;
  }
}

class JoinOnClauseGenerator {
  public constructor(
    private loggingPrefix: string,
    private defaultTableAlias: string,
    private rightTable: SpannerTableDefinition,
    private rightTableAlias: string,
    private tableAliases: Map<string, string>,
    private databaseTables: Map<string, SpannerTableDefinition>,
  ) {}

  public generate(joinOn: SpannerJoinOnGate | SpannerJoinOnLeaf): string {
    switch (joinOn.type) {
      case "gate":
        return this.generateGate(joinOn);
      case "leaf":
        return this.generateLeaf(joinOn);
      default:
        throw new Error(
          `${this.loggingPrefix} a new case in SpannerJoinOn is not handled.`,
        );
    }
  }

  public generateLeaf(leaf: SpannerJoinOnLeaf): string {
    if (!leaf.leftColumn) {
      throw new Error(`${this.loggingPrefix} "leftColumn" is missing.`);
    }
    leaf.leftColumn.table = leaf.leftColumn.table ?? this.defaultTableAlias;
    let leftColumnDefinition = resolveColumnDefinition(
      this.loggingPrefix,
      leaf.leftColumn,
      this.tableAliases,
      this.databaseTables,
    );
    if (!leaf.rightColumn) {
      throw new Error(`${this.loggingPrefix} "rightColumn" is missing.`);
    }
    let rightColumnDefinition = getColumnDefinition(
      this.loggingPrefix,
      this.rightTable,
      leaf.rightColumn,
    );
    if (leftColumnDefinition.type !== rightColumnDefinition.type) {
      throw new Error(
        `${this.loggingPrefix} the left column ${leaf.leftColumn.table}.${leaf.leftColumn.name} whose type is ${leftColumnDefinition.type} doesn't match the right column ${this.rightTableAlias}.${leaf.rightColumn} whose type is ${rightColumnDefinition.type}.`,
      );
    }
    if (!ALL_JOIN_LEAF_OP.has(leaf.op)) {
      throw new Error(
        `${this.loggingPrefix} "op" is either missing or not one of valid types "${Array.from(ALL_JOIN_LEAF_OP).join(",")}".`,
      );
    }
    if (
      INEQUAL_OP.has(leaf.op) &&
      !COLUMN_INEQUAL_TYPE.has(leftColumnDefinition.type)
    ) {
      throw new Error(
        `${this.loggingPrefix} operator ${leaf.op} cannot be used to compare the left column ${leaf.leftColumn.table}.${leaf.leftColumn.name} and the right column ${this.rightTableAlias}.${leaf.rightColumn}.`,
      );
    }
    return `${leaf.leftColumn.table}.${leaf.leftColumn.name} ${leaf.op} ${this.rightTableAlias}.${leaf.rightColumn}`;
  }

  public generateGate(gate: SpannerJoinOnGate): string {
    if (!gate.left) {
      throw new Error(`${this.loggingPrefix} "left" is missing.`);
    }
    let leftClause = this.generate(gate.left);
    if (!gate.right) {
      throw new Error(`${this.loggingPrefix} "right" is missing.`);
    }
    let rightClause = this.generate(gate.right);
    if (!ALL_GATE_OP.has(gate.op)) {
      throw new Error(
        `${this.loggingPrefix} "op" is either missing or not one of valid types "${Array.from(ALL_GATE_OP).join(",")}"`,
      );
    }
    return `(${leftClause} ${gate.op} ${rightClause})`;
  }
}

export function generateSpannerDatabase(
  definitionModulePath: string,
  spannerDatabaseDefinition: SpannerDatabaseDefinition,
  messageResolver: MessageResolver,
  outputContentMap: Map<string, OutputContentBuilder>,
) {
  if (!spannerDatabaseDefinition.name) {
    throw new Error(`"name" is missing on a spannerDatabase.`);
  }
  if (!spannerDatabaseDefinition.outputDdl) {
    throw new Error(
      `"outputDdl" is missing on spannerDatabase ${spannerDatabaseDefinition.name}.`,
    );
  }
  let outputDdlContentBuilder = SimpleContentBuilder.get(
    outputContentMap,
    ".json",
    spannerDatabaseDefinition.outputDdl,
  );
  let databaseTables = new Map<string, SpannerTableDefinition>();
  let tableDdls = new Array<string>();
  if (!spannerDatabaseDefinition.tables) {
    throw new Error(
      `"tables" is missing on spannerDatabase ${spannerDatabaseDefinition.name}.`,
    );
  }
  for (let table of spannerDatabaseDefinition.tables) {
    tableDdls.push(
      generateSpannerTable(table, databaseTables, messageResolver),
    );
  }
  outputDdlContentBuilder.push(`{
  "tables": [${tableDdls.join(", ")}]
}`);

  if (!spannerDatabaseDefinition.outputSql) {
    throw new Error(
      `"outputSql" is missing on spannerDatabase ${spannerDatabaseDefinition.name}.`,
    );
  }
  let tsContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
    spannerDatabaseDefinition.outputSql,
  );
  if (spannerDatabaseDefinition.selects) {
    for (let selectDefinition of spannerDatabaseDefinition.selects) {
      generateSpannerSelect(
        selectDefinition,
        databaseTables,
        messageResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.inserts) {
    for (let insertDefinition of spannerDatabaseDefinition.inserts) {
      generateSpannerInsert(
        insertDefinition,
        databaseTables,
        messageResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.updates) {
    for (let updateDefinition of spannerDatabaseDefinition.updates) {
      generateSpannerUpdate(
        updateDefinition,
        databaseTables,
        messageResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.deletes) {
    for (let deleteDefinition of spannerDatabaseDefinition.deletes) {
      generateSpannerDelete(
        deleteDefinition,
        databaseTables,
        messageResolver,
        tsContentBuilder,
      );
    }
  }
}

function generateSpannerTable(
  table: SpannerTableDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  messageResolver: MessageResolver,
): string {
  if (!table.name) {
    throw new Error(`"name" is missing on a spanner table.`);
  }

  let loggingPrefix = `When generating DDL for table ${table.name},`;
  let addColumnDdls = new Array<string>();
  let createColumnPartialDdls = new Array<string>();
  if (!table.columns) {
    throw new Error(`${loggingPrefix} "columns" is missing.`);
  }
  for (let i = 0; i < table.columns.length; i++) {
    let column = table.columns[i];
    if (!column.name) {
      throw new Error(`${loggingPrefix} "name" is mssing on a column.`);
    }
    if (!column.type) {
      throw new Error(
        `${loggingPrefix} "type" is missing on column ${column.name}.`,
      );
    }
    let type = COLUMN_PRIMITIVE_TYPE_TO_TABLE_TYPE.get(column.type);
    if (column.allowCommitTimestamp) {
      if (column.type !== "timestamp") {
        throw new Error(
          `${loggingPrefix} column ${column.type} is not timestamp and cannot set allowCommitTimestamp to true.`,
        );
      }
      if (column.isArray) {
        throw new Error(
          `${loggingPrefix} column ${column.type} is an array and cannot set allowCommitTimestamp to true.`,
        );
      }
    }

    if (!type) {
      let definition = messageResolver.resolve(
        loggingPrefix,
        column.type,
        column.import,
      );
      if (definition.enum) {
        type = "FLOAT64";
      } else if (definition.message) {
        type = "BYTES(MAX)";
      }
    }
    let partialDdl = `${column.name} ${column.isArray ? "Array<" + type + ">" : type}${column.nullable ? "" : " NOT NULL"}${column.allowCommitTimestamp ? " OPTIONS (allow_commit_timestamp = true)" : ""}`;
    createColumnPartialDdls.push(partialDdl);
    addColumnDdls.push(`{
      "name": "${column.name}",
      "addColumnDdl": "ALTER TABLE ${table.name} ADD COLUMN ${partialDdl}"
    }`);
  }

  let primaryKeys = new Array<string>();
  if (!table.primaryKeys) {
    throw new Error(`${loggingPrefix} "primaryKeys" is missing.`);
  }
  for (let key of table.primaryKeys) {
    if (!key.column) {
      throw new Error(
        `${loggingPrefix} "column" is missing in "primaryKeys" field.`,
      );
    }
    let columnDefinition = getColumnDefinition(
      loggingPrefix + " and when generating primary keys,",
      table,
      key.column,
    );
    if (columnDefinition.isArray) {
      throw new Error(
        `${loggingPrefix} column ${key} is an array and cannot be used as a primary key.`,
      );
    }
    primaryKeys.push(`${key.column} ${key.desc ? "DESC" : "ASC"}`);
  }

  let interleaveOption = "";
  if (table.interleave) {
    if (!table.interleave.parentTable) {
      throw new Error(
        `${loggingPrefix} "parentTable" is missing in "interleave" field.`,
      );
    }
    let parentTable = databaseTables.get(table.interleave.parentTable);
    if (!parentTable) {
      throw new Error(
        `${loggingPrefix} the parent table ${table.interleave.parentTable} is not found in the database.`,
      );
    }
    if (parentTable.primaryKeys.length >= table.primaryKeys.length) {
      throw new Error(
        `${loggingPrefix} pimary keys of the child table should be more than the parent table ${table.interleave.parentTable}.`,
      );
    }
    for (let i = 0; i < parentTable.primaryKeys.length; i++) {
      if (parentTable.primaryKeys[i].column !== table.primaryKeys[i].column) {
        throw new Error(
          `${loggingPrefix} at position ${i}, pimary key "${table.primaryKeys[i].column}" doesn't match the key "${parentTable.primaryKeys[i].column}" of the parent table.`,
        );
      }
      if (parentTable.primaryKeys[i].desc !== table.primaryKeys[i].desc) {
        throw new Error(
          `${loggingPrefix} at position ${i}, pimary key "${table.primaryKeys[i].column}" is ${table.primaryKeys[i].desc ? "DESC" : "ASC"} which doesn't match the key of the parent table.`,
        );
      }
      let parentColumnDefinition = getColumnDefinition(
        loggingPrefix + "and when validating interleaving,",
        parentTable,
        parentTable.primaryKeys[i].column,
      );
      let childColumnDefinition = getColumnDefinition(
        loggingPrefix + "and when validating interleaving,",
        table,
        table.primaryKeys[i].column,
      );
      if (parentColumnDefinition.type !== childColumnDefinition.type) {
        throw new Error(
          `${loggingPrefix} at position ${i}, primary key ${childColumnDefinition.name}'s type "${childColumnDefinition.type}" doesn't match the type "${parentColumnDefinition.type}" of the parent table. `,
        );
      }
    }
    interleaveOption = `, INTERLEAVE IN PARENT ${table.interleave.parentTable}${table.interleave.cascadeOnDelete ? " ON DELETE CASCADE" : ""}`;
  }

  let indexDdls = new Array<string>();
  if (table.indexes) {
    for (let index of table.indexes) {
      if (!index.name) {
        throw new Error(
          `${loggingPrefix} "name" is missing in one element of "indexes" field.`,
        );
      }
      let indexColumns = new Array<string>();
      if (!index.columns) {
        throw new Error(
          `${loggingPrefix} "columns" is missing in index ${index.name}.`,
        );
      }
      for (let column of index.columns) {
        getColumnDefinition(
          loggingPrefix + " and when generating indexes,",
          table,
          column,
        );
        indexColumns.push(column);
      }

      indexDdls.push(`{
      "name": "${index.name}",
      "createIndexDdl": "CREATE INDEX${index.unique ? " UNIQUE" : ""}${index.nullFiltered ? " NULL_FILTERED" : ""} ${index.name} ON ${table.name}(${indexColumns.join(", ")})"
    }`);
    }
  }

  databaseTables.set(table.name, table);
  return `{
    "name": "${table.name}",
    "columns": [${addColumnDdls.join(", ")}],
    "createTableDdl": "CREATE TABLE ${table.name} (${createColumnPartialDdls.join(", ")}) PRIMARY KEY (${primaryKeys.join(", ")})${interleaveOption}",
    "indexes": [${indexDdls.join(", ")}]
  }`;
}

function generateSpannerSelect(
  selectDefinition: SpannerSelectDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  messageResolver: MessageResolver,
  tsContentBuilder: TsContentBuilder,
) {
  if (!selectDefinition.name) {
    throw new Error(`"name" is missing on a spanner select definition.`);
  }
  let loggingPrefix = `When generating select statement ${selectDefinition.name},`;
  let tableAliases = new Map<string, string>();
  if (!selectDefinition.fromTable.name) {
    throw new Error(`${loggingPrefix} "name" is missing in "fromTable" field.`);
  }
  let defaultTableAlias =
    selectDefinition.fromTable.as ?? selectDefinition.fromTable.name;
  tableAliases.set(defaultTableAlias, selectDefinition.fromTable.name);
  if (!databaseTables.has(selectDefinition.fromTable.name)) {
    throw new Error(
      `${loggingPrefix} table ${selectDefinition.fromTable.name} is not found in the database.`,
    );
  }

  let fromTables = new Array<string>();
  fromTables.push(
    `${selectDefinition.fromTable.name}${selectDefinition.fromTable.as ? " AS " + selectDefinition.fromTable.as : ""}`,
  );
  if (selectDefinition.join) {
    for (let joinTable of selectDefinition.join) {
      if (!joinTable.table) {
        throw new Error(`${loggingPrefix} "table" is missing in "join" field.`);
      }
      if (!joinTable.table.name) {
        throw new Error(
          `${loggingPrefix} "name" is missing in "join.table" field.`,
        );
      }
      tableAliases.set(
        joinTable.table.as ?? joinTable.table.name,
        joinTable.table.name,
      );
      let rightTable = databaseTables.get(joinTable.table.name);
      if (!rightTable) {
        throw new Error(
          `${loggingPrefix} table ${joinTable.table.name} is not found in the database.`,
        );
      }
      let joinOnClause = "";
      if (joinTable.on) {
        joinOnClause = new JoinOnClauseGenerator(
          loggingPrefix + ` and when joining ${rightTable.name},`,
          defaultTableAlias,
          rightTable,
          joinTable.table.as ?? joinTable.table.name,
          tableAliases,
          databaseTables,
        ).generate(joinTable.on);
        joinOnClause = ` ON ${joinOnClause}`;
      }
      if (!ALL_JOIN_TYPE.has(joinTable.type)) {
        throw new Error(
          `${loggingPrefix} and when joining ${rightTable.name}, "type" is either missing or not one of valid types "${Array.from(ALL_JOIN_TYPE).join(",")}"`,
        );
      }
      fromTables.push(
        `${joinTable.type} JOIN ${joinTable.table.name}${joinTable.table.as ? " AS " + joinTable.table.as : ""}${joinOnClause}`,
      );
    }
  }

  let whereClause = "";
  let inputCollector = new InputCollector(messageResolver, tsContentBuilder);
  if (selectDefinition.where) {
    whereClause = new WhereClauseGenerator(
      loggingPrefix + " and when generating where clause,",
      defaultTableAlias,
      tableAliases,
      databaseTables,
      inputCollector,
    ).generate(selectDefinition.where);
    whereClause = ` WHERE ${whereClause}`;
  }

  let orderByClause = "";
  if (selectDefinition.orderBy) {
    let orderByColumns = new Array<string>();
    for (let i = 0; i < selectDefinition.orderBy.length; i++) {
      let column = selectDefinition.orderBy[i];
      column.column.table = column.column.table ?? defaultTableAlias;
      resolveColumnDefinition(
        loggingPrefix + " and when generating order by clause,",
        column.column,
        tableAliases,
        databaseTables,
      );
      orderByColumns.push(
        `${column.column.table}.${column.column.name}${column.desc ? " DESC" : ""}`,
      );
    }
    orderByClause = ` ORDER BY ${orderByColumns.join(", ")}`;
  }

  let limitClause = "";
  if (selectDefinition.limit) {
    limitClause = ` LIMIT ${selectDefinition.limit}`;
  }

  let selectColumns = new Array<string>();
  let outputCollector = new OuputCollector(messageResolver, tsContentBuilder);
  for (let i = 0; i < selectDefinition.getColumns.length; i++) {
    let column = selectDefinition.getColumns[i];
    column.table = column.table ?? defaultTableAlias;
    let columnDefinition = resolveColumnDefinition(
      loggingPrefix + " and when generating select columns,",
      column,
      tableAliases,
      databaseTables,
    );
    let fieldName = `${toInitalLowercased(column.table)}${toInitialUppercased(column.name)}`;
    outputCollector.collect(loggingPrefix, fieldName, i, columnDefinition);
    selectColumns.push(`${column.table}.${column.name}`);
  }

  tsContentBuilder.importFromSpannerTransaction(
    "ExecuteSqlRequest",
    "RunResponse",
  );
  tsContentBuilder.push(`
export interface ${selectDefinition.name}Row {${joinArray(outputCollector.fields, "\n  ", ",")}
}

export async function ${toInitalLowercased(selectDefinition.name)}(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,${joinArray(inputCollector.args, "\n  ", ",")}
): Promise<Array<${selectDefinition.name}Row>> {
  let [rows] = await run({
    sql: "SELECT ${selectColumns.join(", ")} FROM ${fromTables.join(" ")}${whereClause}${orderByClause}${limitClause}",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  });
  let resRows = new Array<${selectDefinition.name}Row>();
  for (let row of rows) {
    resRows.push({${joinArray(outputCollector.conversions, "\n      ", ",")}
    });
  }
  return resRows;
}
`);
}

function generateSpannerInsert(
  insertDefinition: SpannerInsertDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  messageResolver: MessageResolver,
  tsContentBuilder: TsContentBuilder,
) {
  if (!insertDefinition.name) {
    throw new Error(`"name" is missing on a spanner insert definition.`);
  }
  let loggingPrefix = `When generating insert statement ${insertDefinition.name},`;
  if (!insertDefinition.table) {
    throw new Error(`${loggingPrefix} "table" is missing.`);
  }
  let table = databaseTables.get(insertDefinition.table);
  if (!table) {
    throw new Error(
      `${loggingPrefix} table ${insertDefinition.table} is not found in the database's definition.`,
    );
  }

  let columns = new Array<string>();
  let values = new Array<string>();
  let inputCollector = new InputCollector(messageResolver, tsContentBuilder);
  if (!insertDefinition.setColumns) {
    throw new Error(`${loggingPrefix} "setColumns" is missing.`);
  }
  for (let column of insertDefinition.setColumns) {
    let columnDefinition = getColumnDefinition(loggingPrefix, table, column);
    columns.push(column);
    let argVariable = toInitalLowercased(column);
    if (columnDefinition.allowCommitTimestamp) {
      values.push(`PENDING_COMMIT_TIMESTAMP()`);
    } else {
      inputCollector.collect(loggingPrefix, argVariable, columnDefinition);
      values.push(`@${argVariable}`);
    }
  }

  tsContentBuilder.importFromSpannerTransaction(
    "ExecuteSqlRequest",
    "RunResponse",
  );
  tsContentBuilder.push(`
export async function ${toInitalLowercased(insertDefinition.name)}(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,${joinArray(inputCollector.args, "\n  ", ",")}
): Promise<void> {
  await run({
    sql: "INSERT ${insertDefinition.table} (${columns.join(", ")}) VALUES (${values.join(", ")})",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  });
}
`);
}

function generateSpannerUpdate(
  updateDefinition: SpannerUpdateDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  messageResolver: MessageResolver,
  tsContentBuilder: TsContentBuilder,
): void {
  if (!updateDefinition.name) {
    throw new Error(`"name" is missing on a spanner update definition.`);
  }
  let loggingPrefix = `When generating update statement ${updateDefinition.name},`;
  if (!updateDefinition.table) {
    throw new Error(`${loggingPrefix} "table" is missing.`);
  }
  let table = databaseTables.get(updateDefinition.table);
  if (!table) {
    throw new Error(
      `${loggingPrefix} table ${updateDefinition.table} is not found in the database's definition.`,
    );
  }

  let inputCollector = new InputCollector(messageResolver, tsContentBuilder);
  let setItems = new Array<string>();
  if (!updateDefinition.table) {
    throw new Error(`${loggingPrefix} "table" is missing.`);
  }
  for (let column of updateDefinition.setColumns) {
    let columnDefinition = getColumnDefinition(loggingPrefix, table, column);
    let argVariable = `set${toInitialUppercased(column)}`;
    if (columnDefinition.allowCommitTimestamp) {
      setItems.push(`${column} = PENDING_COMMIT_TIMESTAMP()`);
    } else {
      inputCollector.collect(loggingPrefix, argVariable, columnDefinition);
      setItems.push(`${column} = @${argVariable}`);
    }
  }
  let whereClause = new WhereClauseGenerator(
    loggingPrefix + " and when generating where clause,",
    updateDefinition.table,
    new Map<string, string>().set(
      updateDefinition.table,
      updateDefinition.table,
    ),
    databaseTables,
    inputCollector,
  ).generate(updateDefinition.where);

  tsContentBuilder.importFromSpannerTransaction(
    "ExecuteSqlRequest",
    "RunResponse",
  );
  tsContentBuilder.push(`
export async function ${toInitalLowercased(updateDefinition.name)}(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,${joinArray(inputCollector.args, "\n  ", ",")}
): Promise<void> {
  await run({
    sql: "UPDATE ${updateDefinition.table} SET ${setItems.join(", ")} WHERE ${whereClause}",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  });
}
`);
}

function generateSpannerDelete(
  deleteDefinition: SpannerDeleteDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  messageResolver: MessageResolver,
  tsContentBuilder: TsContentBuilder,
): void {
  if (!deleteDefinition.name) {
    throw new Error(`"name" is missing on a spanner delete definition.`);
  }
  let loggingPrefix = `When generating delete statement ${deleteDefinition.name},`;
  let table = databaseTables.get(deleteDefinition.table);
  if (!table) {
    throw new Error(
      `${loggingPrefix} ${deleteDefinition.table} is not found in the database's definition.`,
    );
  }

  let inputCollector = new InputCollector(messageResolver, tsContentBuilder);
  let whereClause = new WhereClauseGenerator(
    loggingPrefix + " and when generating where clause,",
    deleteDefinition.table,
    new Map<string, string>().set(
      deleteDefinition.table,
      deleteDefinition.table,
    ),
    databaseTables,
    inputCollector,
  ).generate(deleteDefinition.where);

  tsContentBuilder.importFromSpannerTransaction(
    "ExecuteSqlRequest",
    "RunResponse",
  );
  tsContentBuilder.push(`
export async function ${toInitalLowercased(deleteDefinition.name)}(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,${joinArray(inputCollector.args, "\n  ", ",")}
): Promise<void> {
  await run({
    sql: "DELETE ${deleteDefinition.table} WHERE ${whereClause}",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  });
}
`);
}
