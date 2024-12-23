export interface EnumValue {
  // Recommended to be SNAKE_CASE.
  name: string;
  value: number;
}

export interface EnumDefinition {
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
  // Import relative to CWD. Do not include '.json'.
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

export interface MessageDefinition {
  // Must be of CamelCase.
  name: string;
  fields: Array<MessageFieldDefinition>;
  // Deprecated for now.
  // Requires package `@selfage/datastore_client`.
  // datastore?: DatastoreDefinition;
}

export interface KeyValueParamDefinition {
  // The key of the search param.
  key: string;
  // Can only be the name of a message.
  type: string;
  // Import relative to CWD. Do not include '.json'.
  import?: string;
}

export interface WebRemoteCallDefinition {
  // Must be of CamelCase.
  name: string;
  // The pathname of a url. Must start with "/".
  path: string;
  // The body in a HTTP request. Support either 'bytes' or the name of a message.
  body: string;
  // Import relative to CWD. Do not include '.json'.
  importBody?: string;
  // The key in the HTTP header to pass a user session string to the backend.
  sessionKey?: string;
  // Prefer `body` when possible. Often used when body is a stream.
  metadata?: KeyValueParamDefinition;
  // Support only the name of a message.
  response: string;
  // Import relative to CWD. Do not include '.json'.
  importResponse?: string;
}

export interface WebServiceDefinition {
  // Must be of CamelCase.
  name: string;
  remoteCalls: Array<WebRemoteCallDefinition>;
  // The path to output the generated web client interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputClient: string;
  // The path to output the generated handler interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputHandler: string;
}

export interface NodeRemoteCallDefinition {
  // Must be of CamelCase.
  name: string;
  // The pathname of a url. Must start with "/".
  path: string;
  // The body in a HTTP request. Support either 'bytes' or the name of a message.
  body?: string;
  // Import relative to CWD. Do not include '.json'.
  importBody?: string;
  // Prefer `body` when possible. Often used when body is a bytes stream.
  metadata?: KeyValueParamDefinition;
  // Support only the name of a message.
  response: string;
  // Import relative to CWD. Do not include '.json'.
  importResponse?: string;
}

export interface NodeServiceDefinition {
  // Must be of CamelCase.
  name: string;
  remoteCalls: Array<NodeRemoteCallDefinition>;
  // The path to output the generated web client interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputClient?: string;
  // The path to output the generated handler interfaces, relative to CWD.
  // It should be separated from its metadata definition. Do not include '.ts'.
  outputHandler?: string;
}

export interface SpannerTableColumnDefinition {
  // Must be of camelCase.
  name: string;
  // Supports the following primitive types: bool, int64, float64, timestamp, string, and bytes.
  // `bool` is the same in Spanner and JS/TS.
  // `int64` is NOT supported because it's ineffecient to handle in JS/TS.
  // `float64` maps to float64 in Spanner and number in JS/TS.
  // `timestamp` maps to timestamp in Spanner and number in milliseconds in JS/TS.
  // `string` maps to string with MAX length in Spanner and string in JS/TS.
  // `bytes` is NOT supported because it's error-prone due to encoding/decoding.
  // `date` is NOT supported because it's error-prone due to timezone ambiguit.
  // `struct` and `json` types are NOT supported in favor of the message type below.
  // Supports the name of a message which must be defined first and can be imported, which maps to bytes in Spanner.
  // Supports the name of an enum which must be defined first and can be imported, which maps to float64 in Spanner.
  type: string;
  // Import relative to CWD. Do not include '.json'.
  import?: string;
  isArray?: true;
  nullable?: true;
  // Only applicable to `timestamp` type and must not be an array.
  allowCommitTimestamp?: true;
}

export interface SpannerIndexColumnDefinition {
  name: string;
  desc: boolean;
}

export interface SpannerIndexDefinition {
  // Must be of CamelCase.
  name: string;
  // Columns on the table that includes this definition.
  columns: Array<string | SpannerIndexColumnDefinition>;
  unique?: true;
  nullFiltered?: true;
}

export interface SpannerTablePrimaryKeyDefinition {
  name: string;
  desc: boolean;
}

export interface SpannerTableInterleaveDefinition {
  parentTable: string;
  cascadeOnDelete?: true;
}

export interface SpannerTableDefinition {
  // Must be of CamelCase.
  name: string;
  columns: Array<SpannerTableColumnDefinition>;
  primaryKeys: Array<string | SpannerTablePrimaryKeyDefinition>;
  interleave?: SpannerTableInterleaveDefinition;
  indexes?: Array<SpannerIndexDefinition>;
}

export interface SpannerMessageTableDefintion {
  // Must be of CamelCase. Serves as the name of the table as well as refers to a defined message.
  name: string;
  // Must of of camelCase.
  storedInColumn: string;
  // Refers to fields defined in the message.
  // `boolean` maps to bool in Spanner.
  // `number` maps to float64 in Spanner.
  // `string` maps to string with MAX length in Spanner.
  // Referneced enum maps to float64 in Spanner.
  columns: Array<string>;
  primaryKeys: Array<string | SpannerTablePrimaryKeyDefinition>;
  interleave?: SpannerTableInterleaveDefinition;
  indexes?: Array<SpannerIndexDefinition>;
  insertStatementName: string;
  updateStatementName: string;
}

export interface SpannerColumnRef {
  name: string;
  table: string;
}

export interface SpannerTableRef {
  name: string;
  as: string;
}

export interface SpannerJoinOnLeaf {
  leftColumn: SpannerColumnRef;
  op: ">" | "<" | ">=" | "<=" | "!=" | "=";
  // Must refer to the table to be joined.
  rightColumn: string;
}

export interface SpannerJoinOnConcat {
  op: "AND" | "OR";
  exps: Array<SpannerJoinOnConcat | SpannerJoinOnLeaf>;
}

export interface SpannerJoin {
  type: "INNER" | "CROSS" | "FULL" | "LEFT" | "RIGHT";
  table: string | SpannerTableRef;
  on?: SpannerJoinOnConcat | SpannerJoinOnLeaf;
}

export interface SpannerWhereLeaf {
  leftColumn: string | SpannerColumnRef;
  op: ">" | "<" | ">=" | "<=" | "!=" | "=" | "IS NULL" | "IS NOT NULL";
  // right value will be an input, except for NULL check.
}

export interface SpannerWhereConcat {
  op: "AND" | "OR";
  exps: Array<SpannerWhereConcat | SpannerWhereLeaf>;
}

export interface SpannerOrderByColumnRef {
  column: string | SpannerColumnRef;
  desc?: true;
}

export interface SpannerSelectDefinition {
  // Must be of CamelCase.
  name: string;
  table: string | SpannerTableRef;
  join?: Array<SpannerJoin>;
  where?: SpannerWhereConcat | SpannerWhereLeaf;
  orderBy?: Array<string | SpannerOrderByColumnRef>;
  withLimit?: boolean;
  getColumns: Array<string | SpannerColumnRef>;
}

export interface SpannerInsertDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  setColumns: Array<string>;
}

