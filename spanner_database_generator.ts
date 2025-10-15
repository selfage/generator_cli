import {
  SpannerDatabaseDefinition,
  SpannerDeleteDefinition,
  SpannerIndexDefinition,
  SpannerInsertDefinition,
  SpannerJoinOnConcat,
  SpannerJoinOnLeaf,
  SpannerSelectDefinition,
  SpannerTableColumnDefinition,
  SpannerTableColumnGroupDefinition,
  SpannerTableColumnType,
  SpannerTableDefinition,
  SpannerTablePrimaryKeyDefinition,
  SpannerTableSearchColumnDefinition,
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
  ["int53", "number"],
  ["float64", "number"],
  ["timestamp", "number"],
  ["string", "string"],
]);
let COLUMN_PRIMITIVE_TYPE_TO_TABLE_TYPE = new Map<string, string>([
  ["bool", "BOOL"],
  ["int53", "INT64"],
  ["float64", "FLOAT64"],
  ["timestamp", "TIMESTAMP"],
  ["string", "STRING(MAX)"],
]);
let COLUMN_PRIMITIVE_TYPE_TO_QUERY_TYPE = new Map<string, string>([
  ["bool", "bool"],
  ["int53", "int64"],
  ["float64", "float64"],
  ["timestamp", "timestamp"],
  ["string", "string"],
]);
let BINARY_OP_NAME = new Map<string, string>([
  [">", "Gt"],
  [">=", "Ge"],
  ["<", "Lt"],
  ["<=", "Le"],
  ["=", "Eq"],
  ["!=", "Ne"],
  ["SEARCH", "Search"],
  ["SCORE", "Score"],
  ["IN", "In"],
]);
let ALL_JOIN_LEAF_OP = new Set()
  .add(">")
  .add("<")
  .add(">=")
  .add("<=")
  .add("!=")
  .add("=");
let ALL_JOIN_TYPE = new Set()
  .add("INNER")
  .add("CROSS")
  .add("FULL")
  .add("LEFT")
  .add("RIGHT");
let SCORE_RESULT_OP = new Set().add(">").add(">=").add("<").add("<=").add("=");

