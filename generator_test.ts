import fs = require("fs");
import { generate } from "./generator";
import { TEST_RUNNER } from "@selfage/test_runner";
import { spawnSync } from "child_process";

function assertCompile(file: string): void {
  let compilingRes = spawnSync(
    "npx",
    ["tsc", "--noImplicitAny", "--moduleResolution", "node", "-t", "ES6", file],
    {
      stdio: "inherit",
    }
  );
  if (compilingRes.status !== 0) {
    throw new Error(`Failed to compile ${file}.`);
  }
}

TEST_RUNNER.run({
  name: "GeneratorTest",
  cases: [
    {
      name: "GenerateMessage",
      execute: () => {
        // Execute
        generate("./test_data/generator/message/sub/credit_card");

        // Verify
        assertCompile("./test_data/generator/message/sub/credit_card.ts");

        // Execute
        generate("./test_data/generator/message/user_info");

        // Verify
        assertCompile("./test_data/generator/message/user_info.ts");

        // Execute
        generate("./test_data/generator/message/user");

        // Verify
        assertCompile("./test_data/generator/message/user.ts");
      },
    },
    {
      name: "GenerateObservable",
      execute: () => {
        // Execute
        generate("./test_data/generator/observable/sub/money");

        // Verify
        assertCompile("./test_data/generator/observable/sub/money.ts");

        // Execute
        generate("./test_data/generator/observable/item");

        // Verify
        assertCompile("./test_data/generator/observable/item.ts");

        // Execute
        generate("./test_data/generator/observable/cart");

        // Verify
        assertCompile("./test_data/generator/observable/cart.ts");
      },
    },
    {
      name: "GenerateDatastoreModel",
      execute: () => {
        // Prepare
        fs.writeFileSync(
          "./test_data/generator/datastore/index.yaml",
          fs.readFileSync("./test_data/generator/datastore/original_index.yaml")
        );

        // Execute
        generate(
          "./test_data/generator/datastore/task",
          "./test_data/generator/datastore/index"
        );

        // Verify
        assertCompile("./test_data/generator/datastore/sub/task_model.ts");
      },
    },
    {
      name: "GenerateDatastoreModelWithPackageJsonFile",
      execute: () => {
        // Prepare
        fs.writeFileSync(
          "./test_data/generator/datastore/index.yaml",
          fs.readFileSync("./test_data/generator/datastore/original_index.yaml")
        );

        // Execute
        generate(
          "./test_data/generator/datastore/task",
          undefined,
          undefined,
          "./test_data/generator/datastore/package.json"
        );

        // Verify
        assertCompile("./test_data/generator/datastore/sub/task_model.ts");
      },
    },
    {
      name: "GenerateSpannerSql",
      execute: () => {
        // Execute
        generate("./test_data/generator/spanner/query");

        // Verify
        assertCompile("./test_data/generator/spanner/query.ts");
      },
    },
    {
      name: "GenerateServiceDescriptor",
      execute: () => {
        // Prepare
        generate("./test_data/generator/service/sub/get_comments");
        generate("./test_data/generator/service/sub/upload_file");

        // Execute
        generate("./test_data/generator/service/service");

        // Verify
        assertCompile("./test_data/generator/service/service.ts");
        assertCompile("./test_data/generator/service/client.ts");
        assertCompile("./test_data/generator/service/handler.ts");
      },
    },
  ],
});
