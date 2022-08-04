// Holds generated TypeScript code content.
export class OutputContentBuilder {
  private pathToNamedImports = new Map<string, Set<string>>();
  private namedImportToPaths = new Map<string, string>();
  private contentList = new Array<string>();

  public static get(
    contentMap: Map<string, OutputContentBuilder>,
    outputModuelPath: string
  ): OutputContentBuilder {
    let outputContentBuilder = contentMap.get(outputModuelPath);
    if (!outputContentBuilder) {
      outputContentBuilder = new OutputContentBuilder();
      contentMap.set(outputModuelPath, outputContentBuilder);
    }
    return outputContentBuilder;
  }

  public push(...newContent: Array<string>): void {
    this.contentList.push(...newContent);
  }

  public importFromDatastoreModelDescriptor(
    ...namedImports: Array<string>
  ): void {
    this.importFromPath(
      "@selfage/datastore_client/model_descriptor",
      ...namedImports
    );
  }

  public importFromMessageDescriptor(...namedImports: Array<string>): void {
    this.importFromPath("@selfage/message/descriptor", ...namedImports);
  }

  public importFromObservableDescriptor(...namedImports: Array<string>): void {
    this.importFromPath("@selfage/observable/descriptor", ...namedImports);
  }

  public importFromServiceDescriptor(...namedImports: Array<string>): void {
    this.importFromPath("@selfage/service_descriptor", ...namedImports);
  }

  public importFromObservableArray(...namedImports: Array<string>): void {
    this.importFromPath("@selfage/observable_array", ...namedImports);
  }

  public importFromPath(
    path: string | undefined,
    ...namedImports: Array<string>
  ): void {
    if (!path) {
      return;
    }
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

  public toString(): string {
    let resultContent = new Array<string>();
    for (let entry of this.pathToNamedImports.entries()) {
      let importPath = entry[0];
      let namedImports = Array.from(entry[1]).join(", ");
      resultContent.push(`import { ${namedImports} } from '${importPath}';\n`);
    }
    resultContent.push(...this.contentList);
    return resultContent.join("");
  }
}
