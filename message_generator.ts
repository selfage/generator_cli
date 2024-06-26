import { MessageDefinition } from "./definition";
import { DefinitionFinder } from "./definition_finder";
import { OutputContentBuilder } from "./output_content_builder";
import { generateComment, toUppercaseSnaked } from "./util";

let PRIMITIVE_TYPES = new Set<string>(["string", "number", "boolean"]);

export function generateMessageDescriptor(
  modulePath: string,
  messageName: string,
  messageDefinition: MessageDefinition,
  definitionFinder: DefinitionFinder,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  let outputContentBuilder = OutputContentBuilder.get(contentMap, modulePath);
  outputContentBuilder.push(`${generateComment(messageDefinition.comment)}
export interface ${messageName} {`);
  for (let field of messageDefinition.fields) {
    let fieldTypeName: string;
    if (field.isArray) {
      fieldTypeName = `Array<${field.type}>`;
    } else {
      fieldTypeName = field.type;
    }
    outputContentBuilder.push(`${generateComment(field.comment)}
  ${field.name}?: ${fieldTypeName},`);
  }
  outputContentBuilder.push(`
}
`);

  outputContentBuilder.importFromMessageDescriptor("MessageDescriptor");
  let descriptorName = toUppercaseSnaked(messageName);
  outputContentBuilder.push(`
export let ${descriptorName}: MessageDescriptor<${messageName}> = {
  name: '${messageName}',
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
      let typeDefinition = definitionFinder.getDefinition(
        field.type,
        field.import,
      );
      if (!typeDefinition) {
        throw new Error(`Type ${field.type} is not found in ${field.import}.`);
      }

      if (typeDefinition.enum) {
        let enumDescriptorName = toUppercaseSnaked(field.type);
        outputContentBuilder.importFromPath(
          field.import,
          field.type,
          enumDescriptorName,
        );
        outputContentBuilder.push(`
      enumType: ${enumDescriptorName},`);
      } else if (typeDefinition.message) {
        let messageDescriptorName = toUppercaseSnaked(field.type);
        outputContentBuilder.importFromPath(
          field.import,
          field.type,
          messageDescriptorName,
        );
        outputContentBuilder.push(`
      messageType: ${messageDescriptorName},`);
      } else {
        throw new Error(
          `Type ${field.type} is not found to be a primitve type, enum or message when imported from ${field.import}.`,
        );
      }
    }

    if (field.isArray) {
      outputContentBuilder.push(`
      isArray: true,`);
    }
    outputContentBuilder.push(`
    },`);
  }
  outputContentBuilder.push(`
  ]
};
`);
}
