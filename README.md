# @seflage/generator_cli

## Install

`npm install @selfage/generator_cli`

## Overview

Written in TypeScript and compiled to ES6 with inline source map & source. See [@selfage/tsconfig](https://www.npmjs.com/package/@selfage/tsconfig) for full compiler options. Provides a CLI to generate TypeScript code based on definitions written in JSON. See [commander](https://www.npmjs.com/package/commander) if you are not sure about CLI syntax.

It can generate messages, observables, Google Datastore client, Google Spanner SQL interfaces, web service client, and service handler. Generated code would require corresponding runtime lib to run, which can be installed separately.

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

Another example to use index file when generating datastore clients is `$ geneage test_data/generator/datastore/task -i test_data/generator/datastore/index`, where `test_data/generator/datastore/task.json` is the input, and `test_data/generator/datastore/task.ts` and `test_data/generator/datastore/task_model.ts` are the output, while `test_data/generator/datastore/index` is both the input and output.

## Message

The term "message" stands for data class, inspired from Google's Protocol Buffers, i.e., in JavaScript/TypeScript case, an object without any functions defined on it, which is what can be communicated between different threads, processes, or distributed servers.

TypeScript uses interfaces to describe objects at compiling time, checking for invalid references to object fields/properties. However, in cases such as casting `JSON.parse(...)` to a type-safe object, `JSON.parse(...) as MyData` doesn't really validate fields for you and thus you don't get a real type-safe object.

The runtime lib [@selfage/message](https://github.com/selfage/message) can parse, copy and merge messages, while validate each field. It requires generated `MessageDescriptor`s.

Examples can be found under `test_data/generator/message`. E.g. `$ geneage test_data/generator/message/user_info`, where `test_data/generator/message/user_info.json` is the input and `test_data/generator/message/user_info.ts` is the output.

JSON definition files are like TypeScript interface but a little bit verbose. The supported `type`s are `string`, `boolean` and `number`, `enum`s, and `message`s.

## Observable

An observable object exposes events/callbacks to observe every state change.

The runtime lib [@selfage/observable](https://github.com/selfage/observable) can parse, copy and merge observable. It requires generated `ObservableDescriptor`s.

Examples can be found under `test_data/generator/observable`. E.g. `$ geneage test_data/generator/observable/item`, where `test_data/generator/observable/item.json` is the input and `test_data/generator/observable/item.ts` is the output.

Note that there are two types of arrays here, `normal` and `observable`, which should be self-explanatory. The supported `type`s are `string`, `boolean` and `number`, `enum`s, `message`s, and `observable`s.

## Datastore client

The runtime lib [selfage/datastore_client](https://github.com/selfage/datastore_client) provides type-safe Google Cloud Datastore APIs as a thin layer on top of `@google-cloud/datastore`, though requires generated `DatastoreModelDescriptor`s and `QueryBuilder`s.

Examples can be found under `test_data/generator/datastore`. E.g., `$ geneage test_data/generator/datastore/task -i test_data/generator/datastore/index`, where `test_data/generator/datastore/task.json` is the input, and `test_data/generator/datastore/task.ts` and `test_data/generator/datastore/task_model.ts` are the output, while `test_data/generator/datastore/index` is both the input and output.

A few notes about  `index.yaml`.

1. It contains composite indexes and is required to be uploaded to Google Datastore manually. It's not used by the runtime lib `selfage/datastore_client` directly.
1. It's generated based on the exact order of `filters` and `orderings` for each of `queries`. So the order matters a lot! It's recommended to read through Datastore's document carefully about queries and indexes, especially note how the order of fields/properties in a composite index affects the kinds of queries supported. Generating indexes this way is to keep it more manageable and predictable. You may still have to handcraft some super advanced indexes.
1. If you already have `index.yaml`, the above command will update `index.yaml` to include new indexes and will never delete indexes from `index.yaml` even if you deleted queries from your JSON definition file. You have to delete unused indexes manually from `index.yaml` and upload it to Datastore, because those indexes might still be used in the servers.

## Spanner SQL

The runtime lib is Google's standard client `@google-cloud/spanner`. Though you can handcraft SQL queries, this CLI helps you prepare params and parse output with type-safe interfaces.

Examples can be found under `test_data/generator/spanner`. E.g., `$ geneage test_data/generator/spanner/query`, where `test_data/generator/spanner/query.json` is the input and `test_data/generator/spanner/query.ts` is the output.

The SQL syntax is exactly the same as documented by Spanner. You only need to spell out the types of params and output columns. Unfortunately, it's not capable of validating the SQL syntax or making sure the types you spelled out are matching your database's definition.

The supported `type`s are `string`, `bool`, `int53`, `float`, `timestamp`, and `bytes`. Other types, including struct and array of array, are not supported. They are translated to Spanner and Nodejs types as the following.

1. `float` maps to `float64` in Spanner and `number` in JS/TS.
1. `timestamp` maps to `timestamp` in Spanner and number in milliseconds in JS/TS.
1. `string` and `bool` are the same in Spanner and JS/TS.
1. `bytes` maps to `bytes` in Spanner and Nodejs `Buffer` in JS/TS.
1. `int53` maps to `int64` in Spanner and `number` in JS/TS. By specifying `int53`, it means that you can guarantee the number stored won't exceed the max number in JS which is 2^53 - 1. `int64` is left out here until `bigint` is better supported.

## Service client & handler

There are two runtime libs, [@selfage/web_service_client](https://github.com/selfage/web_service_client) to be used in web browsers for calling to backend services via HTTP, and [@selfage/service_handler](https://github.com/selfage/web_service_client) to be used in backend servers for implementing HTTP service handlers.

Examples can be found under `test_data/generator/service`. E.g., `$ geneage test_data/generator/service/service`, `test_data/generator/service/service.json` is the input, and `test_data/generator/service/service.ts`, `test_data/generator/service/client.ts`, and `test_data/generator/service/handler.ts` are the output.

`response` can only be a `message`. `body` refers to the HTTP body in a request, and it can be either `bytes` or another `message`. Both `response` and `body` fields are required.

`side` and `signedUserSession` will be encoded to URL params, where keys are specified by their `key` field, and values are encoded from their `type` field which can only be another `message`.

## Other usage

The schema of a JSON definition file is an array of [definition](https://github.com/selfage/generator_cli/blob/416f38e10ba760b92e4ec774c2696dbacc3ce195/definition.ts#L139), where you can find more comprehensive documents and advanced fields.

## API access

`import { generate } from "@selfage/cli/generate/generator"` is the function invoked by the CLI.
