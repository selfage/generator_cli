export interface EnumValue {
  // Recommended to be SNAKE_CASE.
  name: string;
  value: number;
}

// Generated code requires package `@selfage/message`.
export interface EnumDefinition {
  kind: "Enum";
  // Must be of CamelCase.
  name: string;
  values: Array<EnumValue>;
}

export interface MessageFieldDefinition {
  // Recommended to be camelCase.
  name: string;
  // Can be 'number', 'string', 'boolean' or the name of a message or enum.
  type: string;
  index: number;
  isArray?: true;
  // Import relative to CWD. Do not include '.yaml'.
  import?: string;
  deprecated?: true;
}

export interface DatastoreFilterTemplate {
  // The name of a `MessageFieldDefinition`.
  fieldName: string;
  // One of "=", ">", "<", ">=" and "<=".
  operator: string;
}

export interface DatastoreOrdering {
  // The name of a `MessageFieldDefinition`.
  fieldName: string;
  descending: boolean;
}

export interface DatastoreQueryTemplate {
  // Recommended to be CamelCase, which will be part of the name of a class.
  name: string;
  filters?: Array<DatastoreFilterTemplate>;
  orderings?: Array<DatastoreOrdering>;
}

export interface DatastoreDefinition {
  // The path to output the generated Datastore definition, relative to the
  // current definition JSON file. It should be separated from its message
  // definition. Do not include '.ts'.
  output: string;
  key: string;
  queries?: Array<DatastoreQueryTemplate>;
}

// Generated code requires package `@selfage/message`.
export interface MessageDefinition {
  kind: "Message";
  // Must be of CamelCase.
  name: string;
  fields: Array<MessageFieldDefinition>;
  // Deprecated for now.
  // Requires package `@selfage/datastore_client`.
  // datastore?: DatastoreDefinition;
}

// Generated code requires package `@selfage/service_descriptor`.
export interface ServiceDefinition {
  kind: "Service";
  // Must be of CamelCase.
  name: string;
  // Includes "/" at the beginning. Must be unique.
  path: string;
}

export interface KeyValueParamDefinition {
  // The key of the search param.
  key: string;
  // Can only refer to a message.
  type: string;
  // Import relative to CWD. Do not include '.yaml'.
  import?: string;
}

export interface RemoteCallDefinition {
  // Must be of CamelCase.
  name: string;
  // The pathname of a url. Must start with "/".
  path: string;
  // The body in a HTTP request. Support either 'bytes' or the name of a message.
  body: string;
  // Import relative to CWD. Do not include '.yaml'.
  importBody?: string;
  // The key in the HTTP header to pass an authorization string to the backend.
  authKey?: string;
  // Prefer `body` when possible. Often used when body is a stream.
  metadata?: KeyValueParamDefinition;
  // Support only referring to a message.
  response: string;
  // Import relative to CWD. Do not include '.yaml'.
  importResponse?: string;
}

export interface RemoteCallsGroupDefinition {
  kind: "RemoteCallsGroup";
  // Must be of CamelCase.
  name: string;
  // Refers to a service definition.
  service: string;
  // Import relative to CWD. Do not include '.yaml'.
  importService?: string;
  path?: string;
  calls: Array<RemoteCallDefinition>;
  // The path to output the generated web client interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputClient: string;
  // The path to output the generated handler interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputHandler: string;
}

export interface SpannerTableColumnType {
  // Supports the following primitive types: bool, int53, float64, timestamp, and string.
  // `bool` is the same in Spanner and JS/TS.
  // `int53` maps to int64 in Spanner and number in JS/TS. Note that it's inefficiently handled by Spanner client in JS/TS.
  // `float64` maps to float64 in Spanner and number in JS/TS.
  // `timestamp` maps to timestamp in Spanner and number in milliseconds in JS/TS.
  // `string` maps to string with MAX length in Spanner and string in JS/TS.
  // `bytes` is NOT supported because it's error-prone due to encoding/decoding.
  // `date` is NOT supported because it's error-prone due to timezone ambiguit.
  // `struct` and `json` types are NOT supported in favor of the message type below.
  // Supports the name of a message which must be defined first and can be imported, which maps to bytes in Spanner.
  // Supports the name of an enum which must be defined first and can be imported, which maps to float64 in Spanner.
  type: string;
  // Import relative to CWD. Do not include '.yaml'.
  import?: string;
  isArray?: true;
  nullable?: true;
}

export interface SpannerTableColumnDefinition extends SpannerTableColumnType {
  // Must be of camelCase.
  name: string;
}

export interface SpannerTableColumnGroupDefinition {
  // Must be of camelCase.
  name: string;
  // Columns to be grouped.
  columns: Array<string>;
}

export interface SpannerTableSearchColumnDefinition {
  // Must be of camelCase.
  name: string;
  // Columns to be tokenized. Can only be string type. Multiple columns will be concatenated with a space in between.
  columnRefs: Array<string>;
}

export interface SpannerIndexColumnDefinition {
  name: string;
  desc: boolean;
}

export interface SpannerTablePrimaryKeyDefinition {
  name: string;
  desc: boolean;
}

export interface SpannerTableInterleaveDefinition {
  parentTable: string;
  cascadeOnDelete?: true;
}

export interface SpannerIndexDefinition {
  // Must be of CamelCase.
  name: string;
  // Columns on the table that includes this definition.
  columns: Array<string | SpannerIndexColumnDefinition>;
  unique?: true;
  nullFiltered?: true;
}

