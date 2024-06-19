import { DefinitionFinder } from "./definition_finder";
import { assertThat, assertThrow, eq, eqError } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DefinitionFinderTest",
  cases: [
    {
      name: "MissingFile",
      execute: () => {
        // Prepare
        let typeLoader = new DefinitionFinder(
          "./test_data/type_loader/non_exist",
        );

        // Execute
        let err = assertThrow(() => typeLoader.getDefinition("BasicData"));

        // Verify
        assertThat(err, eqError(new Error("Cannot find module")), `err`);
      },
    },
    {
      name: "MalformedJson",
      execute: () => {
        // Prepare
        let typeLoader = new DefinitionFinder(
          "./test_data/type_loader/malformed",
        );

        // Execute
        let err = assertThrow(() => typeLoader.getDefinition("BasicData"));

        // Verify
        assertThat(
          err,
          eqError(new SyntaxError("Failed to parse JSON")),
          `err`,
        );
      },
    },
    {
      name: "CategorizeTypeAndGetDefinitionFromCurrentModule",
      execute: () => {
        // Prepare
        let typeLoader = new DefinitionFinder("./test_data/type_loader/basic");

        {
          // Execute
          let definition = typeLoader.getDefinition("BasicData");

          // Verify
          assertThat(definition.name, eq("BasicData"), "BasicData.name");
          assertThat(
            definition.message.comment,
            eq("Test data"),
            "BasicData.comment",
          );

          // Execute
          let definition2 = typeLoader.getDefinition("BasicData");

          // Verify
          assertThat(definition2, eq(definition), "Same BasicData");
        }

        {
          // Execute
          let definition = typeLoader.getDefinition("SomeEnum");

          // Verify
          assertThat(Boolean(definition.enum), eq(true), "SomeEnum is enum");
        }

        {
          // Execute
          let definition = typeLoader.getDefinition("ObservableData");

          // Verify
          assertThat(
            definition.name,
            eq("ObservableData"),
            "ObservableData.name",
          );
          assertThat(
            definition.observable.comment,
            eq("Test observable"),
            "ObservableData.comment",
          );
        }
      },
    },
    {
      name: "GetDefinitionFromImportedPath",
      execute: () => {
        // Prepare
        let typeLoader = new DefinitionFinder("./test_data/type_loader/basic");

        // Execute
        let definition = typeLoader.getDefinition(
          "AnotherData",
          "./inside/another",
        );

        // Verify
        assertThat(definition.name, eq("AnotherData"), "AnotherData.name");
        assertThat(
          definition.message.comment,
          eq("Another data"),
          "AnotherData.comment",
        );
      },
    },
  ],
});
