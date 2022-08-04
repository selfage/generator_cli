import { OutputContentBuilder } from "./output_content_builder";
import { generateSpannerSql } from "./spanner_sql_generator";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "SpannerSqlGeneratorTest",
  cases: [
    {
      name: "GenerateSqlWithTypesAndArray",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateSpannerSql(
          "./some_file",
          "QueryStuff",
          {
            sql: "some sql",
            params: [
              {
                name: "intValue",
                type: "int53",
              },
              {
                name: "floatValue",
                type: "float",
              },
              {
                name: "timestampValue",
                type: "timestamp",
              },
              {
                name: "timestampValueArray",
                type: "timestamp",
                isArray: true,
              },
              {
                name: "stringValue",
                type: "string",
                isArray: true,
              },
            ],
            outputColumns: [
              {
                name: "outputIntValue",
                type: "int53",
              },
              {
                name: "outputBoolValue",
                type: "float",
              },
              {
                name: "outputTimestampValue",
                type: "timestamp",
              },
              {
                name: "outputTimestampValueArray",
                type: "timestamp",
                isArray: true,
              },
              {
                name: "outputStringValue",
                type: "string",
                isArray: true,
              },
            ],
          },
          contentMap
        );

        // Verify
        assertThat(
          contentMap.get("./some_file").toString(),
          eq(`import { Statement } from '@google-cloud/spanner/build/src/transaction';

export function buildQueryStuffStatement(
  intValue: number,
  floatValue: number,
  timestampValue: number,
  timestampValueArray: Array<number>,
  stringValue: Array<string>,
): Statement {
  return {
    sql: "some sql",
    params: {
      intValue,
      floatValue,
      timestampValue: new Date(timestampValue).toISOString(),
      timestampValueArray: timestampValueArray.map((ele) => new Date(ele).toISOString()),
      stringValue,
    },
    types: {
      intValue: {
        type: "int64"
      },
      floatValue: {
        type: "float64"
      },
      timestampValue: {
        type: "timestamp"
      },
      timestampValueArray: {
        type: "array",
        child: {
          type: "timestamp"
        }
      }
      stringValue: {
        type: "array",
        child: {
          type: "string"
        }
      }
    }
  }
}

export interface QueryStuffRow {
  outputIntValue: number;
  outputBoolValue: number;
  outputTimestampValue: number;
  outputTimestampValueArray: Array<number>;
  outputStringValue: Array<string>;
}

export function parseQueryStuffRow(row: any): QueryStuffRow {
  // No need to wrap number until we want to support int64 as bigint.
  let obj = row.toJSON();
  obj.outputTimestampValue = Date.parse(obj.outputTimestampValue);
  obj.outputTimestampValueArray = obj.outputTimestampValueArray.map((ele) => Date.parse(ele));
  return obj;
}
`),
          "outputContent"
        );
      },
    },
  ],
});
