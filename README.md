# @seflage/generator_cli

## Install

`npm install @selfage/generator_cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides a CLI to generate TypeScript code based on definitions written in JSON. See [commander](https://www.npmjs.com/package/commander) if you are not sure about CLI syntax.

It can generate messages, web/node service client and hanlder, and GCP Spanner database. Generated code would require corresponding runtime lib to run, which can be installed separately.

## CLI

```
$ geneage -h
Usage: geneage [options] <definitionFile>

Generate various TypeScript codes from the definition file written in JSON.

Options:
  -V, --version                 output the version number
  -i, --index-file <indexFile>  The index yaml file for Google Cloud Datastore composite index. Its file ext can be neglected and is always fixed as .yaml. Requried only if
                                your definition file includes a datastore definition. You can also add '"datastoreIndex": "./your/index_file"' to your package.json file to
                                save typings.
  --dry-run                     Print the generated content instead of writing it to the destination file.
  -h, --help                    display help for command
```

## Examples

All code generation examples can be found under `test_data/generator/` directory.
