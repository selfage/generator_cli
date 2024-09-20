#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import { generate } from "./generator";
import { toUnixPath } from "./util";
import { Command } from "commander";
import "source-map-support/register";

async function main(): Promise<void> {
  let packageConfig = JSON.parse(
    (
      await fs.promises.readFile(path.join(__dirname, "package.json"))
    ).toString(),
  );
  let program = new Command();
  program
    .version(packageConfig.version)
    .description(
      `Generate various TypeScript codes from the definition file written in YAML.`,
    )
    .argument("<definitionFile>")
    .option(
      "--dry-run",
      "Print the generated content instead of writing it to the destination " +
        "file.",
    )
    .action((definitionFile, options) => {
      generate(
        toUnixPath(definitionFile),
        options.dryRun,
      );
    })
    .parse();
}

main();
