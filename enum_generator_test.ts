import { generateEnum } from "./enum_generator";
import { OutputContentBuilder } from "./output_content_builder";
import { assertThat, eqLongStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "EnumGeneratorTest",
  cases: [
    {
      name: "GenerateMultipleValues",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateEnum(
          "some_file",
          {
            kind: "Enum",
            name: "Color",
            values: [
              {
                name: "RED",
                value: 12,
              },
              {
                name: "BLUE",
                value: 1,
              },
            ],
          },
          contentMap,
        );

        // Verify
        assertThat(
          contentMap.get("./some_file").build(),
          eqLongStr(`import { EnumDescriptor } from '@selfage/message/descriptor';

export enum Color {
  RED = 12,
  BLUE = 1,
}

export let COLOR: EnumDescriptor<Color> = {
  name: 'Color',
  values: [{
    name: 'RED',
    value: 12,
  }, {
    name: 'BLUE',
    value: 1,
  }]
}
`),
          "outputContent",
        );
      },
    },
  ],
});
