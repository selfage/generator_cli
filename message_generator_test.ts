import { Definition } from "./definition";
import { generateMessageDescriptor } from "./message_generator";
import { MockTypeLoader } from "./mocks";
import { OutputContentBuilder } from "./output_content_builder";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "MessageGeneratorTest",
  cases: [
    {
      name: "SelfContainedData",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateMessageDescriptor(
          "some_file",
          "BasicData",
          {
            fields: [
              {
                name: "numberField",
                type: "number",
              },
              {
                name: "stringField",
                type: "string",
              },
              {
                name: "booleanField",
                type: "boolean",
              },
              {
                name: "numberArrayField",
                type: "number",
                isArray: true,
              },
              {
                name: "stringArrayField",
                type: "string",
                isArray: true,
              },
              {
                name: "booleanArrayField",
                type: "boolean",
                isArray: true,
              },
            ],
          },
          undefined,
          contentMap
        );

        // Verify
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

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
  fields: [
    {
      name: 'numberField',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'stringField',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'booleanField',
      primitiveType: PrimitiveType.BOOLEAN,
    },
    {
      name: 'numberArrayField',
      primitiveType: PrimitiveType.NUMBER,
      isArray: true,
    },
    {
      name: 'stringArrayField',
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
    {
      name: 'booleanArrayField',
      primitiveType: PrimitiveType.BOOLEAN,
      isArray: true,
    },
  ]
};
`),
          `outputContent`
        );
      },
    },
    {
      name: "GenerateWithComment",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateMessageDescriptor(
          "some_file",
          "BasicData",
          {
            fields: [
              {
                name: "numberField",
                type: "number",
                comment: "Comment1",
              },
            ],
            comment: "Comment2\nComment3",
          },
          undefined,
          contentMap
        );

        // Verify
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

/* Comment2
Comment3 */
export interface BasicData {
/* Comment1 */
  numberField?: number,
}

export let BASIC_DATA: MessageDescriptor<BasicData> = {
  name: 'BasicData',
  fields: [
    {
      name: 'numberField',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
`),
          `outputContent`
        );
      },
    },
    {
      name: "NestedObjects",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();
        let mockTypeLoader = new (class extends MockTypeLoader {
          public getDefinition(
            typeName: string,
            importPath?: string
          ): Definition {
            switch (this.called.increment("getDefinition")) {
              case 1:
                assertThat(typeName, eq("BasicData"), `1st typeName`);
                assertThat(importPath, eq(undefined), `1st importPath`);
                return { name: "any", message: { fields: [] } };
              case 2:
                assertThat(typeName, eq("BasicData2"), `2nd typeName`);
                assertThat(importPath, eq("./another_file"), `2nd importPath`);
                return { name: "any", message: { fields: [] } };
              case 3:
                assertThat(typeName, eq("TestEnum"), `3rd typeName`);
                assertThat(importPath, eq(undefined), `3rd importPath`);
                return { name: "any", enum: { values: [] } };
              case 4:
                assertThat(typeName, eq("BasicData"), `4th typeName`);
                assertThat(importPath, eq(undefined), `4th importPath`);
                return { name: "any", message: { fields: [] } };
              case 5:
                assertThat(typeName, eq("TestEnum"), `5th typeName`);
                assertThat(importPath, eq(undefined), `5th importPath`);
                return { name: "any", enum: { values: [] } };
              default:
                throw new Error("Unpexpected");
            }
          }
        })();

        // Execute
        generateMessageDescriptor(
          "some_file",
          "NestedObj",
          {
            fields: [
              {
                name: "basicData",
                type: "BasicData",
              },
              {
                name: "basicData2",
                type: "BasicData2",
                import: "./another_file",
              },
              {
                name: "testEnum",
                type: "TestEnum",
              },
              {
                name: "basicDataArray",
                type: "BasicData",
                isArray: true,
              },
              {
                name: "enumArray",
                type: "TestEnum",
                isArray: true,
              },
            ],
          },
          mockTypeLoader,
          contentMap
        );

        // Verify
        assertThat(
          mockTypeLoader.called.get("getDefinition"),
          eq(5),
          "getDefinition called"
        );
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { MessageDescriptor } from '@selfage/message/descriptor';
import { BasicData2, BASIC_DATA2 } from './another_file';

export interface NestedObj {
  basicData?: BasicData,
  basicData2?: BasicData2,
  testEnum?: TestEnum,
  basicDataArray?: Array<BasicData>,
  enumArray?: Array<TestEnum>,
}

export let NESTED_OBJ: MessageDescriptor<NestedObj> = {
  name: 'NestedObj',
  fields: [
    {
      name: 'basicData',
      messageType: BASIC_DATA,
    },
    {
      name: 'basicData2',
      messageType: BASIC_DATA2,
    },
    {
      name: 'testEnum',
      enumType: TEST_ENUM,
    },
    {
      name: 'basicDataArray',
      messageType: BASIC_DATA,
      isArray: true,
    },
    {
      name: 'enumArray',
      enumType: TEST_ENUM,
      isArray: true,
    },
  ]
};
`),
          `outputContent`
        );
      },
    },
  ],
});
