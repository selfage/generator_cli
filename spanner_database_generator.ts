import {
  SpannerColumnRef,
  SpannerDatabaseDefinition,
  SpannerDeleteDefinition,
  SpannerIndexDefinition,
  SpannerInsertDefinition,
  SpannerJoinOnConcat,
  SpannerJoinOnLeaf,
  SpannerMessageTableDefintion,
  SpannerSelectDefinition,
  SpannerTableColumnDefinition,
  SpannerTableDefinition,
  SpannerTablePrimaryKeyDefinition,
  SpannerTaskTableDefinition,
  SpannerUpdateDefinition,
  SpannerWhereConcat,
  SpannerWhereLeaf,
} from "./definition";
import { DefinitionResolver } from "./definition_resolver";
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
  ["float64", "number"],
  ["timestamp", "number"],
  ["string", "string"],
]);
let COLUMN_PRIMITIVE_TYPE_TO_TABLE_TYPE = new Map<string, string>([
  ["bool", "BOOL"],
  ["float64", "FLOAT64"],
  ["timestamp", "TIMESTAMP"],
  ["string", "STRING(MAX)"],
]);
let TS_PRIMITIVE_TYPES_TO_COLUMN_TYPE = new Map<string, string>([
  ["boolean", "bool"],
  ["number", "float64"],
  ["string", "string"],
]);
let BINARY_OP_NAME = new Map<string, string>([
  [">", "Gt"],
  [">=", "Ge"],
  ["<", "Lt"],
  ["<=", "Le"],
  ["=", "Eq"],
  ["!=", "Ne"],
]);
let ALL_CONCAT_OP = new Set().add("AND").add("OR");
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
    private definitionResolver: DefinitionResolver,
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
      let typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        columnDefinition.type,
        columnDefinition.import,
      );
      this.tsContentBuilder.importFromDefinition(
        columnDefinition.import,
        columnDefinition.type,
      );
      if (typeDefinition.kind === "Enum") {
        this.tsContentBuilder.importFromSpanner("Spanner");
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.name;
          queryType = `{ type: "float64" }`;
          conversion = `Spanner.float(${argVariable})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          queryType = `{ type: "array", child: { type: "float64" } }`;
          conversion = `${argVariable}.map((e) => Spanner.float(e))`;
        }
      } else if (typeDefinition.kind === "Message") {
        this.tsContentBuilder.importFromMessageSerializer("serializeMessage");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.name;
          queryType = `{ type: "bytes" }`;
          conversion = `Buffer.from(serializeMessage(${argVariable}, ${tsTypeDescriptor}).buffer)`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
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
          default:
            // bool, string
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
          default:
            // bool, string
            conversion = `${argVariable}`;
        }
      }
    }
    if (columnDefinition.nullable) {
      conversion = `${argVariable} == null ? null : ${conversion}`;
      tsType = `${tsType} | null | undefined`;
    }

    this.collectExplictly(argVariable, tsType, queryType, conversion);
  }

  public collectExplictly(
    argVariable: string,
    tsType: string,
    queryType: string,
    conversion: string,
  ): void {
    this.args.push(`${argVariable}: ${tsType}`);
    this.queryTypes.push(`${argVariable}: ${queryType}`);
    this.conversions.push(`${argVariable}: ${conversion}`);
  }
}

export class OuputCollector {
  public fields = new Array<string>();
  public conversions = new Array<string>();
  public fieldDescriptors = new Array<string>();

  public constructor(
    private definitionResolver: DefinitionResolver,
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
    let typeDescriptorLine: string;
    let isArrayLine: string;
    if (!tsType) {
      let typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        columnDefinition.type,
        columnDefinition.import,
      );
      this.tsContentBuilder.importFromDefinition(
        columnDefinition.import,
        columnDefinition.type,
      );
      if (typeDefinition.kind === "Enum") {
        this.tsContentBuilder.importFromMessageSerializer("toEnumFromNumber");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        typeDescriptorLine = `enumType: ${tsTypeDescriptor}`;
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.name;
          conversion = `toEnumFromNumber(${columnVariable}.value.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          isArrayLine = `isArray: true`;
          conversion = `${columnVariable}.value.map((e) => toEnumFromNumber(e.value, ${tsTypeDescriptor}))`;
        }
      } else if (typeDefinition.kind === "Message") {
        this.tsContentBuilder.importFromMessageSerializer("deserializeMessage");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.tsContentBuilder.importFromDefinition(
          columnDefinition.import,
          tsTypeDescriptor,
        );
        typeDescriptorLine = `messageType: ${tsTypeDescriptor}`;
        if (!columnDefinition.isArray) {
          tsType = typeDefinition.name;
          conversion = `deserializeMessage(${columnVariable}.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          isArrayLine = `isArray: true`;
          conversion = `${columnVariable}.value.map((e) => deserializeMessage(e, ${tsTypeDescriptor}))`;
        }
      }
    } else {
      this.tsContentBuilder.importFromMessageDescriptor("PrimitiveType");
      typeDescriptorLine = `primitiveType: PrimitiveType.${tsType.toUpperCase()}`;
      if (!columnDefinition.isArray) {
        switch (columnDefinition.type) {
          case "float64":
            conversion = `${columnVariable}.value.value`;
            break;
          case "timestamp":
            conversion = `${columnVariable}.value.valueOf()`;
            break;
          default:
            // bool, string
            conversion = `${columnVariable}.value`;
            break;
        }
      } else {
        tsType = `Array<${tsType}>`;
        isArrayLine = `isArray: true`;
        switch (columnDefinition.type) {
          case "float64":
            conversion = `${columnVariable}.value.map((e) => e.value)`;
            break;
          case "timestamp":
            conversion = `${columnVariable}.value.map((e) => e.valueOf())`;
            break;
          default:
            // bool, string
            conversion = `${columnVariable}.value`;
            break;
        }
      }
    }
    if (columnDefinition.nullable) {
      conversion = `${columnVariable}.value == null ? undefined : ${conversion}`;
      tsType = `${tsType} | undefined`;
    }

    this.fields.push(`${fieldName}: ${tsType}`);
    this.conversions.push(`${fieldName}: ${conversion}`);
    this.fieldDescriptors.push(`{
    name: '${fieldName}',
    index: ${columnIndex + 1},
    ${typeDescriptorLine},${isArrayLine ? "\n    " + isArrayLine + "," : ""}
  }`);
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

  public generate(where: SpannerWhereConcat | SpannerWhereLeaf): string {
    if (ALL_CONCAT_OP.has(where.op)) {
      return this.generateConcat(where as SpannerWhereConcat);
    } else {
      return this.generateLeaf(where as SpannerWhereLeaf);
    }
  }

  private generateLeaf(leaf: SpannerWhereLeaf): string {
    if (!leaf.leftColumn) {
      throw new Error(`${this.loggingPrefix} "leftColumn" is missing.`);
    }
    if (typeof leaf.leftColumn === "string") {
      leaf.leftColumn = {
        name: leaf.leftColumn,
        table: this.defaultTableAlias,
      };
    }
    if (!leaf.leftColumn.table) {
      throw new Error(`${this.loggingPrefix} "table" is missing.`);
    }
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
      let argVariable = `${toInitalLowercased(leaf.leftColumn.table)}${toInitialUppercased(leaf.leftColumn.name)}${BINARY_OP_NAME.get(leaf.op)}`;
      this.inputCollector.collect(
        this.loggingPrefix,
        argVariable,
        columnDefinition,
      );
      return `${leaf.leftColumn.table}.${leaf.leftColumn.name} ${leaf.op} @${argVariable}`;
    }
  }

  private generateConcat(concat: SpannerWhereConcat): string {
    if (!concat.exps) {
      throw new Error(
        `${this.loggingPrefix} "exps" is either missing or not an array.`,
      );
    }
    let clauses = concat.exps.map((exp) => this.generate(exp));
    return "(" + clauses.join(` ${concat.op} `) + ")";
  }
}

class JoinOnClauseGenerator {
  public constructor(
    private loggingPrefix: string,
    private rightTable: SpannerTableDefinition,
    private rightTableAlias: string,
    private tableAliases: Map<string, string>,
    private databaseTables: Map<string, SpannerTableDefinition>,
  ) {}

  public generate(joinOn: SpannerJoinOnConcat | SpannerJoinOnLeaf): string {
    if (ALL_CONCAT_OP.has(joinOn.op)) {
      return this.generateConcat(joinOn as SpannerJoinOnConcat);
    } else {
      return this.generateLeaf(joinOn as SpannerJoinOnLeaf);
    }
  }

  public generateLeaf(leaf: SpannerJoinOnLeaf): string {
    if (!leaf.leftColumn) {
      throw new Error(`${this.loggingPrefix} "leftColumn" is missing.`);
    }
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
    return `${leaf.leftColumn.table}.${leaf.leftColumn.name} ${leaf.op} ${this.rightTableAlias}.${leaf.rightColumn}`;
  }

  public generateConcat(concat: SpannerJoinOnConcat): string {
    if (!concat.exps) {
      throw new Error(
        `${this.loggingPrefix} "exps" is either missing or not an array.`,
      );
    }
    let clauses = concat.exps.map((exp) => this.generate(exp));
    return "(" + clauses.join(` ${concat.op} `) + ")";
  }
}

export function generateSpannerDatabase(
  definitionModulePath: string,
  spannerDatabaseDefinition: SpannerDatabaseDefinition,
  definitionResolver: DefinitionResolver,
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

  let databaseTables = new Map<string, SpannerTableDefinition>();
  if (!spannerDatabaseDefinition.tables) {
    throw new Error(
      `"table" is missing on spannerDatabase ${spannerDatabaseDefinition.name}.`,
    );
  }
  let tableDdls = new Array<string>();
  for (let table of spannerDatabaseDefinition.tables) {
    if (table.kind === "Table") {
      generateSpannerTable(
        table,
        databaseTables,
        definitionResolver,
        tableDdls,
      );
    } else if (table.kind === "MessageTable") {
      generateSpannerMessageTable(
        table,
        databaseTables,
        definitionResolver,
        tableDdls,
        tsContentBuilder,
      );
    } else if (table.kind === "TaskTable") {
      generateSpannerTaskTable(
        table,
        databaseTables,
        definitionResolver,
        tableDdls,
        tsContentBuilder,
      );
    }
  }
  outputDdlContentBuilder.push(`{
  "tables": [${tableDdls.join(", ")}]
}`);

  if (spannerDatabaseDefinition.inserts) {
    for (let insertDefinition of spannerDatabaseDefinition.inserts) {
      generateSpannerInsert(
        insertDefinition,
        databaseTables,
        definitionResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.updates) {
    for (let updateDefinition of spannerDatabaseDefinition.updates) {
      generateSpannerUpdate(
        updateDefinition,
        databaseTables,
        definitionResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.deletes) {
    for (let deleteDefinition of spannerDatabaseDefinition.deletes) {
      generateSpannerDelete(
        deleteDefinition,
        databaseTables,
        definitionResolver,
        tsContentBuilder,
      );
    }
  }
  if (spannerDatabaseDefinition.selects) {
    for (let selectDefinition of spannerDatabaseDefinition.selects) {
      generateSpannerSelect(
        selectDefinition,
        databaseTables,
        definitionResolver,
        tsContentBuilder,
      );
    }
  }
}

function generateSpannerTable(
  table: SpannerTableDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
  tableDdls: Array<string>,
) {
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
      let definition = definitionResolver.resolve(
        loggingPrefix,
        column.type,
        column.import,
      );
      if (definition.kind === "Enum") {
        type = "FLOAT64";
      } else if (definition.kind === "Message") {
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
  for (let i = 0; i < table.primaryKeys.length; i++) {
    let key = table.primaryKeys[i];
    if (typeof key === "string") {
      key = {
        name: key,
        desc: false,
      };
    }
    if (key.desc == null) {
      throw new Error(
        `${loggingPrefix} "desc" is missing in primary key ${key.name}.`,
      );
    }
    table.primaryKeys[i] = key;
    if (!key.name) {
      throw new Error(
        `${loggingPrefix} "name" is missing in "primaryKeys" field.`,
      );
    }
    let columnDefinition = getColumnDefinition(
      loggingPrefix + " and when generating primary keys,",
      table,
      key.name,
    );
    if (columnDefinition.isArray) {
      throw new Error(
        `${loggingPrefix} column ${key} is an array and cannot be used as a primary key.`,
      );
    }
    primaryKeys.push(`${key.name} ${key.desc ? "DESC" : "ASC"}`);
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
      let parentKey = parentTable.primaryKeys[
        i
      ] as SpannerTablePrimaryKeyDefinition;
      let childKey = table.primaryKeys[i] as SpannerTablePrimaryKeyDefinition;
      if (parentKey.name !== childKey.name) {
        throw new Error(
          `${loggingPrefix} at position ${i}, pimary key "${childKey.name}" doesn't match the key "${parentKey.name}" of the parent table.`,
        );
      }
      if (parentKey.desc !== childKey.desc) {
        throw new Error(
          `${loggingPrefix} at position ${i}, pimary key "${childKey.name}" is ${childKey.desc ? "DESC" : "ASC"} which doesn't match the key of the parent table.`,
        );
      }
      let parentColumnDefinition = getColumnDefinition(
        loggingPrefix + "and when validating interleaving,",
        parentTable,
        parentKey.name,
      );
      let childColumnDefinition = getColumnDefinition(
        loggingPrefix + "and when validating interleaving,",
        table,
        childKey.name,
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
        if (typeof column === "string") {
          column = {
            name: column,
            desc: false,
          };
        }
        if (column.desc == null) {
          throw new Error(
            `${loggingPrefix} "desc" is missing in index column ${column.name}.`,
          );
        }
        getColumnDefinition(
          loggingPrefix + " and when generating indexes,",
          table,
          column.name,
        );
        indexColumns.push(`${column.name}${column.desc ? " DESC" : ""}`);
      }

      indexDdls.push(`{
      "name": "${index.name}",
      "createIndexDdl": "CREATE ${index.unique ? "UNIQUE " : ""}${index.nullFiltered ? "NULL_FILTERED " : ""}INDEX ${index.name} ON ${table.name}(${indexColumns.join(", ")})"
    }`);
    }
  }

  databaseTables.set(table.name, table);
  tableDdls.push(`{
    "name": "${table.name}",
    "columns": [${addColumnDdls.join(", ")}],
    "createTableDdl": "CREATE TABLE ${table.name} (${createColumnPartialDdls.join(", ")}) PRIMARY KEY (${primaryKeys.join(", ")})${interleaveOption}",
    "indexes": [${indexDdls.join(", ")}]
  }`);
}

