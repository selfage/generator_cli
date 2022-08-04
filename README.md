# @seflage/generator_cli

## Install

`npm install @selfage/generator_cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides a CLI to generate TypeScript code based on definitions written in JSON. See [commander](https://www.npmjs.com/package/commander) if you are not sure about CLI syntax.

Inspired by Google's protobuf, but can generate more than just services/messages. The motivation is to keep type information even at runtime, so libraries can be more generic. See `@selfage/message`, `@selfage/observable`, `@selfage/datastore_client` and `@selfage/service_descriptor` packages for detailed explanation of different type of generated code.

## CLI

```
$ geneage -h
Usage: geneage [options]

Generate various TypeScript codes from the definition file written in JSON.

Options:
  -V, --version                 output the version number
  -d, --definition <file>       The definition file written in JSON. Do not include ".json".
  -i, --index-file <indexFile>  The index yaml file for Google Cloud Datastore composite index. Its file ext can be neglected and is always fixed as .yaml. Requried only if
                                your definition file includes a datastore definition. You can also add '"datastoreIndex": "./your/index_file"' to your package.json file to
                                save typings.
  --dry-run                     Print the generated content instead of writing it to the destination file.
  -h, --help                    display help for command
```

## API access

`import { generate } from "@selfage/cli/generate/generator"` is the function invoked by the CLI.
