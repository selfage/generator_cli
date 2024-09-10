import { generate } from "./generator";
import { TEST_RUNNER } from "@selfage/test_runner";
import { execSync } from "child_process";
import { readFileSync } from "fs";

function assertCompile(file: string): void {
  execSync(`npx tsc --noImplicitAny --moduleResolution node -t ES2020 ${file}`, {
    stdio: "inherit",
    windowsHide: true,
  });
}

function assertJsonValidity(file: string): void {
  readFileSync(file).toJSON();
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
    {
      name: "GenerateSpannerDatabase",
      execute: () => {
        // Execute
        generate("./test_data/generator/spanner/user");

        // Verify
        assertCompile("./test_data/generator/spanner/user.ts");
        assertCompile("./test_data/generator/spanner/sql.ts");
        assertJsonValidity("./test_data/generator/spanner/ddl.json");
      },
    },
  ],
});
