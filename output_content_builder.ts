import path = require("path");
import { writeFileSync } from "./io_helper";
import { isRelativePath, normalizeRelativePathForNode } from "./util";

export interface OutputContentBuilder {
  build: () => string;
  writeSync: (dryRun: boolean) => void;
}

// Holds arbitrary generated content.
export class SimpleContentBuilder implements OutputContentBuilder {
  public static get(
    contentMap: Map<string, OutputContentBuilder>,
    suffix: string,
    outputModulePath: string,
  ): SimpleContentBuilder {
    outputModulePath = normalizeRelativePathForNode(outputModulePath);
    let outputContentBuilder = contentMap.get(
      outputModulePath,
    ) as SimpleContentBuilder;
    if (!outputContentBuilder) {
      outputContentBuilder = new SimpleContentBuilder(outputModulePath, suffix);
      contentMap.set(outputModulePath, outputContentBuilder);
    }
    return outputContentBuilder;
  }

  private contentList = new Array<string>();

  public constructor(
    private outputModulePath: string,
    private suffix: string,
  ) {}

  public push(...newContent: Array<string>): void {
    this.contentList.push(...newContent);
  }

  public build(): string {
    return this.contentList.join("");
  }

  public writeSync(dryRun: boolean): void {
    writeFileSync(this.outputModulePath + this.suffix, this.build(), dryRun);
  }
}

// Holds generated TypeScript code content.
export class TsContentBuilder implements OutputContentBuilder {
  public static get(
    contentMap: Map<string, OutputContentBuilder>,
    definitionModulePath: string,
    outputModulePath?: string,
  ): TsContentBuilder {
    outputModulePath = normalizeRelativePathForNode(
      outputModulePath ?? definitionModulePath,
    );
    let outputContentBuilder = contentMap.get(
      outputModulePath,
    ) as TsContentBuilder;
    if (!outputContentBuilder) {
      outputContentBuilder = new TsContentBuilder(
        definitionModulePath,
        outputModulePath,
      );
      contentMap.set(outputModulePath, outputContentBuilder);
    }
    return outputContentBuilder;
  }

  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportToPaths = new Map<string, string>();
  private contentList = new Array<string>();
  private outputModuleDirPath: string;
  private sameModuleImportPath: string;

  public constructor(
    private baseDefinitionModulePath: string,
    private outputModulePath: string,
  ) {
    this.outputModuleDirPath = path.posix.resolve(
      path.posix.dirname(outputModulePath),
    );
    this.sameModuleImportPath = normalizeRelativePathForNode(
      path.posix.basename(outputModulePath),
    );
  }

  public push(...newContent: Array<string>): void {
    this.contentList.push(...newContent);
  }

  public importFromDatastoreModelDescriptor(
    ...namedImports: Array<string>
  ): void {
    this.importFrom(
      "@selfage/datastore_client/model_descriptor",
      ...namedImports,
    );
  }

  public importFromMessageDescriptor(...namedImports: Array<string>): void {
    this.importFrom("@selfage/message/descriptor", ...namedImports);
  }

  public importFromMessageSerializer(...namedImports: Array<string>): void {
    this.importFrom("@selfage/message/serializer", ...namedImports);
  }

  public importFromObservableDescriptor(...namedImports: Array<string>): void {
    this.importFrom("@selfage/observable/descriptor", ...namedImports);
  }

  public importFromServiceDescriptor(...namedImports: Array<string>): void {
    this.importFrom("@selfage/service_descriptor", ...namedImports);
  }

  public importFromServiceClientRequestInterface(
    ...namedImports: Array<string>
  ): void {
    this.importFrom(
      "@selfage/service_descriptor/client_request_interface",
      ...namedImports,
    );
  }

  public importFromServiceRemoteCallHandlerInterface(
    ...namedImports: Array<string>
  ): void {
    this.importFrom(
      "@selfage/service_descriptor/remote_call_handler_interface",
      ...namedImports,
    );
  }

  public importFromObservableArray(...namedImports: Array<string>): void {
    this.importFrom("@selfage/observable_array", ...namedImports);
  }

  public importFromSpanner(...namedImports: Array<string>): void {
    this.importFrom("@google-cloud/spanner", ...namedImports);
  }

  public importFromSpannerTransaction(...namedImports: Array<string>): void {
    this.importFrom(
      "@google-cloud/spanner/build/src/transaction",
      ...namedImports,
    );
  }

  public importFromStream(...namedImports: Array<string>): void {
    this.importFrom("stream", ...namedImports);
  }

  public importFromDefinition(
    definitionModulePath: string | undefined,
    ...namedImports: Array<string>
  ): void {
    if (!definitionModulePath) {
      definitionModulePath = this.baseDefinitionModulePath;
    }
    if (isRelativePath(definitionModulePath)) {
      definitionModulePath = normalizeRelativePathForNode(
        path.posix.relative(this.outputModuleDirPath, definitionModulePath),
      );
    }
    if (definitionModulePath === this.sameModuleImportPath) {
      return;
    }
    this.importFrom(definitionModulePath, ...namedImports);
  }

  private importFrom(
    path: string | undefined,
    ...namedImports: Array<string>
  ): void {
    let namedImportsInMap = this.pathToNamedImports.get(path);
    if (!namedImportsInMap) {
      namedImportsInMap = new Set<string>();
      this.pathToNamedImports.set(path, namedImportsInMap);
    }
    for (let namedImport of namedImports) {
      namedImportsInMap.add(namedImport);
      this.namedImportToPaths.set(namedImport, path);
    }
  }

  public build(): string {
    let resultContent = new Array<string>();
    for (let entry of this.pathToNamedImports.entries()) {
      let importPath = entry[0];
      let namedImports = Array.from(entry[1]).join(", ");
      resultContent.push(`import { ${namedImports} } from '${importPath}';\n`);
    }
    resultContent.push(...this.contentList);
    return resultContent.join("");
  }

  public writeSync(dryRun: boolean): void {
    writeFileSync(this.outputModulePath + ".ts", this.build(), dryRun);
  }
}
