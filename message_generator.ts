import { MessageDefinition } from "./definition";
import { MessageResolver } from "./message_resolver";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toUppercaseSnaked, wrapComment } from "./util";

let PRIMITIVE_TYPES = new Set<string>(["string", "number", "boolean"]);

export function generateMessage(
  definitionModulePath: string,
  messageDefinition: MessageDefinition,
  messageResolver: MessageResolver,
  outputContentMap: Map<string, OutputContentBuilder>,
): void {
  if (!messageDefinition.name) {
    throw new Error(`"name" field is missing on a message.`);
  }

  let loggingPrefix = `When generating message ${messageDefinition.name},`;
  let tsContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
  );
  let fields = new Array<string>();
  let fieldDescriptors = new Array<string>();
  let usedIndexes = new Set<number>();
  if (!messageDefinition.fields) {
    throw new Error(
      `${loggingPrefix} "fields" is either missing or not an array.`,
    );
  }
  for (let field of messageDefinition.fields) {
    if (!field.name) {
      throw new Error(`${loggingPrefix} "name" is missing on a field.`);
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

    if (!field.type) {
      throw new Error(`${loggingPrefix} "type" is missing on ${field.name}.`);
    }
    let descriptorLine: string;
    if (PRIMITIVE_TYPES.has(field.type)) {
      tsContentBuilder.importFromMessageDescriptor("PrimitiveType");
      descriptorLine = `primitiveType: PrimitiveType.${field.type.toUpperCase()}`;
    } else {
      let definition = messageResolver.resolve(
        loggingPrefix,
        field.type,
        field.import,
      );
      if (definition.enum) {
        let enumDescriptorName = toUppercaseSnaked(field.type);
        tsContentBuilder.importFromDefinition(
          field.import,
          field.type,
          enumDescriptorName,
        );
        descriptorLine = `enumType: ${enumDescriptorName}`;
      } else if (definition.message) {
        let messageDescriptorName = toUppercaseSnaked(field.type);
        tsContentBuilder.importFromDefinition(
          field.import,
          field.type,
          messageDescriptorName,
        );
        descriptorLine = `messageType: ${messageDescriptorName}`;
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
    ${descriptorLine},${isArrayLine ? "\n    " + isArrayLine + "," : ""}
  }`);
    if (!field.deprecated) {
      let fieldComment = wrapComment(field.comment);
      fields.push(`
  ${fieldComment ? fieldComment + "\n  " : ""}${field.name}?: ${fieldTypeName},`);
    }
  }

  tsContentBuilder.importFromMessageDescriptor("MessageDescriptor");
  let messageComment = wrapComment(messageDefinition.comment);
  let descriptorName = toUppercaseSnaked(messageDefinition.name);
  tsContentBuilder.push(`
${messageComment ? messageComment + "\n" : ""}export interface ${messageDefinition.name} {${fields.join("")}
}

export let ${descriptorName}: MessageDescriptor<${messageDefinition.name}> = {
  name: '${messageDefinition.name}',
  fields: [${fieldDescriptors.join(", ")}],
};
`);
}
