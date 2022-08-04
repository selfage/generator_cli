#!/usr/bin/env node
import fs = require("fs");
import path = require("path");
import { generate } from "./generator";
import { Command } from "commander";
import "source-map-support/register";

let FIXED_FILE_EXT = ` can be neglected and is always fixed as `;

async function main(): Promise<void> {
  let packageConfig = JSON.parse(
    (
      await fs.promises.readFile(path.join(__dirname, "package.json"))
    ).toString()
  );
  let program = new Command();
  program.version(packageConfig.version);
  program
    .command("generate <file>")
    .alias("gen")
    .description(
      `Generate various descriptors from the specified source file. The ` +
        `source file ext` +
        FIXED_FILE_EXT +
        `.json. The generated file will be <file>.ts.`
    )
    .option(
      "-i, --index-file <indexFile>",
      `The index yaml file for Google Cloud Datastore composite index. Its ` +
        `file ext` +
        FIXED_FILE_EXT +
        `.yaml. Requried only if your definition file includes a datastore ` +
        `definition. You can also add '"datastoreIndex": "./your/index_file"'` +
        ` to your package.json file to save typings.`
    )
    .option(
      '-t, --target <targetEnvironment>',
      `The environment the generated file will be run in. Available options are "web" and "node". If not specified, "node" will be used. As of now, this option only affects generating service descriptors.`
    )
    .option(
      "--dry-run",
      "Print the generated content instead of writing it to the destination " +
        "file."
    )
    .action((file, options) =>
      generate(file, options.indexFile, options.dryRun)
    );
  await program.parseAsync();
}

main();
