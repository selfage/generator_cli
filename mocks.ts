import { DatastoreIndexBuilder } from "./datastore_index_builder";
import { DatastoreQueryTemplate } from "./definition";
import { DefinitionFinder } from "./definition_finder";
import { Counter } from "@selfage/counter";

export class MockDatastoreIndexBuilder extends DatastoreIndexBuilder {
  public called = new Counter<string>();
  public constructor() {
    super("");
  }

  public addIndex(messageName: string, query: DatastoreQueryTemplate): void {}
}

export class MockDefinitionFinder extends DefinitionFinder {
  public called = new Counter<string>();
  public constructor() {
    super("");
  }
}