function generateSpannerMessageTable(
  table: SpannerMessageTableDefintion,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
  tableDdls: Array<string>,
  tsContentBuilder: TsContentBuilder,
) {
  if (!table.name) {
    throw new Error(`"name" is missing on a Spanner message table.`);
  }
  let loggingPrefix = `When coverting message table ${table.name} to Spanner table definition,`;
  let messageDefinition = definitionResolver.resolve(loggingPrefix, table.name);
  if (messageDefinition.kind !== "Message") {
    throw new Error(`${loggingPrefix} message ${table.name} is not found.`);
  }

  if (!table.storedInColumn) {
    throw new Error(
      `${loggingPrefix} "storedInColumn" is missing on message table ${table.name}.`,
    );
  }
  if (!table.columns) {
    throw new Error(
      `${loggingPrefix} "columns" is missing on message table ${table.name}.`,
    );
  }
  let columns = new Array<SpannerTableColumnDefinition>();
  for (let column of table.columns) {
    let field = messageDefinition.fields.find(
      (fieldDefinition) => fieldDefinition.name === column,
    );
    if (!field) {
      throw new Error(
        `${loggingPrefix} field ${column} is not found in message ${messageDefinition.name}.`,
      );
    }
    let type = TS_PRIMITIVE_TYPES_TO_COLUMN_TYPE.get(field.type) ?? field.type;
    columns.push({
      name: column,
      type: type,
      import: field.import,
      isArray: field.isArray,
    });
  }
  columns.push({
    name: table.storedInColumn,
    type: messageDefinition.name,
  });
  generateSpannerTable(
    {
      kind: "Table",
      name: table.name,
      columns: columns,
      primaryKeys: table.primaryKeys,
      interleave: table.interleave,
      indexes: table.indexes,
    },
    databaseTables,
    definitionResolver,
    tableDdls,
  );

  if (table.insert) {
    let inputVariables = new Array<string>();
    for (let column of table.columns) {
      inputVariables.push(`${table.storedInColumn}.${column}`);
    }
    inputVariables.push(table.storedInColumn);
    tsContentBuilder.importFromSpannerTransaction("Statement");
    tsContentBuilder.push(`
export function ${toInitalLowercased(table.insert)}Statement(
  ${table.storedInColumn}: ${messageDefinition.name},
): Statement {
  return ${toInitalLowercased(table.insert)}InternalStatement(
    ${inputVariables.join(",\n    ")}
  );
}
`);
    generateSpannerInsert(
      {
        name: `${table.insert}Internal`,
        table: table.name,
        setColumns: columns.map((column) => column.name),
      },
      databaseTables,
      definitionResolver,
      tsContentBuilder,
    );
  }

  if (table.delete) {
    generateSpannerDelete(
      {
        name: table.delete,
        table: table.name,
        where: {
          op: "AND",
          exps: table.primaryKeys.map((key) => ({
            leftColumn: typeof key === "string" ? key : key.name,
            op: "=",
          })),
        },
      },
      databaseTables,
      definitionResolver,
      tsContentBuilder,
    );
  }

  if (table.get) {
    generateSpannerSelect(
      {
        name: table.get,
        table: table.name,
        where: {
          op: "AND",
          exps: table.primaryKeys.map((key) => ({
            leftColumn: typeof key === "string" ? key : key.name,
            op: "=",
          })),
        },
        getColumns: [table.storedInColumn],
      },
      databaseTables,
      definitionResolver,
      tsContentBuilder,
    );
  }

  if (table.update) {
    let primaryKeys = table.primaryKeys.map((key) =>
      typeof key === "string" ? key : key.name,
    );
    let setColumns = table.columns.filter(
      (column) => !primaryKeys.includes(column),
    );

    let inputVariables = new Array<string>();
    for (let column of primaryKeys) {
      inputVariables.push(`${table.storedInColumn}.${column}`);
    }
    for (let column of setColumns) {
      inputVariables.push(`${table.storedInColumn}.${column}`);
    }
    inputVariables.push(table.storedInColumn);
    tsContentBuilder.importFromSpannerTransaction("Statement");
    tsContentBuilder.push(`
export function ${toInitalLowercased(table.update)}Statement(
  ${table.storedInColumn}: ${messageDefinition.name},
): Statement {
  return ${toInitalLowercased(table.update)}InternalStatement(
    ${inputVariables.join(",\n    ")}
  );
}
`);
    setColumns.push(table.storedInColumn);
    generateSpannerUpdate(
      {
        name: `${table.update}Internal`,
        table: table.name,
        where: {
          op: "AND",
          exps: primaryKeys.map((key) => ({
            leftColumn: key,
            op: "=",
          })),
        },
        setColumns,
      },
      databaseTables,
      definitionResolver,
      tsContentBuilder,
    );
  }
}

