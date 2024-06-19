import { Definition } from "./definition";
import { MockDefinitionFinder } from "./mocks";
import { generateObservableDescriptor } from "./observable_generator";
import { OutputContentBuilder } from "./output_content_builder";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ObservableGeneratorTest",
  cases: [
    {
      name: "SelfContainedData",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateObservableDescriptor(
          "some_file",
          "BasicData",
          {
            fields: [
              {
                name: "numberField",
                type: "number",
              },
              {
                name: "booleanField",
                type: "boolean",
              },
              {
                name: "stringField",
                type: "string",
              },
              {
                name: "numberArrayField",
                type: "number",
                asArray: "normal",
              },
              {
                name: "booleanArrayField",
                type: "boolean",
                asArray: "normal",
              },
              {
                name: "stringArrayField",
                type: "string",
                asArray: "normal",
              },
              {
                name: "numberObservableArrayField",
                type: "number",
                asArray: "observable",
              },
              {
                name: "booleanObservableArrayField",
                type: "boolean",
                asArray: "observable",
              },
              {
                name: "stringObservableArrayField",
                type: "string",
                asArray: "observable",
              },
            ],
          },
          undefined,
          contentMap,
        );

        // Verify
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { ObservableArray } from '@selfage/observable_array';
import { EventEmitter } from 'events';
import { ObservableDescriptor, ArrayType } from '@selfage/observable/descriptor';
import { PrimitiveType } from '@selfage/message/descriptor';

export interface BasicData {
  on(event: 'numberField', listener: (newValue: number, oldValue: number) => void): this;
  on(event: 'booleanField', listener: (newValue: boolean, oldValue: boolean) => void): this;
  on(event: 'stringField', listener: (newValue: string, oldValue: string) => void): this;
  on(event: 'numberArrayField', listener: (newValue: Array<number>, oldValue: Array<number>) => void): this;
  on(event: 'booleanArrayField', listener: (newValue: Array<boolean>, oldValue: Array<boolean>) => void): this;
  on(event: 'stringArrayField', listener: (newValue: Array<string>, oldValue: Array<string>) => void): this;
  on(event: 'numberObservableArrayField', listener: (newValue: ObservableArray<number>, oldValue: ObservableArray<number>) => void): this;
  on(event: 'booleanObservableArrayField', listener: (newValue: ObservableArray<boolean>, oldValue: ObservableArray<boolean>) => void): this;
  on(event: 'stringObservableArrayField', listener: (newValue: ObservableArray<string>, oldValue: ObservableArray<string>) => void): this;
  on(event: 'init', listener: () => void): this;
}

export class BasicData extends EventEmitter {
  private numberField_?: number;
  get numberField(): number {
    return this.numberField_;
  }
  set numberField(value: number) {
    let oldValue = this.numberField_;
    if (value === oldValue) {
      return;
    }
    this.numberField_ = value;
    this.emit('numberField', this.numberField_, oldValue);
  }

  private booleanField_?: boolean;
  get booleanField(): boolean {
    return this.booleanField_;
  }
  set booleanField(value: boolean) {
    let oldValue = this.booleanField_;
    if (value === oldValue) {
      return;
    }
    this.booleanField_ = value;
    this.emit('booleanField', this.booleanField_, oldValue);
  }

  private stringField_?: string;
  get stringField(): string {
    return this.stringField_;
  }
  set stringField(value: string) {
    let oldValue = this.stringField_;
    if (value === oldValue) {
      return;
    }
    this.stringField_ = value;
    this.emit('stringField', this.stringField_, oldValue);
  }

  private numberArrayField_?: Array<number>;
  get numberArrayField(): Array<number> {
    return this.numberArrayField_;
  }
  set numberArrayField(value: Array<number>) {
    let oldValue = this.numberArrayField_;
    if (value === oldValue) {
      return;
    }
    this.numberArrayField_ = value;
    this.emit('numberArrayField', this.numberArrayField_, oldValue);
  }

  private booleanArrayField_?: Array<boolean>;
  get booleanArrayField(): Array<boolean> {
    return this.booleanArrayField_;
  }
  set booleanArrayField(value: Array<boolean>) {
    let oldValue = this.booleanArrayField_;
    if (value === oldValue) {
      return;
    }
    this.booleanArrayField_ = value;
    this.emit('booleanArrayField', this.booleanArrayField_, oldValue);
  }

  private stringArrayField_?: Array<string>;
  get stringArrayField(): Array<string> {
    return this.stringArrayField_;
  }
  set stringArrayField(value: Array<string>) {
    let oldValue = this.stringArrayField_;
    if (value === oldValue) {
      return;
    }
    this.stringArrayField_ = value;
    this.emit('stringArrayField', this.stringArrayField_, oldValue);
  }

  private numberObservableArrayField_?: ObservableArray<number>;
  get numberObservableArrayField(): ObservableArray<number> {
    return this.numberObservableArrayField_;
  }
  set numberObservableArrayField(value: ObservableArray<number>) {
    let oldValue = this.numberObservableArrayField_;
    if (value === oldValue) {
      return;
    }
    this.numberObservableArrayField_ = value;
    this.emit('numberObservableArrayField', this.numberObservableArrayField_, oldValue);
  }

  private booleanObservableArrayField_?: ObservableArray<boolean>;
  get booleanObservableArrayField(): ObservableArray<boolean> {
    return this.booleanObservableArrayField_;
  }
  set booleanObservableArrayField(value: ObservableArray<boolean>) {
    let oldValue = this.booleanObservableArrayField_;
    if (value === oldValue) {
      return;
    }
    this.booleanObservableArrayField_ = value;
    this.emit('booleanObservableArrayField', this.booleanObservableArrayField_, oldValue);
  }

  private stringObservableArrayField_?: ObservableArray<string>;
  get stringObservableArrayField(): ObservableArray<string> {
    return this.stringObservableArrayField_;
  }
  set stringObservableArrayField(value: ObservableArray<string>) {
    let oldValue = this.stringObservableArrayField_;
    if (value === oldValue) {
      return;
    }
    this.stringObservableArrayField_ = value;
    this.emit('stringObservableArrayField', this.stringObservableArrayField_, oldValue);
  }

  public triggerInitialEvents(): void {
    if (this.numberField_ !== undefined) {
      this.emit('numberField', this.numberField_, undefined);
    }
    if (this.booleanField_ !== undefined) {
      this.emit('booleanField', this.booleanField_, undefined);
    }
    if (this.stringField_ !== undefined) {
      this.emit('stringField', this.stringField_, undefined);
    }
    if (this.numberArrayField_ !== undefined) {
      this.emit('numberArrayField', this.numberArrayField_, undefined);
    }
    if (this.booleanArrayField_ !== undefined) {
      this.emit('booleanArrayField', this.booleanArrayField_, undefined);
    }
    if (this.stringArrayField_ !== undefined) {
      this.emit('stringArrayField', this.stringArrayField_, undefined);
    }
    if (this.numberObservableArrayField_ !== undefined) {
      this.emit('numberObservableArrayField', this.numberObservableArrayField_, undefined);
    }
    if (this.booleanObservableArrayField_ !== undefined) {
      this.emit('booleanObservableArrayField', this.booleanObservableArrayField_, undefined);
    }
    if (this.stringObservableArrayField_ !== undefined) {
      this.emit('stringObservableArrayField', this.stringObservableArrayField_, undefined);
    }
    this.emit('init');
  }

  public toJSON(): Object {
    return {
      numberField: this.numberField,
      booleanField: this.booleanField,
      stringField: this.stringField,
      numberArrayField: this.numberArrayField,
      booleanArrayField: this.booleanArrayField,
      stringArrayField: this.stringArrayField,
      numberObservableArrayField: this.numberObservableArrayField,
      booleanObservableArrayField: this.booleanObservableArrayField,
      stringObservableArrayField: this.stringObservableArrayField,
    };
  }
}

export let BASIC_DATA: ObservableDescriptor<BasicData> = {
  name: 'BasicData',
  constructor: BasicData,
  fields: [
    {
      name: 'numberField',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'booleanField',
      primitiveType: PrimitiveType.BOOLEAN,
    },
    {
      name: 'stringField',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'numberArrayField',
      primitiveType: PrimitiveType.NUMBER,
      asArray: ArrayType.NORMAL,
    },
    {
      name: 'booleanArrayField',
      primitiveType: PrimitiveType.BOOLEAN,
      asArray: ArrayType.NORMAL,
    },
    {
      name: 'stringArrayField',
      primitiveType: PrimitiveType.STRING,
      asArray: ArrayType.NORMAL,
    },
    {
      name: 'numberObservableArrayField',
      primitiveType: PrimitiveType.NUMBER,
      asArray: ArrayType.OBSERVABLE,
    },
    {
      name: 'booleanObservableArrayField',
      primitiveType: PrimitiveType.BOOLEAN,
      asArray: ArrayType.OBSERVABLE,
    },
    {
      name: 'stringObservableArrayField',
      primitiveType: PrimitiveType.STRING,
      asArray: ArrayType.OBSERVABLE,
    },
  ]
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
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateObservableDescriptor(
          "some_file",
          "WithComment",
          {
            fields: [
              {
                name: "numberField",
                type: "number",
                comment: "Comment1",
              },
            ],
            comment: "Comment2",
          },
          undefined,
          contentMap,
        );

        // Verify
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { EventEmitter } from 'events';
import { ObservableDescriptor } from '@selfage/observable/descriptor';
import { PrimitiveType } from '@selfage/message/descriptor';

export interface WithComment {
  on(event: 'numberField', listener: (newValue: number, oldValue: number) => void): this;
  on(event: 'init', listener: () => void): this;
}

/* Comment2 */
export class WithComment extends EventEmitter {
/* Comment1 */
  private numberField_?: number;
  get numberField(): number {
    return this.numberField_;
  }
  set numberField(value: number) {
    let oldValue = this.numberField_;
    if (value === oldValue) {
      return;
    }
    this.numberField_ = value;
    this.emit('numberField', this.numberField_, oldValue);
  }

  public triggerInitialEvents(): void {
    if (this.numberField_ !== undefined) {
      this.emit('numberField', this.numberField_, undefined);
    }
    this.emit('init');
  }

  public toJSON(): Object {
    return {
      numberField: this.numberField,
    };
  }
}

export let WITH_COMMENT: ObservableDescriptor<WithComment> = {
  name: 'WithComment',
  constructor: WithComment,
  fields: [
    {
      name: 'numberField',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
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
        let contentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionFinder = new (class extends MockDefinitionFinder {
          public getDefinition(
            typeName: string,
            importPath?: string,
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
                assertThat(typeName, eq("ObservableData"), `3rd typeName`);
                assertThat(importPath, eq(undefined), `3rd importPath`);
                return { name: "any", observable: { fields: [] } };
              case 4:
                assertThat(typeName, eq("TestEnum"), `4th typeName`);
                assertThat(importPath, eq(undefined), `4th importPath`);
                return { name: "any", enum: { values: [] } };
              case 5:
                assertThat(typeName, eq("BasicData"), `5th typeName`);
                assertThat(importPath, eq(undefined), `5th importPath`);
                return { name: "any", message: { fields: [] } };
              case 6:
                assertThat(typeName, eq("TestEnum"), `6th typeName`);
                assertThat(importPath, eq(undefined), `6th importPath`);
                return { name: "any", enum: { values: [] } };
              default:
                throw new Error(`Unexpected.`);
            }
          }
        })();

        // Execute
        generateObservableDescriptor(
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
                name: "observableData",
                type: "ObservableData",
              },
              {
                name: "testEnum",
                type: "TestEnum",
              },
              {
                name: "basicDataArray",
                type: "BasicData",
                asArray: "normal",
              },
              {
                name: "enumArray",
                type: "TestEnum",
                asArray: "observable",
              },
            ],
          },
          mockDefinitionFinder,
          contentMap,
        );

        // Verify
        assertThat(
          mockDefinitionFinder.called.get("getDefinition"),
          eq(6),
          "getDefinition called",
        );
        assertThat(
          contentMap.get("some_file").toString(),
          eq(`import { ObservableArray } from '@selfage/observable_array';
import { EventEmitter } from 'events';
import { ObservableDescriptor, ArrayType } from '@selfage/observable/descriptor';
import { BasicData2, BASIC_DATA2 } from './another_file';

export interface NestedObj {
  on(event: 'basicData', listener: (newValue: BasicData, oldValue: BasicData) => void): this;
  on(event: 'basicData2', listener: (newValue: BasicData2, oldValue: BasicData2) => void): this;
  on(event: 'observableData', listener: (newValue: ObservableData, oldValue: ObservableData) => void): this;
  on(event: 'testEnum', listener: (newValue: TestEnum, oldValue: TestEnum) => void): this;
  on(event: 'basicDataArray', listener: (newValue: Array<BasicData>, oldValue: Array<BasicData>) => void): this;
  on(event: 'enumArray', listener: (newValue: ObservableArray<TestEnum>, oldValue: ObservableArray<TestEnum>) => void): this;
  on(event: 'init', listener: () => void): this;
}

export class NestedObj extends EventEmitter {
  private basicData_?: BasicData;
  get basicData(): BasicData {
    return this.basicData_;
  }
  set basicData(value: BasicData) {
    let oldValue = this.basicData_;
    if (value === oldValue) {
      return;
    }
    this.basicData_ = value;
    this.emit('basicData', this.basicData_, oldValue);
  }

  private basicData2_?: BasicData2;
  get basicData2(): BasicData2 {
    return this.basicData2_;
  }
  set basicData2(value: BasicData2) {
    let oldValue = this.basicData2_;
    if (value === oldValue) {
      return;
    }
    this.basicData2_ = value;
    this.emit('basicData2', this.basicData2_, oldValue);
  }

  private observableData_?: ObservableData;
  get observableData(): ObservableData {
    return this.observableData_;
  }
  set observableData(value: ObservableData) {
    let oldValue = this.observableData_;
    if (value === oldValue) {
      return;
    }
    this.observableData_ = value;
    this.emit('observableData', this.observableData_, oldValue);
  }

  private testEnum_?: TestEnum;
  get testEnum(): TestEnum {
    return this.testEnum_;
  }
  set testEnum(value: TestEnum) {
    let oldValue = this.testEnum_;
    if (value === oldValue) {
      return;
    }
    this.testEnum_ = value;
    this.emit('testEnum', this.testEnum_, oldValue);
  }

  private basicDataArray_?: Array<BasicData>;
  get basicDataArray(): Array<BasicData> {
    return this.basicDataArray_;
  }
  set basicDataArray(value: Array<BasicData>) {
    let oldValue = this.basicDataArray_;
    if (value === oldValue) {
      return;
    }
    this.basicDataArray_ = value;
    this.emit('basicDataArray', this.basicDataArray_, oldValue);
  }

  private enumArray_?: ObservableArray<TestEnum>;
  get enumArray(): ObservableArray<TestEnum> {
    return this.enumArray_;
  }
  set enumArray(value: ObservableArray<TestEnum>) {
    let oldValue = this.enumArray_;
    if (value === oldValue) {
      return;
    }
    this.enumArray_ = value;
    this.emit('enumArray', this.enumArray_, oldValue);
  }

  public triggerInitialEvents(): void {
    if (this.basicData_ !== undefined) {
      this.emit('basicData', this.basicData_, undefined);
    }
    if (this.basicData2_ !== undefined) {
      this.emit('basicData2', this.basicData2_, undefined);
    }
    if (this.observableData_ !== undefined) {
      this.emit('observableData', this.observableData_, undefined);
    }
    if (this.testEnum_ !== undefined) {
      this.emit('testEnum', this.testEnum_, undefined);
    }
    if (this.basicDataArray_ !== undefined) {
      this.emit('basicDataArray', this.basicDataArray_, undefined);
    }
    if (this.enumArray_ !== undefined) {
      this.emit('enumArray', this.enumArray_, undefined);
    }
    this.emit('init');
  }

  public toJSON(): Object {
    return {
      basicData: this.basicData,
      basicData2: this.basicData2,
      observableData: this.observableData,
      testEnum: this.testEnum,
      basicDataArray: this.basicDataArray,
      enumArray: this.enumArray,
    };
  }
}

export let NESTED_OBJ: ObservableDescriptor<NestedObj> = {
  name: 'NestedObj',
  constructor: NestedObj,
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
      name: 'observableData',
      observableType: OBSERVABLE_DATA,
    },
    {
      name: 'testEnum',
      enumType: TEST_ENUM,
    },
    {
      name: 'basicDataArray',
      messageType: BASIC_DATA,
      asArray: ArrayType.NORMAL,
    },
    {
      name: 'enumArray',
      enumType: TEST_ENUM,
      asArray: ArrayType.OBSERVABLE,
    },
  ]
};
`),
          `outputContent`,
        );
      },
    },
  ],
});