function getColumnDefinition(
  loggingPrefix: string,
  columnName: string,
  table: SpannerTableDefinition,
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

function getColumnGroupDefinition(
  loggingPrefix: string,
  columnGroupName: string,
  table: SpannerTableDefinition,
): SpannerTableColumnGroupDefinition {
  for (let columnGroup of table.columnGroups) {
    if (columnGroup.name === columnGroupName) {
      return columnGroup;
    }
  }
  throw new Error(
    `${loggingPrefix} column group ${columnGroupName} is not found in the table ${table.name}.`,
  );
}

function getSearchColumnDefinition(
  loggingPrefix: string,
  searchColumnName: string,
  table: SpannerTableDefinition,
): SpannerTableSearchColumnDefinition {
  if (table.searchColumns) {
    for (let column of table.searchColumns) {
      if (column.name === searchColumnName) {
        return column;
      }
    }
  }
  throw new Error(
    `${loggingPrefix} search column ${searchColumnName} is not found in the table ${table.name}.`,
  );
}

export class SpannerDatabaseGenerator {
  private databaseTables = new Map<string, SpannerTableDefinition>();
  private ddlContentBuilder: SimpleContentBuilder;
  private tableDdls = new Array<string>();
  private sqlContentBuilder: TsContentBuilder;
  private inputArgs: Array<string>;
  private inputQueryTypes: Array<string>;
  private inputConversions: Array<string>;
  private currentDefaultTableAlias: string;
  private currentTableAliases: Map<string, string>;
  private currentJoinRightTable: SpannerTableDefinition;
  private currentJoinRightTableAlias: string;
  private outputFields = new Array<string>();
  private outputConversions = new Array<string>();
  private outputFieldDescriptors = new Array<string>();

  public constructor(
    private definitionModulePath: string,
    private spannerDatabaseDefinition: SpannerDatabaseDefinition,
    private definitionResolver: DefinitionResolver,
    private outputContentMap: Map<string, OutputContentBuilder>,
  ) {}

  public generate(): void {
    if (!this.spannerDatabaseDefinition.name) {
      throw new Error(`"name" is missing on a spannerDatabase.`);
    }
    if (!this.spannerDatabaseDefinition.outputDdl) {
      throw new Error(
        `"outputDdl" is missing on spannerDatabase ${this.spannerDatabaseDefinition.name}.`,
      );
    }
    this.ddlContentBuilder = SimpleContentBuilder.get(
      this.outputContentMap,
      ".json",
      this.spannerDatabaseDefinition.outputDdl,
    );
    if (!this.spannerDatabaseDefinition.outputSql) {
      throw new Error(
        `"outputSql" is missing on spannerDatabase ${this.spannerDatabaseDefinition.name}.`,
      );
    }
    this.sqlContentBuilder = TsContentBuilder.get(
      this.outputContentMap,
      this.definitionModulePath,
      this.spannerDatabaseDefinition.outputSql,
    );

    if (!this.spannerDatabaseDefinition.tables) {
      throw new Error(
        `"table" is missing on spannerDatabase ${this.spannerDatabaseDefinition.name}.`,
      );
    }
    for (let table of this.spannerDatabaseDefinition.tables) {
      if (table.kind === "Table") {
        this.generateSpannerTable(table);
      } else if (table.kind === "TaskTable") {
        this.generateSpannerTaskTable(table);
      }
    }
    this.ddlContentBuilder.push(`{
  "tables": [${this.tableDdls.join(", ")}]
}`);

    if (this.spannerDatabaseDefinition.inserts) {
      for (let insertDefinition of this.spannerDatabaseDefinition.inserts) {
        this.generateSpannerInsert(insertDefinition);
      }
    }
    if (this.spannerDatabaseDefinition.updates) {
      for (let updateDefinition of this.spannerDatabaseDefinition.updates) {
        this.generateSpannerUpdate(updateDefinition);
      }
    }
    if (this.spannerDatabaseDefinition.deletes) {
      for (let deleteDefinition of this.spannerDatabaseDefinition.deletes) {
        this.generateSpannerDelete(deleteDefinition);
      }
    }
    if (this.spannerDatabaseDefinition.selects) {
      for (let selectDefinition of this.spannerDatabaseDefinition.selects) {
        this.generateSpannerSelect(selectDefinition);
      }
    }
  }

  private generateSpannerTable(table: SpannerTableDefinition): void {
    if (!table.name) {
      throw new Error(`"name" is missing on a spanner table.`);
    }

    let loggingPrefix = `When generating DDL for table ${table.name},`;
    let addColumnDdls = new Array<string>();
    let createColumnPartialDdls = new Array<string>();
    if (!table.columns) {
      throw new Error(`${loggingPrefix} "columns" is missing.`);
    }
    for (let column of table.columns) {
      if (!column.name) {
        throw new Error(`${loggingPrefix} "name" is mssing on a column.`);
      }
      if (!column.type) {
        throw new Error(
          `${loggingPrefix} "type" is missing on column ${column.name}.`,
        );
      }
      let type = COLUMN_PRIMITIVE_TYPE_TO_TABLE_TYPE.get(column.type);
      if (!type) {
        let definition = this.definitionResolver.resolve(
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
      let partialDdl = `${column.name} ${column.isArray ? "Array<" + type + ">" : type}${column.nullable ? "" : " NOT NULL"}`;
      createColumnPartialDdls.push(partialDdl);
      addColumnDdls.push(`{
      "name": "${column.name}",
      "addColumnDdl": "ALTER TABLE ${table.name} ADD COLUMN ${partialDdl}"
    }`);
    }

    if (table.searchColumns) {
      for (let searchColumn of table.searchColumns) {
        if (!searchColumn.name) {
          throw new Error(
            `${loggingPrefix} "name" is missing in one element of "searchColumns" field.`,
          );
        }
        if (!searchColumn.columnRefs) {
          throw new Error(
            `${loggingPrefix} "columnRefs" is missing in search column ${searchColumn.name}.`,
          );
        }
        let columnsConcats = new Array<string>();
        for (let columnRef of searchColumn.columnRefs) {
          let columnDef = getColumnDefinition(
            loggingPrefix + " and when generating search column ref,",
            columnRef,
            table,
          );
          // Only string type for now.
          if (columnDef.type !== "string") {
            throw new Error(
              `${loggingPrefix} column ${columnRef} is not a string and cannot be used in a search column.`,
            );
          }
          if (columnDef.isArray) {
            throw new Error(
              `${loggingPrefix} column ${columnRef} is an array and cannot be used in a search column.`,
            );
          }
          columnsConcats.push(columnRef);
        }
        let partialDdl = `${searchColumn.name} TOKENLIST AS (TOKENIZE_FULLTEXT(${columnsConcats.join(" || ' ' || ")})) HIDDEN`;
        createColumnPartialDdls.push(partialDdl);
        addColumnDdls.push(`{
      "name": "${searchColumn.name}",
      "addColumnDdl": "ALTER TABLE ${table.name} ADD COLUMN ${partialDdl}"
    }`);
      }
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
        key.name,
        table,
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
      let parentTable = this.databaseTables.get(table.interleave.parentTable);
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
          parentKey.name,
          parentTable,
        );
        let childColumnDefinition = getColumnDefinition(
          loggingPrefix + "and when validating interleaving,",
          childKey.name,
          table,
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
        if (!index.columns) {
          throw new Error(
            `${loggingPrefix} "columns" is missing in index ${index.name}.`,
          );
        }
        let indexColumns = new Array<string>();
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
            column.name,
            table,
          );
          indexColumns.push(`${column.name}${column.desc ? " DESC" : ""}`);
        }

        indexDdls.push(`{
      "name": "${index.name}",
      "createIndexDdl": "CREATE ${index.unique ? "UNIQUE " : ""}${index.nullFiltered ? "NULL_FILTERED " : ""}INDEX ${index.name} ON ${table.name}(${indexColumns.join(", ")})"
    }`);
      }
    }

    if (table.searchIndexes) {
      for (let searchIndex of table.searchIndexes) {
        if (!searchIndex.name) {
          throw new Error(
            `${loggingPrefix} "name" is missing in one element of "searchIndexes" field.`,
          );
        }
        if (!searchIndex.columns) {
          throw new Error(
            `${loggingPrefix} "columns" is missing in search index ${searchIndex.name}.`,
          );
        }
        for (let column of searchIndex.columns) {
          getSearchColumnDefinition(
            loggingPrefix + " and when generating search indexes,",
            column,
            table,
          );
        }
        let paritiionByClause = "";
        if (searchIndex.partitionByColumns) {
          for (let column of searchIndex.partitionByColumns) {
            getColumnDefinition(
              loggingPrefix +
                " and when generating search indexes with partition by clauses,",
              column,
              table,
            );
          }
          paritiionByClause = ` PARTITION BY ${searchIndex.partitionByColumns.join(", ")}`;
        }
        let orderByClause = "";
        if (searchIndex.orderByColumns) {
          let orderByColumns = new Array<string>();
          for (let column of searchIndex.orderByColumns) {
            if (typeof column === "string") {
              column = {
                name: column,
                desc: false,
              };
            }
            let columnDef = getColumnDefinition(
              loggingPrefix +
                " and when generating search indexes with order by clauses,",
              column.name,
              table,
            );
            if (columnDef.type !== "int53") {
              throw new Error(
                `${loggingPrefix} search index ${searchIndex.name}'s order by column ${column.name} is not an int53. Search index can only be ordered by ints.`,
              );
            }
            if (columnDef.isArray) {
              throw new Error(
                `${loggingPrefix} search index ${searchIndex.name}'s order by column ${column.name} is an array. Search index can only be ordered by non-array columns.`,
              );
            }
            if (columnDef.nullable) {
              throw new Error(
                `${loggingPrefix} search index ${searchIndex.name}'s order by column ${column.name} is nullable. Search index can only be ordered by non-null columns.`,
              );
            }
            orderByColumns.push(`${column.name}${column.desc ? " DESC" : ""}`);
          }
          orderByClause = ` ORDER BY ${orderByColumns.join(", ")}`;
        }

        indexDdls.push(`{
      "name": "${searchIndex.name}",
      "createIndexDdl": "CREATE SEARCH INDEX ${searchIndex.name} ON ${table.name}(${searchIndex.columns.join(", ")})${paritiionByClause}${orderByClause}"
    }`);
      }
    }

    this.databaseTables.set(table.name, table);
    this.tableDdls.push(`{
    "name": "${table.name}",
    "columns": [${addColumnDdls.join(", ")}],
    "createTableDdl": "CREATE TABLE ${table.name} (${createColumnPartialDdls.join(", ")}) PRIMARY KEY (${primaryKeys.join(", ")})${interleaveOption}",
    "indexes": [${indexDdls.join(", ")}]
  }`);

    if (table.insert) {
      this.generateSpannerInsert({
        name: `${table.insert}`,
        table: table.name,
        set: table.columns.map((column) => column.name),
      });
    }

    if (table.delete) {
      this.generateSpannerDelete({
        name: table.delete,
        table: table.name,
        where: {
          op: "AND",
          exprs: table.primaryKeys.map((key) => ({
            lColumn: typeof key === "string" ? key : key.name,
            op: "=",
          })),
        },
      });
    }

    if (table.get) {
      this.generateSpannerSelect({
        name: table.get,
        from: table.name,
        where: {
          op: "AND",
          exprs: table.primaryKeys.map((key) => ({
            lColumn: typeof key === "string" ? key : key.name,
            op: "=",
          })),
        },
        get: table.columns.map((column) => column.name),
      });
    }

    if (table.update) {
      let primaryKeys = table.primaryKeys.map((key) =>
        typeof key === "string" ? key : key.name,
      );
      this.generateSpannerUpdate({
        name: table.update,
        table: table.name,
        where: {
          op: "AND",
          exprs: primaryKeys.map((key) => ({
            lColumn: key,
            op: "=",
          })),
        },
        set: table.columns
          .map((column) => column.name)
          .filter((name) => !primaryKeys.includes(name)),
      });
    }
  }

  private generateSpannerTaskTable(table: SpannerTaskTableDefinition): void {
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
    let columns = [...table.columns];
    columns.push(
      {
        name: table.retryCountColumn,
        type: "float64",
        nullable: true,
      },
      {
        name: table.executionTimeColumn,
        type: "timestamp",
        nullable: true,
      },
      {
        name: table.createdTimeColumn,
        type: "timestamp",
        nullable: true,
      },
    );

    if (!table.executionTimeIndex) {
      throw new Error(
        `${loggingPrefix} "executionTimeIndex" is missing on task table ${table.name}.`,
      );
    }
    let indexes: Array<SpannerIndexDefinition> = [
      ...(table.indexes ?? []),
      {
        name: table.executionTimeIndex,
        columns: [table.executionTimeColumn],
      },
    ];

    if (!table.insert) {
      throw new Error(
        `${loggingPrefix} "insert" is missing on task table ${table.name}.`,
      );
    }
    if (!table.delete) {
      throw new Error(
        `${loggingPrefix} "delete" is missing on task table ${table.name}.`,
      );
    }
    if (!table.get) {
      throw new Error(
        `${loggingPrefix} "get" is missing on task table ${table.name}.`,
      );
    }
    this.generateSpannerTable({
      kind: "Table",
      name: table.name,
      columns: columns,
      primaryKeys: table.primaryKeys,
      indexes: indexes,
      insert: table.insert,
      delete: table.delete,
      get: table.get,
    });

    if (!table.listPendingTasks) {
      throw new Error(
        `${loggingPrefix} "listPendingTasks" is missing on task table ${table.name}.`,
      );
    }
    this.generateSpannerSelect({
      name: table.listPendingTasks,
      from: table.name,
      where: {
        op: "<=",
        lColumn: table.executionTimeColumn,
      },
      get: table.columns.map((column) => column.name),
    });

    if (!table.getMetadata) {
      throw new Error(
        `${loggingPrefix} "getMetadata" is missing on task table ${table.name}.`,
      );
    }
    this.generateSpannerSelect({
      name: table.getMetadata,
      from: table.name,
      where: {
        op: "AND",
        exprs: table.primaryKeys.map((key) => ({
          lColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
      get: [table.retryCountColumn, table.executionTimeColumn],
    });

    if (!table.updateMetadata) {
      throw new Error(
        `${loggingPrefix} "updateMetadata" is missing on task table ${table.name}.`,
      );
    }
    this.generateSpannerUpdate({
      name: table.updateMetadata,
      table: table.name,
      where: {
        op: "AND",
        exprs: table.primaryKeys.map((key) => ({
          lColumn: typeof key === "string" ? key : key.name,
          op: "=",
        })),
      },
      set: [table.retryCountColumn, table.executionTimeColumn],
    });
  }

  private resolveTableAlias(
    loggingPrefix: string,
    tableAlias: string,
  ): SpannerTableDefinition {
    let tableName = this.currentTableAliases.get(tableAlias);
    if (!tableName) {
      throw new Error(
        `${loggingPrefix} ${tableAlias} refers to a table not found in the query.`,
      );
    }
    return this.databaseTables.get(tableName);
  }

  private generateSpannerInsert(
    insertDefinition: SpannerInsertDefinition,
  ): void {
    if (!insertDefinition.name) {
      throw new Error(`"name" is missing on a spanner insert definition.`);
    }
    let loggingPrefix = `When generating insert statement ${insertDefinition.name},`;
    if (!insertDefinition.table) {
      throw new Error(`${loggingPrefix} "table" is missing.`);
    }
    let table = this.databaseTables.get(insertDefinition.table);
    if (!table) {
      throw new Error(
        `${loggingPrefix} table ${insertDefinition.table} is not found in the database's definition.`,
      );
    }

    this.clearInput();
    let columns = new Array<string>();
    let values = new Array<string>();
    if (!insertDefinition.set) {
      throw new Error(`${loggingPrefix} "set" is missing.`);
    }
    for (let column of insertDefinition.set) {
      let columnDefinition = getColumnDefinition(loggingPrefix, column, table);
      columns.push(column);
      let argVariable = column;
      this.collectInput(loggingPrefix, argVariable, columnDefinition);
      values.push(`@${argVariable}`);
    }

    let onConflictClause = "";
    if (insertDefinition.onConflict === "IGNORE") {
      onConflictClause = "OR IGNORE ";
    } else if (insertDefinition.onConflict === "UPDATE") {
      onConflictClause = "OR UPDATE ";
    }

    this.sqlContentBuilder.importFromSpannerTransaction("Statement");
    this.sqlContentBuilder.push(`
export function ${toInitalLowercased(insertDefinition.name)}Statement(
  args: {${joinArray(this.inputArgs, "\n    ", ",")}
  }
): Statement {
  return {
    sql: "INSERT ${onConflictClause}${insertDefinition.table} (${columns.join(", ")}) VALUES (${values.join(", ")})",
    params: {${joinArray(this.inputConversions, "\n      ", ",")}
    },
    types: {${joinArray(this.inputQueryTypes, "\n      ", ",")}
    }
  };
}
`);
  }

  private generateSpannerUpdate(
    updateDefinition: SpannerUpdateDefinition,
  ): void {
    if (!updateDefinition.name) {
      throw new Error(`"name" is missing on a spanner update definition.`);
    }
    let loggingPrefix = `When generating update statement ${updateDefinition.name},`;
    if (!updateDefinition.table) {
      throw new Error(`${loggingPrefix} "table" is missing.`);
    }
    let table = this.databaseTables.get(updateDefinition.table);
    if (!table) {
      throw new Error(
        `${loggingPrefix} table ${updateDefinition.table} is not found in the database's definition.`,
      );
    }

    this.clearInput();
    if (!updateDefinition.table) {
      throw new Error(`${loggingPrefix} "table" is missing.`);
    }
    this.currentDefaultTableAlias = updateDefinition.table;
    this.currentTableAliases = new Map<string, string>().set(
      updateDefinition.table,
      updateDefinition.table,
    );
    if (!updateDefinition.where) {
      throw new Error(`${loggingPrefix} "where" is missing.`);
    }
    let whereClause = this.generateWhere(
      loggingPrefix + " and when generating where clause,",
      updateDefinition.where,
    );

    let setItems = new Array<string>();
    if (!updateDefinition.set) {
      throw new Error(`${loggingPrefix} "set" is missing.`);
    }
    for (let column of updateDefinition.set) {
      let columnDefinition = getColumnDefinition(loggingPrefix, column, table);
      let argVariable = `set${toInitialUppercased(column)}`;
      this.collectInput(
        loggingPrefix + " and when generating set columns,",
        argVariable,
        columnDefinition,
      );
      setItems.push(`${column} = @${argVariable}`);
    }

    this.sqlContentBuilder.importFromSpannerTransaction("Statement");
    this.sqlContentBuilder.push(`
export function ${toInitalLowercased(updateDefinition.name)}Statement(
  args: {${joinArray(this.inputArgs, "\n    ", ",")}
  }
): Statement {
  return {
    sql: "UPDATE ${updateDefinition.table} SET ${setItems.join(", ")} WHERE ${whereClause}",
    params: {${joinArray(this.inputConversions, "\n      ", ",")}
    },
    types: {${joinArray(this.inputQueryTypes, "\n      ", ",")}
    }
  };
}
`);
  }

  private generateSpannerDelete(
    deleteDefinition: SpannerDeleteDefinition,
  ): void {
    if (!deleteDefinition.name) {
      throw new Error(`"name" is missing on a spanner delete definition.`);
    }
    let loggingPrefix = `When generating delete statement ${deleteDefinition.name},`;
    let table = this.databaseTables.get(deleteDefinition.table);
    if (!table) {
      throw new Error(
        `${loggingPrefix} table ${deleteDefinition.table} is not found in the database's definition.`,
      );
    }

    this.clearInput();
    if (!deleteDefinition.table) {
      throw new Error(`${loggingPrefix} "table" is missing.`);
    }
    this.currentDefaultTableAlias = deleteDefinition.table;
    this.currentTableAliases = new Map<string, string>().set(
      deleteDefinition.table,
      deleteDefinition.table,
    );
    if (!deleteDefinition.where) {
      throw new Error(`${loggingPrefix} "where" is missing.`);
    }
    let whereClause = this.generateWhere(loggingPrefix, deleteDefinition.where);

    this.sqlContentBuilder.importFromSpannerTransaction("Statement");
    this.sqlContentBuilder.push(`
export function ${toInitalLowercased(deleteDefinition.name)}Statement(
  args: {${joinArray(this.inputArgs, "\n    ", ",")}
  }
): Statement {
  return {
    sql: "DELETE ${deleteDefinition.table} WHERE ${whereClause}",
    params: {${joinArray(this.inputConversions, "\n      ", ",")}
    },
    types: {${joinArray(this.inputQueryTypes, "\n      ", ",")}
    }
  };
}
`);
  }

  private generateSpannerSelect(selectDefinition: SpannerSelectDefinition) {
    if (!selectDefinition.name) {
      throw new Error(`"name" is missing on a spanner select definition.`);
    }
    let loggingPrefix = `When generating select statement ${selectDefinition.name},`;
    if (!selectDefinition.from) {
      throw new Error(`${loggingPrefix} "from" is missing.`);
    }
    if (!selectDefinition.as) {
      selectDefinition.as = selectDefinition.from;
    }
    if (!this.databaseTables.has(selectDefinition.from)) {
      throw new Error(
        `${loggingPrefix} table ${selectDefinition.from} is not found in the database.`,
      );
    }
    this.clearInput();

    this.currentDefaultTableAlias = selectDefinition.as;
    this.currentTableAliases = new Map<string, string>().set(
      selectDefinition.as,
      selectDefinition.from,
    );
    let fromTables = new Array<string>();
    fromTables.push(
      `${selectDefinition.from}${selectDefinition.as !== selectDefinition.from ? " AS " + selectDefinition.as : ""}`,
    );
    if (selectDefinition.join) {
      for (let joinTable of selectDefinition.join) {
        if (!joinTable.with) {
          throw new Error(
            `${loggingPrefix} "with" is missing in "join" field.`,
          );
        }
        if (!joinTable.as) {
          joinTable.as = joinTable.with;
        }
        if (!ALL_JOIN_TYPE.has(joinTable.type)) {
          throw new Error(
            `${loggingPrefix} and when joining ${joinTable.with}, "type" is either missing or not one of valid types "${Array.from(ALL_JOIN_TYPE).join(",")}"`,
          );
        }
        this.currentTableAliases.set(joinTable.as, joinTable.with);
        this.currentJoinRightTableAlias = joinTable.as;
        this.currentJoinRightTable = this.databaseTables.get(joinTable.with);
        if (!this.currentJoinRightTable) {
          throw new Error(
            `${loggingPrefix} table ${joinTable.with} is not found in the database.`,
          );
        }
        let joinOnClause = "";
        if (joinTable.on) {
          joinOnClause = this.generateJoinOn(
            loggingPrefix + ` and when joining ${joinTable.with},`,
            joinTable.on,
          );
          joinOnClause = ` ON ${joinOnClause}`;
        }
        fromTables.push(
          `${joinTable.type} JOIN ${joinTable.with}${joinTable.as !== joinTable.with ? " AS " + joinTable.as : ""}${joinOnClause}`,
        );
      }
    }

    let whereClause = "";
    if (selectDefinition.where) {
      whereClause = this.generateWhere(
        loggingPrefix + " and when generating where clause,",
        selectDefinition.where,
      );
      whereClause = ` WHERE ${whereClause}`;
    }

    let orderByClause = "";
    if (selectDefinition.orderBy) {
      let orderByExprs = new Array<string>();
      for (let i = 0; i < selectDefinition.orderBy.length; i++) {
        let expr = selectDefinition.orderBy[i];
        if (typeof expr === "string") {
          expr = {
            column: expr,
            table: this.currentDefaultTableAlias,
          };
        }
        if (!expr.table) {
          expr.table = this.currentDefaultTableAlias;
        }
        let table = this.resolveTableAlias(
          loggingPrefix + ` and when generating order by clause,`,
          expr.table,
        );
        if (expr.func) {
          let { lExpr } = this.generateFunction(
            loggingPrefix + ` and when generating order by clause,`,
            expr.func,
            expr.column,
            expr.table,
            table,
            "OrderBy",
          );
          orderByExprs.push(`${lExpr}${expr.desc ? " DESC" : ""}`);
        } else {
          getColumnDefinition(
            loggingPrefix + ` and when generating order by clause,`,
            expr.column,
            table,
          );
          orderByExprs.push(
            `${expr.table}.${expr.column}${expr.desc ? " DESC" : ""}`,
          );
        }
      }
      orderByClause = ` ORDER BY ${orderByExprs.join(", ")}`;
    }

    let limitClause = "";
    if (selectDefinition.withLimit) {
      this.collectInput(loggingPrefix, "limit", {
        type: "int53",
      });
      limitClause = ` LIMIT @limit`;
    }
    let offsetClause = "";
    if (selectDefinition.withOffset) {
      this.collectInput(loggingPrefix, "offset", {
        type: "int53",
      });
      offsetClause = ` OFFSET @offset`;
    }

    this.clearOutput();
    let selectColumns = new Array<string>();
    if (!selectDefinition.get) {
      throw new Error(`${loggingPrefix} "get" is missing.`);
    }
    for (let getExpr of selectDefinition.get) {
      if (typeof getExpr === "string") {
        getExpr = {
          column: getExpr,
          table: this.currentDefaultTableAlias,
        };
      }
      if (!getExpr.table) {
        getExpr.table = this.currentDefaultTableAlias;
      }
      let table = this.resolveTableAlias(
        loggingPrefix + ` and when generating get columns,`,
        getExpr.table,
      );
      if (getExpr.all) {
        let allColumns = table.columns;
        for (let column of allColumns) {
          let fieldName = `${toInitalLowercased(table.name)}${toInitialUppercased(column.name)}`;
          this.collectOuptut(loggingPrefix, fieldName, column);
          selectColumns.push(`${getExpr.table}.${column.name}`);
        }
      } else if (getExpr.columnGroup) {
        let columnGroupDefinition = getColumnGroupDefinition(
          loggingPrefix + ` and when generating get column groups,`,
          getExpr.columnGroup,
          table,
        );
        for (let columnName of columnGroupDefinition.columns) {
          let columnDefinition = getColumnDefinition(
            loggingPrefix +
              ` and when generating get columns for column group ${getExpr.columnGroup},`,
            columnName,
            table,
          );
          let fieldName = `${toInitalLowercased(table.name)}${toInitialUppercased(columnName)}`;
          this.collectOuptut(loggingPrefix, fieldName, columnDefinition);
          selectColumns.push(`${getExpr.table}.${columnName}`);
        }
      } else if (getExpr.func) {
        let { lExpr, returnType } = this.generateFunction(
          loggingPrefix + ` and when generating get columns,`,
          getExpr.func,
          getExpr.column,
          getExpr.table,
          table,
          "Select",
        );
        let fieldName = `${toInitalLowercased(table.name)}${toInitialUppercased(getExpr.column)}${BINARY_OP_NAME.get(getExpr.func)}`;
        this.collectOuptut(loggingPrefix, fieldName, {
          type: returnType,
        });
        selectColumns.push(lExpr);
      } else {
        let columnDefinition = getColumnDefinition(
          loggingPrefix + ` and when generating select columns,`,
          getExpr.column,
          table,
        );
        let fieldName = `${toInitalLowercased(table.name)}${toInitialUppercased(getExpr.column)}`;
        this.collectOuptut(loggingPrefix, fieldName, columnDefinition);
        selectColumns.push(`${getExpr.table}.${getExpr.column}`);
      }
    }

    this.sqlContentBuilder.importFromSpanner("Database", "Transaction");
    this.sqlContentBuilder.importFromMessageDescriptor("MessageDescriptor");
    this.sqlContentBuilder.push(`
export interface ${selectDefinition.name}Row {${joinArray(this.outputFields, "\n  ", ",")}
}

export let ${toUppercaseSnaked(selectDefinition.name)}_ROW: MessageDescriptor<${selectDefinition.name}Row> = {
  name: '${selectDefinition.name}Row',
  fields: [${this.outputFieldDescriptors.join(", ")}],
};

export async function ${toInitalLowercased(selectDefinition.name)}(
  runner: Database | Transaction,
  args: {${joinArray(this.inputArgs, "\n    ", ",")}
  }
): Promise<Array<${selectDefinition.name}Row>> {
  let [rows] = await runner.run({
    sql: "SELECT ${selectColumns.join(", ")} FROM ${fromTables.join(" ")}${whereClause}${orderByClause}${limitClause}${offsetClause}",
    params: {${joinArray(this.inputConversions, "\n      ", ",")}
    },
    types: {${joinArray(this.inputQueryTypes, "\n      ", ",")}
    }
  });
  let resRows = new Array<${selectDefinition.name}Row>();
  for (let row of rows) {
    resRows.push({${joinArray(this.outputConversions, "\n      ", ",")}
    });
  }
  return resRows;
}
`);
  }

  public generateWhere(
    loggingPrefix: string,
    where: SpannerWhereConcat | SpannerWhereLeaf,
  ): string {
    if (where.op === "AND" || where.op === "OR") {
      return this.generateWhereConcat(loggingPrefix, where);
    } else {
      return this.generateWhereLeaf(loggingPrefix, where as SpannerWhereLeaf);
    }
  }

  private generateWhereConcat(
    loggingPrefix: string,
    concat: SpannerWhereConcat,
  ): string {
    if (!concat.exprs || !Array.isArray(concat.exprs)) {
      throw new Error(
        `${loggingPrefix} "exprs" is either missing or not an array.`,
      );
    }
    let clauses = concat.exprs.map((expr) =>
      this.generateWhere(loggingPrefix, expr),
    );
    return "(" + clauses.join(` ${concat.op} `) + ")";
  }

  private generateWhereLeaf(
    loggingPrefix: string,
    leaf: SpannerWhereLeaf,
  ): string {
    if (!leaf.lColumn) {
      throw new Error(`${loggingPrefix} "lColumn" is missing.`);
    }
    if (!leaf.lTable) {
      leaf.lTable = this.currentDefaultTableAlias;
    }

    let lTable = this.resolveTableAlias(loggingPrefix, leaf.lTable);
    if (leaf.func) {
      let { lExpr, returnType } = this.generateFunction(
        loggingPrefix,
        leaf.func,
        leaf.lColumn,
        leaf.lTable,
        lTable,
        `Where${BINARY_OP_NAME.get(leaf.op)}`,
      );
      let argVariable =
        leaf.rVar ??
        `${toInitalLowercased(lTable.name)}${toInitialUppercased(leaf.lColumn)}${BINARY_OP_NAME.get(leaf.func)}${BINARY_OP_NAME.get(leaf.op)}`;
      this.collectInput(loggingPrefix, argVariable, {
        type: returnType,
      });
      switch (leaf.func) {
        case "SCORE":
          if (!SCORE_RESULT_OP.has(leaf.op)) {
            throw new Error(
              `${loggingPrefix} "op" is either missing or not one of valid types "${Array.from(SCORE_RESULT_OP).join(",")}" to handle SCORE results.`,
            );
          }
          return `${lExpr} ${leaf.op} @${argVariable}`;
        default:
          throw new Error(
            `${loggingPrefix} function ${leaf.func} is not handled properly.`,
          );
      }
    } else {
      if (leaf.op === "SEARCH") {
        getSearchColumnDefinition(loggingPrefix, leaf.lColumn, lTable);
        // Search column only supports string type for now.
        let argVariable =
          leaf.rVar ??
          `${toInitalLowercased(lTable.name)}${toInitialUppercased(leaf.lColumn)}${BINARY_OP_NAME.get(leaf.op)}`;
        this.collectInput(loggingPrefix, argVariable, {
          type: "string",
        });
        return `${leaf.op}(${leaf.lTable}.${leaf.lColumn}, @${argVariable})`;
      } else {
        let columnDefinition = getColumnDefinition(
          loggingPrefix,
          leaf.lColumn,
          lTable,
        );
        switch (leaf.op) {
          case "IS NULL":
          case "IS NOT NULL":
            if (!columnDefinition.nullable) {
              throw new Error(
                `${loggingPrefix} column ${leaf.lTable}.${leaf.lColumn} is not nullable and doesn't need to check NULL in the query.`,
              );
            }
            return `${leaf.lTable}.${leaf.lColumn} ${leaf.op}`;
          case ">":
          case "<":
          case ">=":
          case "<=":
          case "!=":
          case "=":
            if (columnDefinition.isArray) {
              throw new Error(
                `${loggingPrefix} column ${leaf.lTable}.${leaf.lColumn} is an array and doesn't support operator "${leaf.op}".`,
              );
            }
            let argVariable =
              leaf.rVar ??
              `${toInitalLowercased(lTable.name)}${toInitialUppercased(leaf.lColumn)}${BINARY_OP_NAME.get(leaf.op)}`;
            this.collectInput(loggingPrefix, argVariable, columnDefinition);
            return `${leaf.lTable}.${leaf.lColumn} ${leaf.op} @${argVariable}`;
          case "IN":
            if (columnDefinition.isArray) {
              throw new Error(
                `${loggingPrefix} column ${leaf.lTable}.${leaf.lColumn} is an array and doesn't support operator "IN".`,
              );
            }
            let inArgVariable =
              leaf.rVar ??
              `${toInitalLowercased(lTable.name)}${toInitialUppercased(leaf.lColumn)}${BINARY_OP_NAME.get(leaf.op)}`;
            this.collectInput(loggingPrefix, inArgVariable, {
              ...columnDefinition,
              isArray: true,
            });
            return `${leaf.lTable}.${leaf.lColumn} ${leaf.op} @${inArgVariable}`;
          default:
            throw new Error(
              `${loggingPrefix} "op" is either missing or not valid.`,
            );
        }
      }
    }
  }

  private generateJoinOn(
    loggingPrefix: string,
    joinOn: SpannerJoinOnConcat | SpannerJoinOnLeaf,
  ): string {
    if (joinOn.op === "AND" || joinOn.op === "OR") {
      return this.generateJoinOnConcat(loggingPrefix, joinOn);
    } else {
      return this.generateJoinOnLeaf(
        loggingPrefix,
        joinOn as SpannerJoinOnLeaf,
      );
    }
  }

  private generateJoinOnConcat(
    loggingPrefix: string,
    concat: SpannerJoinOnConcat,
  ): string {
    if (!concat.exprs || !Array.isArray(concat.exprs)) {
      throw new Error(
        `${loggingPrefix} "exprs" is either missing or not an array.`,
      );
    }
    let clauses = concat.exprs.map((expr) =>
      this.generateJoinOn(loggingPrefix, expr),
    );
    return "(" + clauses.join(` ${concat.op} `) + ")";
  }

  public generateJoinOnLeaf(
    loggingPrefix: string,
    leaf: SpannerJoinOnLeaf,
  ): string {
    if (!ALL_JOIN_LEAF_OP.has(leaf.op)) {
      throw new Error(
        `${loggingPrefix} "op" is either missing or not one of valid types "${Array.from(ALL_JOIN_LEAF_OP).join(",")}".`,
      );
    }
    if (!leaf.rColumn) {
      throw new Error(`${loggingPrefix} "rColumn" is missing.`);
    }
    let rightColumnDefinition = getColumnDefinition(
      loggingPrefix,
      leaf.rColumn,
      this.currentJoinRightTable,
    );
    if (leaf.lColumn) {
      if (!leaf.lTable) {
        throw new Error(`${loggingPrefix} "lTable" is missing.`);
      }
      let lTable = this.resolveTableAlias(loggingPrefix, leaf.lTable);
      let leftColumnDefinition = getColumnDefinition(
        loggingPrefix,
        leaf.lColumn,
        lTable,
      );
      if (leftColumnDefinition.type !== rightColumnDefinition.type) {
        throw new Error(
          `${loggingPrefix} the left column ${leaf.lTable}.${leaf.lColumn} whose type is ${leftColumnDefinition.type} doesn't match the right column ${this.currentJoinRightTableAlias}.${leaf.rColumn} whose type is ${rightColumnDefinition.type}.`,
        );
      }
      return `${leaf.lTable}.${leaf.lColumn} ${leaf.op} ${this.currentJoinRightTableAlias}.${leaf.rColumn}`;
    } else {
      let argVariable =
        leaf.lVar ??
        `${toInitalLowercased(this.currentJoinRightTableAlias)}${toInitialUppercased(leaf.rColumn)}${BINARY_OP_NAME.get(leaf.op)}`;
      this.collectInput(loggingPrefix, argVariable, rightColumnDefinition);
      return `@${argVariable} ${leaf.op} ${this.currentJoinRightTableAlias}.${leaf.rColumn}`;
    }
  }

  private generateFunction(
    loggingPrefix: string,
    func: "SCORE",
    lColumn: string,
    lTableAlias: string,
    lTable: SpannerTableDefinition,
    context: string,
  ): {
    lExpr: string;
    returnType: string;
  } {
    let argVariable = `${toInitalLowercased(lTable.name)}${toInitialUppercased(lColumn)}${BINARY_OP_NAME.get(func)}${context}`;
    switch (func) {
      case "SCORE":
        getSearchColumnDefinition(loggingPrefix, lColumn, lTable);
        // Search column only supports string type for now.
        this.collectInput(loggingPrefix, argVariable, {
          type: "string",
        });
        // The function returns a number.
        return {
          lExpr: `${func}(${lTableAlias}.${lColumn}, @${argVariable})`,
          returnType: "float64",
        };
      default:
        throw new Error(
          `${loggingPrefix} function ${func} is either missing or not valid.`,
        );
    }
  }

  private clearInput(): void {
    this.inputArgs = new Array<string>();
    this.inputQueryTypes = new Array<string>();
    this.inputConversions = new Array<string>();
  }

  private collectInput(
    loggingPrefix: string,
    argVariable: string,
    columnType: SpannerTableColumnType,
  ): void {
    let tsType = COLUMN_PRIMITIVE_TYPE_TO_TS_TYPE.get(columnType.type);
    let queryType: string;
    let conversion: string;
    let argsDotVariable = `args.${argVariable}`;
    if (!tsType) {
      let typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        columnType.type,
        columnType.import,
      );
      this.sqlContentBuilder.importFromDefinition(
        columnType.import,
        columnType.type,
      );
      if (typeDefinition.kind === "Enum") {
        this.sqlContentBuilder.importFromSpanner("Spanner");
        if (!columnType.isArray) {
          tsType = typeDefinition.name;
          queryType = `{ type: "float64" }`;
          conversion = `Spanner.float(${argsDotVariable})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          queryType = `{ type: "array", child: { type: "float64" } }`;
          conversion = `${argsDotVariable}.map((e) => Spanner.float(e))`;
        }
      } else if (typeDefinition.kind === "Message") {
        this.sqlContentBuilder.importFromMessageSerializer("serializeMessage");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.sqlContentBuilder.importFromDefinition(
          columnType.import,
          tsTypeDescriptor,
        );
        if (!columnType.isArray) {
          tsType = typeDefinition.name;
          queryType = `{ type: "bytes" }`;
          conversion = `Buffer.from(serializeMessage(${argsDotVariable}, ${tsTypeDescriptor}).buffer)`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          queryType = `{ type: "array", child: { type: "bytes" } }`;
          conversion = `${argsDotVariable}.map((e) => Buffer.from(serializeMessage(e, ${tsTypeDescriptor}).buffer))`;
        }
      }
    } else {
      if (!columnType.isArray) {
        queryType = `{ type: "${COLUMN_PRIMITIVE_TYPE_TO_QUERY_TYPE.get(columnType.type)}" }`;
        switch (columnType.type) {
          case "int53":
            conversion = `${argsDotVariable}.toString()`;
            break;
          case "float64":
            this.sqlContentBuilder.importFromSpanner("Spanner");
            conversion = `Spanner.float(${argsDotVariable})`;
            break;
          case "timestamp":
            conversion = `new Date(${argsDotVariable}).toISOString()`;
            break;
          default:
            // bool, string
            conversion = `${argsDotVariable}`;
        }
      } else {
        queryType = `{ type: "array", child: { type: "${COLUMN_PRIMITIVE_TYPE_TO_QUERY_TYPE.get(columnType.type)}" } }`;
        tsType = `Array<${tsType}>`;
        switch (columnType.type) {
          case "int53":
            conversion = `${argsDotVariable}.map((e) => e.toString())`;
            break;
          case "float64":
            this.sqlContentBuilder.importFromSpanner("Spanner");
            conversion = `${argsDotVariable}.map((e) => Spanner.float(e))`;
            break;
          case "timestamp":
            conversion = `${argsDotVariable}.map((e) => new Date(e).toISOString())`;
            break;
          default:
            // bool, string
            conversion = `${argsDotVariable}`;
        }
      }
    }
    this.inputQueryTypes.push(`${argVariable}: ${queryType}`);
    if (columnType.nullable) {
      this.inputArgs.push(`${argVariable}?: ${tsType}`);
      this.inputConversions.push(
        `${argVariable}: ${argsDotVariable} == null ? null : ${conversion}`,
      );
    } else {
      this.inputArgs.push(`${argVariable}: ${tsType}`);
      this.inputConversions.push(`${argVariable}: ${conversion}`);
    }
  }

  private clearOutput(): void {
    this.outputFields = new Array<string>();
    this.outputConversions = new Array<string>();
    this.outputFieldDescriptors = new Array<string>();
  }

  private collectOuptut(
    loggingPrefix: string,
    fieldName: string,
    columnType: SpannerTableColumnType,
  ): void {
    let columnIndex = this.outputFields.length;
    let columnVariable = `row.at(${columnIndex})`;
    let tsType = COLUMN_PRIMITIVE_TYPE_TO_TS_TYPE.get(columnType.type);
    let conversion: string;
    let typeDescriptorLine: string;
    let isArrayLine: string;
    if (!tsType) {
      let typeDefinition = this.definitionResolver.resolve(
        loggingPrefix,
        columnType.type,
        columnType.import,
      );
      this.sqlContentBuilder.importFromDefinition(
        columnType.import,
        columnType.type,
      );
      if (typeDefinition.kind === "Enum") {
        this.sqlContentBuilder.importFromMessageSerializer("toEnumFromNumber");
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.sqlContentBuilder.importFromDefinition(
          columnType.import,
          tsTypeDescriptor,
        );
        typeDescriptorLine = `enumType: ${tsTypeDescriptor}`;
        if (!columnType.isArray) {
          tsType = typeDefinition.name;
          conversion = `toEnumFromNumber(${columnVariable}.value.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          isArrayLine = `isArray: true`;
          conversion = `${columnVariable}.value.map((e) => toEnumFromNumber(e.value, ${tsTypeDescriptor}))`;
        }
      } else if (typeDefinition.kind === "Message") {
        this.sqlContentBuilder.importFromMessageSerializer(
          "deserializeMessage",
        );
        let tsTypeDescriptor = toUppercaseSnaked(typeDefinition.name);
        this.sqlContentBuilder.importFromDefinition(
          columnType.import,
          tsTypeDescriptor,
        );
        typeDescriptorLine = `messageType: ${tsTypeDescriptor}`;
        if (!columnType.isArray) {
          tsType = typeDefinition.name;
          conversion = `deserializeMessage(${columnVariable}.value, ${tsTypeDescriptor})`;
        } else {
          tsType = `Array<${typeDefinition.name}>`;
          isArrayLine = `isArray: true`;
          conversion = `${columnVariable}.value.map((e) => deserializeMessage(e, ${tsTypeDescriptor}))`;
        }
      }
    } else {
      this.sqlContentBuilder.importFromMessageDescriptor("PrimitiveType");
      typeDescriptorLine = `primitiveType: PrimitiveType.${tsType.toUpperCase()}`;
      if (!columnType.isArray) {
        switch (columnType.type) {
          case "float64":
            conversion = `${columnVariable}.value.value`;
            break;
          case "int53":
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
        switch (columnType.type) {
          case "float64":
            conversion = `${columnVariable}.value.map((e) => e.value)`;
            break;
          case "int53":
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
    this.outputFields.push(`${fieldName}?: ${tsType}`);
    this.outputConversions.push(
      `${fieldName}: ${columnVariable}.value == null ? undefined : ${conversion}`,
    );
    this.outputFieldDescriptors.push(`{
    name: '${fieldName}',
    index: ${columnIndex + 1},
    ${typeDescriptorLine},${isArrayLine ? "\n    " + isArrayLine + "," : ""}
  }`);
  }
}
