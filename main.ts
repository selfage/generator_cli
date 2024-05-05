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
    ).toString(),
  );
  let program = new Command();
  program
    .version(packageConfig.version)
    .description(
      `Generate various TypeScript codes from the definition file written in JSON.`,
    )
    .argument("<definitionFile>")
    .option(
      "-i, --index-file <indexFile>",
      `The index yaml file for Google Cloud Datastore composite index. Its ` +
        `file ext` +
        FIXED_FILE_EXT +
        `.yaml. Requried only if your definition file includes a datastore ` +
        `definition. You can also add '"datastoreIndex": "./your/index_file"'` +
        ` to your package.json file to save typings.`,
    )
    .option(
      "--dry-run",
      "Print the generated content instead of writing it to the destination " +
        "file.",
    )
    .action((definitionFile, options) => {
      generate(
        definitionFile.split(path.sep).join(path.posix.sep),
        options.indexFile,
        options.dryRun,
      );
    })
    .parse();
}

main();
