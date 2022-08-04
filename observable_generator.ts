import { ObservableDefinition, ObservableFieldDefinition } from "./definition";
import { OutputContentBuilder } from "./output_content_builder";
import { TypeLoader } from "./type_loader";
import { generateComment, toUpperSnaked } from "./util";

let PRIMITIVE_TYPES = new Set<string>(["string", "number", "boolean"]);

function coalesceFieldType(
  field: ObservableFieldDefinition,
  outputContentBuilder: OutputContentBuilder
): string {
  if (field.asArray) {
    if (field.asArray === "normal") {
      return `Array<${field.type}>`;
    } else if (field.asArray === "observable") {
      outputContentBuilder.importFromObservableArray("ObservableArray");
      return `ObservableArray<${field.type}>`;
    } else {
      throw new Error(
        `Field ${field.name}'s "asArray" has an invalid value. It must be either "normal" or "observable".`
      );
    }
  } else {
    return field.type;
  }
}

export function generateObservableDescriptor(
  modulePath: string,
  messageName: string,
  messageDefinition: ObservableDefinition,
  typeLoader: TypeLoader,
  contentMap: Map<string, OutputContentBuilder>
): void {
  let outputContentBuilder = OutputContentBuilder.get(contentMap, modulePath);
  outputContentBuilder.push(`
export interface ${messageName} {`);
  for (let field of messageDefinition.fields) {
    let fieldTypeName = coalesceFieldType(field, outputContentBuilder);
    outputContentBuilder.push(`
  on(event: '${field.name}', listener: (newValue: ${fieldTypeName}, oldValue: ${fieldTypeName}) => void): this;`);
  }
  outputContentBuilder.push(`
  on(event: 'init', listener: () => void): this;
}
`);

  outputContentBuilder.importFromPath("events", "EventEmitter");
  outputContentBuilder.push(`${generateComment(messageDefinition.comment)}
export class ${messageName} extends EventEmitter {`);
  for (let field of messageDefinition.fields) {
    let fieldTypeName = coalesceFieldType(field, outputContentBuilder);
    outputContentBuilder.push(`${generateComment(field.comment)}
  private ${field.name}_?: ${fieldTypeName};
  get ${field.name}(): ${fieldTypeName} {
    return this.${field.name}_;
  }
  set ${field.name}(value: ${fieldTypeName}) {
    let oldValue = this.${field.name}_;
    if (value === oldValue) {
      return;
    }
    this.${field.name}_ = value;
    this.emit('${field.name}', this.${field.name}_, oldValue);
  }
`);
  }
  outputContentBuilder.push(`
  public triggerInitialEvents(): void {`);
  for (let field of messageDefinition.fields) {
    outputContentBuilder.push(`
    if (this.${field.name}_ !== undefined) {
      this.emit('${field.name}', this.${field.name}_, undefined);
    }`);
  }
  outputContentBuilder.push(`
    this.emit('init');
  }
`);
  outputContentBuilder.push(`
  public toJSON(): Object {
    return {`);
  for (let field of messageDefinition.fields) {
    outputContentBuilder.push(`
      ${field.name}: this.${field.name},`);
  }
  outputContentBuilder.push(`
    };
  }
}
`);

  outputContentBuilder.importFromObservableDescriptor("ObservableDescriptor");
  let descriptorName = toUpperSnaked(messageName);
  outputContentBuilder.push(`
export let ${descriptorName}: ObservableDescriptor<${messageName}> = {
  name: '${messageName}',
  constructor: ${messageName},
  fields: [`);
  for (let field of messageDefinition.fields) {
    outputContentBuilder.push(`
    {
      name: '${field.name}',`);
    if (PRIMITIVE_TYPES.has(field.type)) {
      outputContentBuilder.importFromMessageDescriptor("PrimitiveType");
      outputContentBuilder.push(`
      primitiveType: PrimitiveType.${field.type.toUpperCase()},`);
    } else {
      let typeDefinition = typeLoader.getDefinition(field.type, field.import);
      if (!typeDefinition) {
        throw new Error(`Type ${field.type} is not found in ${field.import}.`);
      }

      if (typeDefinition.enum) {
        let enumDescriptorName = toUpperSnaked(field.type);
        outputContentBuilder.importFromPath(
          field.import,
          field.type,
          enumDescriptorName
        );
        outputContentBuilder.push(`
      enumType: ${enumDescriptorName},`);
      } else if (typeDefinition.message) {
        let messageDescriptorName = toUpperSnaked(field.type);
        outputContentBuilder.importFromPath(
          field.import,
          field.type,
          messageDescriptorName
        );
        outputContentBuilder.push(`
      messageType: ${messageDescriptorName},`);
      } else if (typeDefinition.observable) {
        let observableDescriptorName = toUpperSnaked(field.type);
        outputContentBuilder.importFromPath(
          field.import,
          field.type,
          observableDescriptorName
        );
        outputContentBuilder.push(`
      observableType: ${observableDescriptorName},`);
      } else {
        throw new Error(
          `Type ${field.type} is not found to be a primitve type, enum or message when imported from ${field.import}.`
        );
      }
    }
    if (field.asArray) {
      outputContentBuilder.importFromObservableDescriptor("ArrayType");
      outputContentBuilder.push(`
      asArray: ArrayType.${field.asArray.toUpperCase()},`);
    }
    outputContentBuilder.push(`
    },`);
  }
  outputContentBuilder.push(`
  ]
};
`);
}