export interface SpannerUpdateDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  setColumns: Array<string>;
  where: SpannerWhereConcat | SpannerWhereLeaf;
}

export interface SpannerDeleteDefinition {
  // Must be of CamelCase.
  name: string;
  table: string;
  where: SpannerWhereConcat | SpannerWhereLeaf;
}

export interface SpannerDatabaseDefinition {
  // Must be of CamelCase.
  name: string;
  tables?: Array<SpannerTableDefinition>;
  messageTables?: Array<SpannerMessageTableDefintion>;
  selects?: Array<SpannerSelectDefinition>;
  inserts?: Array<SpannerInsertDefinition>;
  updates?: Array<SpannerUpdateDefinition>;
  deletes?: Array<SpannerDeleteDefinition>;
  // The path to output the generated DDL JSON file, relative to CWD. Do not
  // include '.json'.
  outputDdl: string;
  // The path to output the generated SQL functions, relative to CWD. Do not
  // include '.ts'.
  outputSql: string;
}

export interface Definition {
  // One of the below.
  // Generated code requires package `@selfage/message`.
  enum?: EnumDefinition;
  // Generated code requires package `@selfage/message`.
  message?: MessageDefinition;
  // Generated code requires package `@selfage/service_descriptor`.
  webService?: WebServiceDefinition;
  // Generated code requires package `@selfage/service_descriptor`.
  nodeService?: NodeServiceDefinition;
  // Generated code requires package `@google-cloud/spanner`, `@selfage/spanner_schema_update_cli` and `@selfage/message`.
  spannerDatabase?: SpannerDatabaseDefinition;
}
