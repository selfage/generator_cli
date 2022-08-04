import { DatastoreIndexBuilder } from "./datastore_index_builder";
import { DatastoreQueryTemplate } from "./definition";
import { TypeLoader } from "./type_loader";
import { Counter } from "@selfage/counter";

export class MockDatastoreIndexBuilder extends DatastoreIndexBuilder {
  public called = new Counter<string>();
  public constructor() {
    super("");
  }

  public addIndex(messageName: string, query: DatastoreQueryTemplate): void {}
}

export class MockTypeLoader extends TypeLoader {
  public called = new Counter<string>();
  public constructor() {
    super("");
  }
}
