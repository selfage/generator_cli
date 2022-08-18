import { DatastoreQuery, DatastoreFilter, DatastoreModelDescriptor } from '@selfage/datastore_client/model_descriptor';
import { Task, TASK } from '../task';

export let TASK_MODEL: DatastoreModelDescriptor<Task> = {
  name: "Task",
  key: "id",
  excludedIndexes: ["id", "payload"],
  valueDescriptor: TASK,
}

export class TaskDoneQueryBuilder {
  private datastoreQuery: DatastoreQuery<Task> = {
    modelDescriptor: TASK_MODEL,
    filters: new Array<DatastoreFilter>(),
    orderings: [
      {
        fieldName: "created",
        descending: true
      },
    ]
  };

  public start(cursor: string): this {
    this.datastoreQuery.startCursor = cursor;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }
  public equalToDone(value: boolean): this {
    this.datastoreQuery.filters.push({
      fieldName: "done",
      fieldValue: value,
      operator: "=",
    });
    return this;
  }
  public build(): DatastoreQuery<Task> {
    return this.datastoreQuery;
  }
}

export class TaskDonePriorityQueryBuilder {
  private datastoreQuery: DatastoreQuery<Task> = {
    modelDescriptor: TASK_MODEL,
    filters: new Array<DatastoreFilter>(),
    orderings: [
      {
        fieldName: "priority",
        descending: false
      },
      {
        fieldName: "created",
        descending: true
      },
    ]
  };

  public start(cursor: string): this {
    this.datastoreQuery.startCursor = cursor;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }
  public lessThanOrEqualToDone(value: boolean): this {
    this.datastoreQuery.filters.push({
      fieldName: "done",
      fieldValue: value,
      operator: "<=",
    });
    return this;
  }
  public build(): DatastoreQuery<Task> {
    return this.datastoreQuery;
  }
}

export class TagsQueryBuilder {
  private datastoreQuery: DatastoreQuery<Task> = {
    modelDescriptor: TASK_MODEL,
    filters: new Array<DatastoreFilter>(),
    orderings: [
    ]
  };

  public start(cursor: string): this {
    this.datastoreQuery.startCursor = cursor;
    return this;
  }
  public limit(num: number): this {
    this.datastoreQuery.limit = num;
    return this;
  }
  public equalToTags(value: string): this {
    this.datastoreQuery.filters.push({
      fieldName: "tags",
      fieldValue: value,
      operator: "=",
    });
    return this;
  }
  public build(): DatastoreQuery<Task> {
    return this.datastoreQuery;
  }
}
