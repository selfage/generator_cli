import { EnumDefinition } from "./definition";
import { OutputContentBuilder } from "./output_content_builder";
import { generateComment, toUpperSnaked } from "./util";

export function generateEnumDescriptor(
  modulePath: string,
  enumName: string,
  enumDefinition: EnumDefinition,
  contentMap: Map<string, OutputContentBuilder>
): void {
  let outputContentBuilder = OutputContentBuilder.get(contentMap, modulePath);
  outputContentBuilder.push(`${generateComment(enumDefinition.comment)}
export enum ${enumName} {`);
  for (let value of enumDefinition.values) {
    outputContentBuilder.push(`${generateComment(value.comment)}
  ${value.name} = ${value.value},`);
  }
  outputContentBuilder.push(`
}
`);

  outputContentBuilder.importFromMessageDescriptor("EnumDescriptor");
  let descriptorName = toUpperSnaked(enumName);
  outputContentBuilder.push(`
export let ${descriptorName}: EnumDescriptor<${enumName}> = {
  name: '${enumName}',
  values: [`);
  for (let value of enumDefinition.values) {
    outputContentBuilder.push(`
    {
      name: '${value.name}',
      value: ${value.value},
    },`);
  }
  outputContentBuilder.push(`
  ]
}
`);
}
