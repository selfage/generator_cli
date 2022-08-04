import { SpannerSqlDefinition } from "./definition";
import { OutputContentBuilder } from "./output_content_builder";

let VARIABLE_TYPE_TO_TS_TYPE_MAP = new Map<string, string>([
  ["string", "string"],
  ["bool", "boolean"],
  ["int53", "number"],
  ["float", "number"],
  ["timestamp", "number"],
  ["bytes", "Buffer"],
]);

let VARIABLE_TYPE_TO_SPANNER_TYPE_MAP = new Map<string, string>([
  ["string", "string"],
  ["bool", "bool"],
  ["int53", "int64"],
  ["float", "float64"],
  ["timestamp", "timestamp"],
  ["bytes", "bytes"],
]);

export function generateSpannerSql(
  modulePath: string,
  spannerSqlName: string,
  spannerSqlDefinition: SpannerSqlDefinition,
  contentMap: Map<string, OutputContentBuilder>
) {
  let outputContentBuilder = OutputContentBuilder.get(contentMap, modulePath);
  if (spannerSqlDefinition.params) {
    outputContentBuilder.importFromPath(
      "@google-cloud/spanner/build/src/transaction",
      "Statement"
    );
    outputContentBuilder.push(`
export function build${spannerSqlName}Statement(`);
    for (let param of spannerSqlDefinition.params) {
      if (!VARIABLE_TYPE_TO_TS_TYPE_MAP.has(param.type)) {
        console.warn(
          `Type ${param.type} of ${param.name} in ${spannerSqlName} is not supported.`
        );
      }
      if (!param.isArray) {
        outputContentBuilder.push(`
  ${param.name}: ${VARIABLE_TYPE_TO_TS_TYPE_MAP.get(param.type)},`);
      } else {
        outputContentBuilder.push(`
  ${param.name}: Array<${VARIABLE_TYPE_TO_TS_TYPE_MAP.get(param.type)}>,`);
      }
    }
    outputContentBuilder.push(`
): Statement {
  return {
    sql: "${spannerSqlDefinition.sql}",
    params: {`);
    for (let param of spannerSqlDefinition.params) {
      if (param.type === 'timestamp') {
        if (!param.isArray) {
          outputContentBuilder.push(`
      ${param.name}: new Date(${param.name}).toISOString(),`);
        } else {
          outputContentBuilder.push(`
      ${param.name}: ${param.name}.map((ele) => new Date(ele).toISOString()),`);
        }
      } else {
      outputContentBuilder.push(`
      ${param.name},`);
      }
    }
    outputContentBuilder.push(`
    },
    types: {`);
    for (let param of spannerSqlDefinition.params) {
      if (!param.isArray) {
        outputContentBuilder.push(`
      ${param.name}: {
        type: "${VARIABLE_TYPE_TO_SPANNER_TYPE_MAP.get(param.type)}"
      },`);
      } else {
        outputContentBuilder.push(`
      ${param.name}: {
        type: "array",
        child: {
          type: "${VARIABLE_TYPE_TO_SPANNER_TYPE_MAP.get(param.type)}"
        }
      }`);
      }
    }
    outputContentBuilder.push(`
    }
  }
}
`);
  }

  if (spannerSqlDefinition.outputColumns) {
    outputContentBuilder.push(`
export interface ${spannerSqlName}Row {`);
    for (let column of spannerSqlDefinition.outputColumns) {
      if (!VARIABLE_TYPE_TO_TS_TYPE_MAP.has(column.type)) {
        console.warn(
          `Type ${column.type} of ${column.name} in ${spannerSqlName} is not supported.`
        );
      }
      if (!column.isArray) {
        outputContentBuilder.push(`
  ${column.name}: ${VARIABLE_TYPE_TO_TS_TYPE_MAP.get(column.type)};`);
      } else {
        outputContentBuilder.push(`
  ${column.name}: Array<${VARIABLE_TYPE_TO_TS_TYPE_MAP.get(column.type)}>;`);
      }
    }
    outputContentBuilder.push(`
}

export function parse${spannerSqlName}Row(row: any): ${spannerSqlName}Row {
  // No need to wrap number until we want to support int64 as bigint.
  let obj = row.toJSON();`);
    for (let column of spannerSqlDefinition.outputColumns) {
      if (column.type === "timestamp") {
        if (!column.isArray) {
          outputContentBuilder.push(`
  obj.${column.name} = Date.parse(obj.${column.name});`);
        } else {
          outputContentBuilder.push(`
  obj.${column.name} = obj.${column.name}.map((ele) => Date.parse(ele));`);
        }
      }
    }
    outputContentBuilder.push(`
  return obj;
}
`);
  }
}
