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
  program
    .description(
      `Generate various TypeScript codes from the definition file written in JSON.`
    )
    .version(packageConfig.version)
    .requiredOption(
      "-d, --definition <file>",
      `The definition file written in JSON. Do not include ".json".`
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
      "--dry-run",
      "Print the generated content instead of writing it to the destination " +
        "file."
    ).parse();

  let options = program.opts();
  console.log(options);
  generate(options.definition, options.indexFile, options.dryRun);
}

main();
