import { MessageDefinition } from "./definition";
import { DefinitionResolver } from "./definition_resolver";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toUppercaseSnaked } from "./util";

let PRIMITIVE_TYPES = new Set<string>(["string", "number", "boolean"]);

export function generateMessage(
  definitionModulePath: string,
  messageDefinition: MessageDefinition,
  definitionResolver: DefinitionResolver,
  outputContentMap: Map<string, OutputContentBuilder>,
): void {
  if (!messageDefinition.name) {
    throw new Error(`"name" field is missing on a message.`);
  }

  messageDefinition.fields.sort((a, b) => a.index - b.index);

  let loggingPrefix = `When generating message ${messageDefinition.name},`;
  let tsContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
  );
  let fields = new Array<string>();
  let fieldDescriptors = new Array<string>();
  if (messageDefinition.fields) {
    let usedIndexes = new Set<number>();
    for (let field of messageDefinition.fields) {
      if (!field.name) {
        throw new Error(`${loggingPrefix} "name" is missing on a field.`);
      }
      if (!field.type) {
        throw new Error(`${loggingPrefix} "type" is missing on ${field.name}.`);
      }
      if (!field.index) {
        throw new Error(
          `${loggingPrefix} "index" is missing on field ${field.name}.`,
        );
      }
      if (usedIndexes.has(field.index)) {
        throw new Error(
          `${loggingPrefix} field ${field.name} has a duplicate index ${field.index}.`,
        );
      }
      usedIndexes.add(field.index);
    }
    messageDefinition.fields.sort((a, b) => a.index - b.index);

    for (let field of messageDefinition.fields) {
      let typeDescriptorLine: string;
      if (PRIMITIVE_TYPES.has(field.type)) {
        tsContentBuilder.importFromMessageDescriptor("PrimitiveType");
        typeDescriptorLine = `primitiveType: PrimitiveType.${field.type.toUpperCase()}`;
      } else {
        let definition = definitionResolver.resolve(
          loggingPrefix,
          field.type,
          field.import,
        );
        if (definition.kind === "Enum") {
          let enumDescriptorName = toUppercaseSnaked(field.type);
          tsContentBuilder.importFromDefinition(
            field.import,
            field.type,
            enumDescriptorName,
          );
          typeDescriptorLine = `enumType: ${enumDescriptorName}`;
        } else if (definition.kind === "Message") {
          let messageDescriptorName = toUppercaseSnaked(field.type);
          tsContentBuilder.importFromDefinition(
            field.import,
            field.type,
            messageDescriptorName,
          );
          typeDescriptorLine = `messageType: ${messageDescriptorName}`;
        } else {
          throw new Error(
            `${loggingPrefix} a new definition needs to be handled for type ${field.type} of field ${field.name}.`,
          );
        }
      }
      let fieldTypeName: string;
      let isArrayLine: string;
      if (field.isArray) {
        fieldTypeName = `Array<${field.type}>`;
        isArrayLine = `isArray: true`;
      } else {
        fieldTypeName = field.type;
      }
      fieldDescriptors.push(`{
    name: '${field.name}',
    index: ${field.index},
    ${typeDescriptorLine},${isArrayLine ? "\n    " + isArrayLine + "," : ""}
  }`);
      if (!field.deprecated) {
        fields.push(`
  ${field.name}?: ${fieldTypeName},`);
      }
    }
  }

  tsContentBuilder.importFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUppercaseSnaked(messageDefinition.name);
  tsContentBuilder.push(`
export interface ${messageDefinition.name} {${fields.join("")}
}

export let ${descriptorName}: MessageDescriptor<${messageDefinition.name}> = {
  name: '${messageDefinition.name}',
  fields: [${fieldDescriptors.join(", ")}],
};
`);
}
