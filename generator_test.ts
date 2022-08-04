import fs = require("fs");
import { generate } from "./generator";
import { TEST_RUNNER, TestCase } from "@selfage/test_runner";
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

async function unlinkSilently(path: string): Promise<void> {
  try {
    await fs.promises.unlink(path);
  } catch (e) {
    // Swallow errors.
  }
}

TEST_RUNNER.run({
  name: "GeneratorTest",
  cases: [
    {
      name: "GenerateMessage",
      execute: () => {
        // Execute
        generate("./test_data/generator/inside/credit_card");

        // Verify
        assertCompile("./test_data/generator/inside/credit_card.ts");

        // Execute
        generate("./test_data/generator/user_info");

        // Verify
        assertCompile("./test_data/generator/user_info.ts");

        // Execute
        generate("./test_data/generator/user");

        // Verify
        assertCompile("./test_data/generator/user.ts");
      },
      tearDown: async () => {
        await Promise.all([
          unlinkSilently("./test_data/generator/inside/credit_card.ts"),
          unlinkSilently("./test_data/generator/inside/credit_card.js"),
          unlinkSilently("./test_data/generator/user_info.ts"),
          unlinkSilently("./test_data/generator/user_info.js"),
          unlinkSilently("./test_data/generator/user.ts"),
          unlinkSilently("./test_data/generator/user.js"),
        ]);
      },
    },
    {
      name: "GenerateObservable",
      execute: () => {
        // Execute
        generate("./test_data/generator/inside/money");

        // Verify
        assertCompile("./test_data/generator/inside/money.ts");

        // Execute
        generate("./test_data/generator/item");

        // Verify
        assertCompile("./test_data/generator/item.ts");

        // Execute
        generate("./test_data/generator/cart");

        // Verify
        assertCompile("./test_data/generator/cart.ts");
      },
      tearDown: async () => {
        await Promise.all([
          unlinkSilently("./test_data/generator/inside/money.ts"),
          unlinkSilently("./test_data/generator/inside/money.js"),
          unlinkSilently("./test_data/generator/item.ts"),
          unlinkSilently("./test_data/generator/item.js"),
          unlinkSilently("./test_data/generator/cart.ts"),
          unlinkSilently("./test_data/generator/cart.js"),
        ]);
      },
    },
    new (class implements TestCase {
      public name = "GenerateDatastoreModel";

      private originalIndexes: Buffer;
      public execute() {
        // Prepare
        this.originalIndexes = fs.readFileSync(
          "./test_data/generator/index.yaml"
        );

        // Execute
        generate("./test_data/generator/task", "./test_data/generator/index");

        // Verify
        assertCompile("./test_data/generator/inside/task_model.ts");
      }
      public async tearDown() {
        await Promise.all([
          unlinkSilently("./test_data/generator/task.ts"),
          unlinkSilently("./test_data/generator/task.js"),
          unlinkSilently("./test_data/generator/inside/task_model.ts"),
          unlinkSilently("./test_data/generator/inside/task_model.js"),
          fs.promises.writeFile(
            "./test_data/generator/index.yaml",
            this.originalIndexes
          ),
        ]);
      }
    })(),
    new (class implements TestCase {
      public name = "GenerateDatastoreModelWithPackageJsonFile";

      private originalIndexes: Buffer;
      public execute() {
        // Prepare
        this.originalIndexes = fs.readFileSync(
          "./test_data/generator/index.yaml"
        );

        // Execute
        generate(
          "./test_data/generator/task",
          undefined,
          undefined,
          "./test_data/generator/package.json"
        );

        // Verify
        assertCompile("./test_data/generator/inside/task_model.ts");
      }
      public async tearDown() {
        await Promise.all([
          unlinkSilently("./test_data/generator/task.ts"),
          unlinkSilently("./test_data/generator/task.js"),
          unlinkSilently("./test_data/generator/inside/task_model.ts"),
          unlinkSilently("./test_data/generator/inside/task_model.js"),
          fs.promises.writeFile(
            "./test_data/generator/index.yaml",
            this.originalIndexes
          ),
        ]);
      }
    })(),
    {
      name: "GenerateServiceDescriptor",
      execute: () => {
        // Prepare
        generate("./test_data/generator/inside/history");

        // Execute
        generate("./test_data/generator/service");

        // Verify
        assertCompile("./test_data/generator/service.ts");
      },
      tearDown: async () => {
        await Promise.all([
          unlinkSilently("./test_data/generator/service.ts"),
          unlinkSilently("./test_data/generator/service.js"),
          unlinkSilently("./test_data/generator/inside/history.ts"),
          unlinkSilently("./test_data/generator/inside/history.js"),
        ]);
      },
    },
    {
      name: "GenerateSpannerSql",
      execute: () => {
        // Execute
        generate("./test_data/generator/spanner_query");

        // Verify
        assertCompile("./test_data/generator/spanner_query.ts");
      },
      tearDown: async () => {
        await Promise.all([
          unlinkSilently("./test_data/generate/generator/spanner_query.js"),
          unlinkSilently("./test_data/generate/generator/spanner_query.ts"),
        ]);
      },
    },
  ],
});
