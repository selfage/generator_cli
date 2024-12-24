import { DefinitionResolver } from "./definition_resolver";
import {
  assertThat,
  assertThrow,
  containStr,
  eq,
  eqError,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DefinitionResolverTest",
  cases: [
    {
      name: "MissingFile",
      execute: () => {
        // Prepare
        let definitionResolver = new DefinitionResolver(
          "./test_data/message_resolver/non_exist",
        );

        // Execute
        let err = assertThrow(() =>
          definitionResolver.resolve("When testing,", "BasicData"),
        );

        // Verify
        assertThat(err, eqError(new Error("Cannot find module")), `err`);
      },
    },
    {
      name: "MalformedYaml",
      execute: () => {
        // Prepare
        let definitionResolver = new DefinitionResolver(
          "./test_data/message_resolver/malformed",
        );

        // Execute
        let err = assertThrow(() =>
          definitionResolver.resolve("When testing,", "BasicData"),
        );

        // Verify
        assertThat(err.message, containStr("definitions is not iterable"), `err`);
      },
    },
    {
      name: "CategorizeTypeAndGetDefinitionFromCurrentModule",
      execute: () => {
        // Prepare
        let definitionResolver = new DefinitionResolver(
          "./test_data/message_resolver/basic",
        );

        {
          // Execute
          let definition = definitionResolver.resolve(
            "When testing,",
            "BasicData",
          );

          // Verify
          assertThat(definition.name, eq("BasicData"), "BasicData.name");

          // Execute
          let definition2 = definitionResolver.resolve(
            "When testing,",
            "BasicData",
          );

          // Verify
          assertThat(definition2, eq(definition), "Same BasicData");
        }

        {
          // Execute
          let definition = definitionResolver.resolve(
            "When testing,",
            "SomeEnum",
          );

          // Verify
          assertThat(definition.kind, eq("Enum"), "SomeEnum is enum");
        }
      },
    },
    {
      name: "GetDefinitionFromImportedPath",
      execute: () => {
        // Prepare
        let definitionResolver = new DefinitionResolver(
          "./test_data/message_resolver/basic",
        );

        // Execute
        let definition = definitionResolver.resolve(
          "When testing,",
          "AnotherData",
          "./test_data/message_resolver/inside/another",
        );

        // Verify
        assertThat(definition.name, eq("AnotherData"), "AnotherData.name");
      },
    },
  ],
});
