import fs = require("fs");
import YAML = require("yaml");
import { writeFileSync } from "./io_helper";
import { DatastoreQueryTemplate } from "./definition";

// Mimic the structure of datastore composite index yaml.
interface CompositeIndexProperty {
  name: string;
  direction?: string;
}

interface CompositeIndex {
  kind: string;
  properties: Array<CompositeIndexProperty>;
}

interface CompositeIndexList {
  indexes: Array<CompositeIndex>;
}

export class DatastoreIndexBuilder {
  private jsonToIndexes = new Map<string, CompositeIndex>();

  public constructor(private indexFile: string) {}

  public static create(indexFile: string) {
    return new DatastoreIndexBuilder(indexFile).init();
  }

  public init(): this {
    if (fs.existsSync(this.indexFile)) {
      let indexList = YAML.parse(
        fs.readFileSync(this.indexFile).toString()
      ) as CompositeIndexList;
      if (indexList && indexList.indexes) {
        for (let index of indexList.indexes) {
          this.jsonToIndexes.set(JSON.stringify(index), index);
        }
      }
    }
    return this;
  }

  public addIndex(messageName: string, query: DatastoreQueryTemplate): void {
    // Relies on ES6 Map to keep insertion order.
    let fieldToDirections = new Map<string, boolean>();
    if (query.filters) {
      for (let filter of query.filters) {
        fieldToDirections.set(filter.fieldName, undefined);
      }
    }
    if (query.orderings) {
      for (let ordering of query.orderings) {
        fieldToDirections.set(ordering.fieldName, ordering.descending);
      }
    }
    if (fieldToDirections.size < 2) {
      return;
    }

    let compositeIndexProperties = new Array<CompositeIndexProperty>();
    for (let [name, descending] of fieldToDirections) {
      let direction: string;
      if (descending) {
        direction = "desc";
      } else {
        direction = "asc";
      }
      compositeIndexProperties.push({ name, direction });
    }
    let compsiteIndex = {
      kind: messageName,
      properties: compositeIndexProperties,
    };
    this.jsonToIndexes.set(JSON.stringify(compsiteIndex), compsiteIndex);
  }

  public writeFileSync(dryRun?: boolean): void {
    let sortedIndexes = new Array<CompositeIndex>();
    for (let key of Array.from(this.jsonToIndexes.keys()).sort()) {
      sortedIndexes.push(this.jsonToIndexes.get(key));
    }
    let indexContent = YAML.stringify({ indexes: sortedIndexes });
    writeFileSync(this.indexFile, indexContent, dryRun);
  }
}
