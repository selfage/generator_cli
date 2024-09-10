import { Definition } from "./definition";
import { generateMessage } from "./message_generator";
import { MockMessageResolver } from "./message_resolver_mock";
import { OutputContentBuilder } from "./output_content_builder";
import { assertThat, eq, eqLongStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "MessageGeneratorTest",
  cases: [
    {
      name: "SelfContainedData",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateMessage(
          "some_file",
          {
            name: "BasicData",
            fields: [
              {
                name: "numberField",
                type: "number",
                index: 1,
              },
              {
                name: "stringField",
                type: "string",
                index: 2,
              },
              {
                name: "deprecatedStringField",
                type: "string",
                index: 3,
                deprecated: true,
              },
              {
                name: "booleanField",
                type: "boolean",
                index: 4,
              },
              {
                name: "numberArrayField",
                type: "number",
                isArray: true,
                index: 5,
              },
              {
                name: "stringArrayField",
                type: "string",
                isArray: true,
                index: 6,
              },
              {
                name: "booleanArrayField",
                type: "boolean",
                isArray: true,
                index: 7,
              },
            ],
          },
          undefined,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./some_file").build(),
          eqLongStr(`import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface BasicData {
  numberField?: number,
  stringField?: string,
  booleanField?: boolean,
  numberArrayField?: Array<number>,
  stringArrayField?: Array<string>,
  booleanArrayField?: Array<boolean>,
}

export let BASIC_DATA: MessageDescriptor<BasicData> = {
  name: 'BasicData',
  fields: [{
    name: 'numberField',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'stringField',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'deprecatedStringField',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'booleanField',
    index: 4,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'numberArrayField',
    index: 5,
    primitiveType: PrimitiveType.NUMBER,
    isArray: true,
  }, {
    name: 'stringArrayField',
    index: 6,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'booleanArrayField',
    index: 7,
    primitiveType: PrimitiveType.BOOLEAN,
    isArray: true,
  }],
};
`),
          `outputContent`,
        );
      },
    },
    {
      name: "GenerateWithComment",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateMessage(
          "some_file",
          {
            name: "BasicData",
            fields: [
              {
                name: "numberField",
                type: "number",
                index: 1,
                comment: "Comment1",
              },
            ],
            comment: "Comment2\nComment3",
          },
          undefined,
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./some_file").build(),
          eqLongStr(`import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

/* Comment2
Comment3 */
export interface BasicData {
  /* Comment1 */
  numberField?: number,
}

export let BASIC_DATA: MessageDescriptor<BasicData> = {
  name: 'BasicData',
  fields: [{
    name: 'numberField',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
`),
          `outputContent`,
        );
      },
    },
    {
      name: "NestedObjects",
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
            switch (this.called) {
              case 1:
                assertThat(typeName, eq("BasicData"), `1st typeName`);
                assertThat(importPath, eq(undefined), `1st importPath`);
                return { message: { name: "any", fields: [] } };
              case 2:
                assertThat(typeName, eq("BasicData2"), `2nd typeName`);
                assertThat(importPath, eq("./another_file"), `2nd importPath`);
                return { message: { name: "any", fields: [] } };
              case 3:
                assertThat(typeName, eq("TestEnum"), `3rd typeName`);
                assertThat(importPath, eq(undefined), `3rd importPath`);
                return { enum: { name: "any", values: [] } };
              case 4:
                assertThat(typeName, eq("BasicData"), `4th typeName`);
                assertThat(importPath, eq(undefined), `4th importPath`);
                return { message: { name: "any", fields: [] } };
              case 5:
                assertThat(typeName, eq("TestEnum"), `5th typeName`);
                assertThat(importPath, eq(undefined), `5th importPath`);
                return { enum: { name: "any", values: [] } };
              default:
                throw new Error("Unpexpected");
            }
          }
        })();

        // Execute
        generateMessage(
          "./some_file",
          {
            name: "NestedObj",
            fields: [
              {
                name: "basicData",
                type: "BasicData",
                index: 1,
              },
              {
                name: "basicData2",
                type: "BasicData2",
                import: "./another_file",
                index: 2,
              },
              {
                name: "testEnum",
                type: "TestEnum",
                index: 3,
              },
              {
                name: "basicDataArray",
                type: "BasicData",
                isArray: true,
                index: 4,
              },
              {
                name: "enumArray",
                type: "TestEnum",
                isArray: true,
                index: 5,
              },
            ],
          },
          mockMessageResolver,
          outputContentMap,
        );

        // Verify
        assertThat(mockMessageResolver.called, eq(5), "resolve called");
        assertThat(
          outputContentMap.get("./some_file").build(),
          eqLongStr(`import { BasicData2, BASIC_DATA2 } from './another_file';
import { MessageDescriptor } from '@selfage/message/descriptor';

export interface NestedObj {
  basicData?: BasicData,
  basicData2?: BasicData2,
  testEnum?: TestEnum,
  basicDataArray?: Array<BasicData>,
  enumArray?: Array<TestEnum>,
}

export let NESTED_OBJ: MessageDescriptor<NestedObj> = {
  name: 'NestedObj',
  fields: [{
    name: 'basicData',
    index: 1,
    messageType: BASIC_DATA,
  }, {
    name: 'basicData2',
    index: 2,
    messageType: BASIC_DATA2,
  }, {
    name: 'testEnum',
    index: 3,
    enumType: TEST_ENUM,
  }, {
    name: 'basicDataArray',
    index: 4,
    messageType: BASIC_DATA,
    isArray: true,
  }, {
    name: 'enumArray',
    index: 5,
    enumType: TEST_ENUM,
    isArray: true,
  }],
};
`),
          `outputContent`,
        );
      },
    },
  ],
});
