# @selfage/generator_cli

Turn a single YAML description into TypeScript code for data models, HTTP APIs, and Cloud Spanner schema.

## Why use this CLI?
- Describe enums, messages, services, remote calls, and database schema once and generate the boilerplate automatically.
- Keep TypeScript types and runtime descriptors in sync without hand-editing multiple files.
- Preview output with `--dry-run`, or run the generator in CI/CD with `npx geneage`.
- Plays nicely with the `@selfage/*` runtime packages so the emitted code is executable right away.

## Installation

```bash
npm install --save-dev @selfage/generator_cli
```

The binary is published as `geneage`. Invoke it with `npx` or wire it into a package.json script.

## Quick start

1. Write your definitions in YAML (the file must use the `.yaml` extension):

   ```yaml
   - kind: Enum
     name: UserRole
     values:
       - { name: ADMIN, value: 1 }
       - { name: VIEWER, value: 2 }

   - kind: Message
     name: User
     fields:
       - { name: id, type: string, index: 1 }
       - { name: role, type: UserRole, index: 2 }

   - kind: Message
     name: GetUserRequest
     fields:
       - { name: id, type: string, index: 1 }

   - kind: Service
     name: UserService
     path: /user.v1.UserService

   - kind: RemoteCallsGroup
     name: UserClient
     service: UserService
     outputClient: ./generated/user_client
     outputHandler: ./generated/user_handlers
     calls:
       - name: GetUser
         path: /users/get
         body: GetUserRequest
         response: User

   - kind: SpannerDatabase
     name: UserDb
     outputDdl: ./generated/user_db_schema
     outputSql: ./generated/user_queries
     tables:
       - kind: Table
         name: UserTable
         columns:
           - { name: id, type: string }
           - { name: role, type: string }
         primaryKeys: [ id ]
   ```

2. Run the generator from the directory that contains the definition file:

   ```bash
   npx geneage ./definition.yaml
   ```

3. Review the emitted `.ts` and `.json` files in the target paths. Use `--dry-run` to print the generated content without touching the filesystem.

## What gets generated?

- **Enum** – a TypeScript enum plus an accompanying descriptor for `@selfage/message`.
- **Message** – a TypeScript interface with message metadata for `@selfage/message`.
- **Service** – a service descriptor compatible with `@selfage/service_descriptor`.
- **RemoteCallsGroup** – HTTP client helpers and handler base classes that reference your service descriptor.
- **SpannerDatabase** – Cloud Spanner DDL JSON and strongly typed query helpers.

Install the corresponding runtime packages (for example `@selfage/message`, `@selfage/service_descriptor`, and `@google-cloud/spanner`) to build and run the generated code.

## CLI reference

```text
geneage [options] <definitionFile>
```

Options:
- `-V, --version` – show the CLI version.
- `--dry-run` – write the generated content to stdout instead of to disk.
- `-h, --help` – display the usage guide.

The tool resolves `<definitionFile>` to `<definitionFile>.yaml`, so you can omit the `.yaml` suffix when convenient.

## Examples

The `test_data/generator/` directory contains end-to-end samples that cover every definition type. Use them as a reference when crafting your own YAML files.