export interface SpannerSearchIndexOrderByDefinition {
  name: string;
  desc: boolean;
}

export interface SpannerSearchIndexDefinition {
  // Must be of CamelCase.
  name: string;
  // Tokenized columns only.
  columns: Array<string>;
  partitionByColumns?: Array<string>;
  orderByColumns?: Array<string | SpannerSearchIndexOrderByDefinition>;
}

export interface SpannerTableDefinition {
  kind: "Table";
  // Must be of CamelCase.
  name: string;
  columns: Array<SpannerTableColumnDefinition>;
  // Group columns to be easily selected.
  columnGroups?: Array<SpannerTableColumnGroupDefinition>;
  searchColumns?: Array<SpannerTableSearchColumnDefinition>;
  primaryKeys: Array<string | SpannerTablePrimaryKeyDefinition>;
  interleave?: SpannerTableInterleaveDefinition;
  indexes?: Array<SpannerIndexDefinition>;
  searchIndexes?: Array<SpannerSearchIndexDefinition>;
  // Specify name of the queries.
  insert?: string;
  delete?: string;
  get?: string;
  update?: string;
}

export interface SpannerTaskTableDefinition {
  kind: "TaskTable";
  // Must be of CamelCase.
  name: string;
  columns: Array<SpannerTableColumnDefinition>;
  // The type is always float64.
  retryCountColumn: string;
  // The type is always timestamp.
  executionTimeColumn: string;
  // The type is always timestamp.
  createdTimeColumn: string;
  primaryKeys: Array<string | SpannerTablePrimaryKeyDefinition>;
  indexes?: Array<SpannerIndexDefinition>;
  // Always indexed by `executionTimeColumn`.
  executionTimeIndex: string;
  // Specify name of the queries.
  insert: string;
  delete: string;
  get: string;
  listPendingTasks: string;
  getMetadata: string;
  updateMetadata: string;
}

export interface SpannerJoinOnLeaf {
  lColumn: string;
  lTable: string;
  op: ">" | "<" | ">=" | "<=" | "!=" | "=";
  // Must refer to the table to be joined.
  rColumn: string;
}

export interface SpannerJoinOnConcat {
  op: "AND" | "OR";
  exprs: Array<SpannerJoinOnConcat | SpannerJoinOnLeaf>;
}

export interface SpannerJoin {
  type: "INNER" | "CROSS" | "FULL" | "LEFT" | "RIGHT";
  with: string;
  as?: string;
  on?: SpannerJoinOnConcat | SpannerJoinOnLeaf;
}

export interface SpannerWhereLeaf {
  lColumn: string;
  lTable?: string;
  // Functions might introduce input values.
  func?: "SCORE";
  // Binary operations introduces an input value.
  op:
    | ">"
    | "<"
    | ">="
    | "<="
    | "!="
    | "="
    | "IS NULL"
    | "IS NOT NULL"
    | "SEARCH"
    | "IN";
  // For binary operations, and you want a variable to be used in code.
  rVar?: string;
}

export interface SpannerWhereConcat {
  op: "AND" | "OR";
  exprs: Array<SpannerWhereConcat | SpannerWhereLeaf>;
}

export interface SpannerOrderByExpr {
  column: string;
  table?: string;
  // Function might introduce input values.
  func?: "SCORE";
  desc?: true;
}

export interface SpannerGetColumnExpr {
  column?: string;
  func?: "SCORE"; // Function only works with `column`.
  all?: true; // Get all columns from the table.
  columnGroup?: string; // Get columns from the column group.
  table?: string;
}

export interface SpannerSelectDefinition {
  // Must be of CamelCase.
  name: string;
  from: string;
  as?: string;
  join?: Array<SpannerJoin>;
  where?: SpannerWhereConcat | SpannerWhereLeaf;
  orderBy?: Array<string | SpannerOrderByExpr>;
  withLimit?: boolean;
  withOffset?: boolean;
  get: Array<string | SpannerGetColumnExpr>;
}

export interface SpannerInsertDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  set: Array<string>;
}

export interface SpannerUpdateDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  set: Array<string>;
  where: SpannerWhereConcat | SpannerWhereLeaf;
}

export interface SpannerDeleteDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  where: SpannerWhereConcat | SpannerWhereLeaf;
}

// Generated code requires package `@google-cloud/spanner`, `@selfage/spanner_schema_update_cli` and `@selfage/message`.
export interface SpannerDatabaseDefinition {
  kind: "SpannerDatabase";
  // Must be of CamelCase.
  name: string;
  tables?: Array<SpannerTableDefinition | SpannerTaskTableDefinition>;
  selects?: Array<SpannerSelectDefinition>;
  inserts?: Array<SpannerInsertDefinition>;
  updates?: Array<SpannerUpdateDefinition>;
  deletes?: Array<SpannerDeleteDefinition>;
  // The path to output the generated DDL JSON file, relative to CWD. Do not
  // include '.yaml'.
  outputDdl: string;
  // The path to output the generated SQL functions, relative to CWD. Do not
  // include '.ts'.
  outputSql: string;
}

export type Definition =
  | EnumDefinition
  | MessageDefinition
  | ServiceDefinition
  | RemoteCallsGroupDefinition
  | SpannerDatabaseDefinition;
