import { MessageResolver } from "./message_resolver";
import {
  assertThat,
  assertThrow,
  containStr,
  eq,
  eqError,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "MessageResolverTest",
  cases: [
    {
      name: "MissingFile",
      execute: () => {
        // Prepare
        let messageResolver = new MessageResolver(
          "./test_data/message_resolver/non_exist",
        );

        // Execute
        let err = assertThrow(() =>
          messageResolver.resolve("When testing,", "BasicData"),
        );

        // Verify
        assertThat(err, eqError(new Error("Cannot find module")), `err`);
      },
    },
    {
      name: "MalformedJson",
      execute: () => {
        // Prepare
        let messageResolver = new MessageResolver(
          "./test_data/message_resolver/malformed",
        );

        // Execute
        let err = assertThrow(() =>
          messageResolver.resolve("When testing,", "BasicData"),
        );

        // Verify
        assertThat(err.message, containStr("failed to parse YAML"), `err`);
      },
    },
    {
      name: "CategorizeTypeAndGetDefinitionFromCurrentModule",
      execute: () => {
        // Prepare
        let messageResolver = new MessageResolver(
          "./test_data/message_resolver/basic",
        );

        {
          // Execute
          let definition = messageResolver.resolve(
            "When testing,",
            "BasicData",
          );

          // Verify
          assertThat(
            definition.message.name,
            eq("BasicData"),
            "BasicData.name",
          );

          // Execute
          let definition2 = messageResolver.resolve(
            "When testing,",
            "BasicData",
          );

          // Verify
          assertThat(definition2, eq(definition), "Same BasicData");
        }

        {
          // Execute
          let definition = messageResolver.resolve("When testing,", "SomeEnum");

          // Verify
          assertThat(Boolean(definition.enum), eq(true), "SomeEnum is enum");
        }
      },
    },
    {
      name: "GetDefinitionFromImportedPath",
      execute: () => {
        // Prepare
        let messageResolver = new MessageResolver(
          "./test_data/message_resolver/basic",
        );

        // Execute
        let definition = messageResolver.resolve(
          "When testing,",
          "AnotherData",
          "./test_data/message_resolver/inside/another",
        );

        // Verify
        assertThat(
          definition.message.name,
          eq("AnotherData"),
          "AnotherData.name",
        );
      },
    },
  ],
});