export function generateSpannerTaskTable(
  table: SpannerTaskTableDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
  tableDdls: Array<string>,
  tsContentBuilder: TsContentBuilder,
) {
  if (!table.name) {
    throw new Error(`"name" is missing on a Spanner task table.`);
  }
  let loggingPrefix = `When coverting task table ${table.name} to Spanner table definition,`;
  if (!table.columns) {
    throw new Error(
      `${loggingPrefix} "columns" is missing on task table ${table.name}.`,
    );
  }
  if (!table.retryCountColumn) {
    throw new Error(
      `${loggingPrefix} "retryCountColumn" is missing on task table ${table.name}.`,
    );
  }
  if (!table.executionTimeColumn) {
    throw new Error(
      `${loggingPrefix} "executionTimeColumn" is missing on task table ${table.name}.`,
    );
  }
  if (!table.createdTimeColumn) {
    throw new Error(
      `${loggingPrefix} "createdTimeColumn" is missing on task table ${table.name}.`,
    );
  }
  let columns = table.columns;
  columns.push(
    {
      name: table.retryCountColumn,
      type: "float64",
    },
    {
      name: table.executionTimeColumn,
      type: "timestamp",
    },
    {
      name: table.createdTimeColumn,
      type: "timestamp",
    },
  );

  if (!table.executionTimeIndex) {
    throw new Error(
      `${loggingPrefix} "executionTimeIndex" is missing on task table ${table.name}.`,
    );
  }
  let indexes: Array<SpannerIndexDefinition> = [
    {
      name: table.executionTimeIndex,
      columns: [table.executionTimeColumn],
    },
  ];

  generateSpannerTable(
    {
      kind: "Table",
      name: table.name,
      columns: columns,
      primaryKeys: table.primaryKeys,
      indexes: indexes,
    },
    databaseTables,
    definitionResolver,
    tableDdls,
  );

  if (!table.insert) {
    throw new Error(
      `${loggingPrefix} "insert" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerInsert(
    {
      name: table.insert,
      table: table.name,
      setColumns: columns.map((column) => column.name),
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );

  if (!table.delete) {
    throw new Error(
      `${loggingPrefix} "delete" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerDelete(
    {
      name: table.delete,
      table: table.name,
      where: {
        op: "AND",
        exps: table.primaryKeys.map((key) => ({
          leftColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );

  if (!table.get) {
    throw new Error(
      `${loggingPrefix} "get" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerSelect(
    {
      name: table.get,
      table: table.name,
      where: {
        op: "AND",
        exps: table.primaryKeys.map((key) => ({
          leftColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
      getColumns: table.columns.map((column) => column.name),
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );

  if (!table.listPendingTasks) {
    throw new Error(
      `${loggingPrefix} "listPendingTasks" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerSelect(
    {
      name: table.listPendingTasks,
      table: table.name,
      where: {
        op: "<=",
        leftColumn: table.executionTimeColumn,
      },
      getColumns: table.primaryKeys.map((key) =>
        typeof key === "string" ? key : key.name,
      ),
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );

  if (!table.getMetadata) {
    throw new Error(
      `${loggingPrefix} "getMetadata" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerSelect(
    {
      name: table.getMetadata,
      table: table.name,
      where: {
        op: "AND",
        exps: table.primaryKeys.map((key) => ({
          leftColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
      getColumns: [table.retryCountColumn, table.executionTimeColumn],
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );

  if (!table.updateMetadata) {
    throw new Error(
      `${loggingPrefix} "updateMetadata" is missing on task table ${table.name}.`,
    );
  }
  generateSpannerUpdate(
    {
      name: table.updateMetadata,
      table: table.name,
      where: {
        op: "AND",
        exps: table.primaryKeys.map((key) => ({
          leftColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
      setColumns: [table.retryCountColumn, table.executionTimeColumn],
    },
    databaseTables,
    definitionResolver,
    tsContentBuilder,
  );
}

function generateSpannerInsert(
  insertDefinition: SpannerInsertDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
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
  let inputCollector = new InputCollector(definitionResolver, tsContentBuilder);
  if (!insertDefinition.setColumns) {
    throw new Error(`${loggingPrefix} "setColumns" is missing.`);
  }
  for (let column of insertDefinition.setColumns) {
    let columnDefinition = getColumnDefinition(loggingPrefix, table, column);
    columns.push(column);
    let argVariable = column;
    if (columnDefinition.allowCommitTimestamp) {
      values.push(`PENDING_COMMIT_TIMESTAMP()`);
    } else {
      inputCollector.collect(loggingPrefix, argVariable, columnDefinition);
      values.push(`@${argVariable}`);
    }
  }

  tsContentBuilder.importFromSpannerTransaction("Statement");
  tsContentBuilder.push(`
export function ${toInitalLowercased(insertDefinition.name)}Statement(${joinArray(inputCollector.args, "\n  ", ",")}
): Statement {
  return {
    sql: "INSERT ${insertDefinition.table} (${columns.join(", ")}) VALUES (${values.join(", ")})",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  };
}
`);
}

function generateSpannerUpdate(
  updateDefinition: SpannerUpdateDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
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

  let inputCollector = new InputCollector(definitionResolver, tsContentBuilder);
  let setItems = new Array<string>();
  if (!updateDefinition.table) {
    throw new Error(`${loggingPrefix} "table" is missing.`);
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

  tsContentBuilder.importFromSpannerTransaction("Statement");
  tsContentBuilder.push(`
export function ${toInitalLowercased(updateDefinition.name)}Statement(${joinArray(inputCollector.args, "\n  ", ",")}
): Statement {
  return {
    sql: "UPDATE ${updateDefinition.table} SET ${setItems.join(", ")} WHERE ${whereClause}",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  };
}
`);
}

function generateSpannerDelete(
  deleteDefinition: SpannerDeleteDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
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

  let inputCollector = new InputCollector(definitionResolver, tsContentBuilder);
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

  tsContentBuilder.importFromSpannerTransaction("Statement");
  tsContentBuilder.push(`
export function ${toInitalLowercased(deleteDefinition.name)}Statement(${joinArray(inputCollector.args, "\n  ", ",")}
): Statement {
  return {
    sql: "DELETE ${deleteDefinition.table} WHERE ${whereClause}",
    params: {${joinArray(inputCollector.conversions, "\n      ", ",")}
    },
    types: {${joinArray(inputCollector.queryTypes, "\n      ", ",")}
    }
  };
}
`);
}

function generateSpannerSelect(
  selectDefinition: SpannerSelectDefinition,
  databaseTables: Map<string, SpannerTableDefinition>,
  definitionResolver: DefinitionResolver,
  tsContentBuilder: TsContentBuilder,
) {
  if (!selectDefinition.name) {
    throw new Error(`"name" is missing on a spanner select definition.`);
  }
  let loggingPrefix = `When generating select statement ${selectDefinition.name},`;
  let tableAliases = new Map<string, string>();
  if (typeof selectDefinition.table === "string") {
    selectDefinition.table = {
      name: selectDefinition.table,
      as: selectDefinition.table,
    };
  }
  if (!selectDefinition.table.as) {
    throw new Error(`${loggingPrefix} "as" is missing in "table" field.`);
  }
  if (!databaseTables.has(selectDefinition.table.name)) {
    throw new Error(
      `${loggingPrefix} table ${selectDefinition.table.name} is not found in the database.`,
    );
  }

  let defaultTableAlias = selectDefinition.table.as;
  let fromTables = new Array<string>();
  tableAliases.set(selectDefinition.table.as, selectDefinition.table.name);
  fromTables.push(
    `${selectDefinition.table.name}${selectDefinition.table.as !== selectDefinition.table.name ? " AS " + selectDefinition.table.as : ""}`,
  );
  if (selectDefinition.join) {
    for (let joinTable of selectDefinition.join) {
      if (!joinTable.table) {
        throw new Error(`${loggingPrefix} "table" is missing in "join" field.`);
      }
      if (typeof joinTable.table === "string") {
        joinTable.table = {
          name: joinTable.table,
          as: joinTable.table,
        };
      }
      if (!joinTable.table.as) {
        throw new Error(
          `${loggingPrefix} "as" is missing in join table ${joinTable.table.name}.`,
        );
      }
      tableAliases.set(joinTable.table.as, joinTable.table.name);
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
        `${joinTable.type} JOIN ${joinTable.table.name}${joinTable.table.as !== joinTable.table.name ? " AS " + joinTable.table.as : ""}${joinOnClause}`,
      );
    }
  }

  let whereClause = "";
  let inputCollector = new InputCollector(definitionResolver, tsContentBuilder);
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
      if (typeof column === "string") {
        column = {
          column: {
            name: column,
            table: defaultTableAlias,
          },
        };
      }
      if (typeof column.column === "string") {
        column.column = {
          name: column.column,
          table: defaultTableAlias,
        };
      }
      if (!column.column.table) {
        throw new Error(
          `${loggingPrefix} "table" is missing in order by column ${column.column.name}.`,
        );
      }
      resolveColumnDefinition(
        loggingPrefix + " and when generating order by clause,",
        column.column as SpannerColumnRef,
        tableAliases,
        databaseTables,
      );
      orderByColumns.push(
        `${(column.column as SpannerColumnRef).table}.${(column.column as SpannerColumnRef).name}${column.desc ? " DESC" : ""}`,
      );
    }
    orderByClause = ` ORDER BY ${orderByColumns.join(", ")}`;
  }

  let limitClause = "";
  if (selectDefinition.withLimit) {
    inputCollector.collectExplictly(
      "limit",
      "number",
      `{ type: "int64" }`,
      "limit.toString()",
    );
    limitClause = ` LIMIT @limit`;
  }

  let selectColumns = new Array<string>();
  let outputCollector = new OuputCollector(
    definitionResolver,
    tsContentBuilder,
  );
  for (let i = 0; i < selectDefinition.getColumns.length; i++) {
    let column = selectDefinition.getColumns[i];
    if (typeof column === "string") {
      column = {
        name: column,
        table: defaultTableAlias,
      };
    }
    if (!column.table) {
      throw new Error(
        `${loggingPrefix} "table" is missing in get column ${column.name}.`,
      );
    }
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

  tsContentBuilder.importFromSpanner("Database", "Transaction");
  tsContentBuilder.importFromMessageDescriptor("MessageDescriptor");
  tsContentBuilder.push(`
export interface ${selectDefinition.name}Row {${joinArray(outputCollector.fields, "\n  ", ",")}
}

export let ${toUppercaseSnaked(selectDefinition.name)}_ROW: MessageDescriptor<${selectDefinition.name}Row> = {
  name: '${selectDefinition.name}Row',
  fields: [${outputCollector.fieldDescriptors.join(", ")}],
};

export async function ${toInitalLowercased(selectDefinition.name)}(
  runner: Database | Transaction,${joinArray(inputCollector.args, "\n  ", ",")}
): Promise<Array<${selectDefinition.name}Row>> {
  let [rows] = await runner.run({
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
