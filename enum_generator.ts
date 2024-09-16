import { EnumDefinition } from "./definition";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toUppercaseSnaked, wrapComment } from "./util";

export function generateEnum(
  modulePath: string,
  enumDefinition: EnumDefinition,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  if (!enumDefinition.name) {
    throw new Error(`"name" is missing on an enum.`);
  }

  let loggingPrefix = `When generating enum ${enumDefinition.name},`;
  let outputContentBuilder = TsContentBuilder.get(contentMap, modulePath);
  let values = new Array<string>();
  let valueDescriptors = new Array<string>();
  let enumComment = wrapComment(enumDefinition.comment);
  if (!enumDefinition.values) {
    throw new Error(
      `${loggingPrefix} "values" is either missing or not an array.`,
    );
  }
  for (let value of enumDefinition.values) {
    if (!value.name) {
      throw new Error(`${loggingPrefix} "name" is missing on a value.`);
    }
    if (!value.value) {
      throw new Error(`${loggingPrefix} "value" is missing on ${value.name}.`);
    }
    valueDescriptors.push(`{
    name: '${value.name}',
    value: ${value.value},
  }`);
    let valueComment = wrapComment(value.comment);
    values.push(`
  ${valueComment ? valueComment + "\n  " : ""}${value.name} = ${value.value},`);
  }

  outputContentBuilder.importFromMessageDescriptor("EnumDescriptor");
  let descriptorName = toUppercaseSnaked(enumDefinition.name);
  outputContentBuilder.push(`
${enumComment ? enumComment + "\n" : ""}export enum ${enumDefinition.name} {${values.join("")}
}

export let ${descriptorName}: EnumDescriptor<${enumDefinition.name}> = {
  name: '${enumDefinition.name}',
  values: [${valueDescriptors.join(", ")}]
}
`);
}
