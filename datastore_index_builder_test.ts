import fs = require("fs");
import { DatastoreIndexBuilder } from "./datastore_index_builder";
import { assertThat, eq } from "@selfage/test_matcher";
import { TEST_RUNNER, TestCase } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "DatastoreIndexBuilderTest",
  cases: [
    {
      name: "NonExistingYaml",
      execute: () => {
        // Execute
        DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/non_exist.yaml"
        ).writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/non_exist.yaml")
            .toString(),
          eq(`indexes: []\n`),
          `content`
        );
      },
      tearDown: () => {
        fs.unlinkSync("./test_data/datastore_index_builder/non_exist.yaml");
      },
    },
    {
      name: "EmptyExistingYaml",
      execute: () => {
        // Execute
        DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/empty.yaml"
        ).writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/empty.yaml")
            .toString(),
          eq(`indexes: []\n`),
          `content`
        );

        // Cleanup
        fs.writeFileSync("./test_data/datastore_index_builder/empty.yaml", "");
      },
    },
    new (class implements TestCase {
      public name = "NoIndexesFieldExistingYaml";
      private originalContent: string;
      public execute() {
        // Prepare
        this.originalContent = fs
          .readFileSync("./test_data/datastore_index_builder/no_indexes.yaml")
          .toString();

        // Execute
        DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/no_indexes.yaml"
        ).writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/no_indexes.yaml")
            .toString(),
          eq(`indexes: []\n`),
          `content`
        );
      }
      public tearDown() {
        fs.writeFileSync(
          "./test_data/datastore_index_builder/no_indexes.yaml",
          this.originalContent
        );
      }
    })(),
    {
      name: "NoIndexesToGenerate",
      execute: () => {
        // Prepare
        let indexBuilder = DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/non_exist.yaml"
        );

        // Execute
        indexBuilder.addIndex("Task", {
          name: "TaskDoneDesc",
          orderings: [
            {
              fieldName: "done",
              descending: true,
            },
          ],
        });
        indexBuilder.addIndex("Task", {
          name: "Collabs",
          filters: [
            {
              fieldName: "collaborators",
              operator: "=",
            },
          ],
        });
        indexBuilder.addIndex("TaskList", {
          name: "Tasks",
          filters: [
            {
              fieldName: "taskIds",
              operator: ">",
            },
          ],
          orderings: [{ fieldName: "taskIds", descending: false }],
        });
        indexBuilder.writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/non_exist.yaml")
            .toString(),
          eq(`indexes: []\n`),
          `content`
        );
      },
      tearDown: () => {
        fs.unlinkSync("./test_data/datastore_index_builder/non_exist.yaml");
      },
    },
    {
      name: "NewIndexes",
      execute: () => {
        // Prepare
        let indexBuilder = DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/non_exist.yaml"
        );

        // Execute
        indexBuilder.addIndex("Task", {
          name: "TaskDone",
          filters: [
            {
              fieldName: "done",
              operator: "=",
            },
          ],
          orderings: [
            {
              fieldName: "priority",
              descending: true,
            },
          ],
        });
        indexBuilder.addIndex("Task", {
          name: "TaskDoneDesc",
          filters: [
            {
              fieldName: "done",
              operator: "=",
            },
          ],
        });
        indexBuilder.addIndex("Task", {
          name: "OrderedCollabs",
          filters: [
            {
              fieldName: "collaborators",
              operator: "=",
            },
            {
              fieldName: "created",
              operator: ">",
            },
          ],
          orderings: [
            {
              fieldName: "created",
              descending: true,
            },
            { fieldName: "lastActivity", descending: false },
          ],
        });
        indexBuilder.addIndex("TaskList", {
          name: "TaskCompletion",
          filters: [
            {
              fieldName: "type",
              operator: "=",
            },
            {
              fieldName: "percentComplete",
              operator: "<",
            },
          ],
        });
        indexBuilder.writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/non_exist.yaml")
            .toString(),
          eq(`indexes:
  - kind: Task
    properties:
      - name: collaborators
        direction: asc
      - name: created
        direction: desc
      - name: lastActivity
        direction: asc
  - kind: Task
    properties:
      - name: done
        direction: asc
      - name: priority
        direction: desc
  - kind: TaskList
    properties:
      - name: type
        direction: asc
      - name: percentComplete
        direction: asc
`),
          `content`
        );
      },
      tearDown: () => {
        fs.unlinkSync("./test_data/datastore_index_builder/non_exist.yaml");
      },
    },
    new (class implements TestCase {
      public name = "MergeIndexes";
      private originalContent: string;
      public execute() {
        // Prepare
        this.originalContent = fs
          .readFileSync("./test_data/datastore_index_builder/index.yaml")
          .toString();
        let indexBuilder = DatastoreIndexBuilder.create(
          "./test_data/datastore_index_builder/index.yaml"
        );

        // Execute
        indexBuilder.addIndex("Task", {
          name: "TaskDone",
          filters: [
            {
              fieldName: "done",
              operator: "=",
            },
          ],
          orderings: [
            {
              fieldName: "priority",
              descending: true,
            },
          ],
        });
        indexBuilder.addIndex("Task", {
          name: "OrderedCollabs",
          filters: [
            {
              fieldName: "collaborators",
              operator: "=",
            },
            {
              fieldName: "created",
              operator: ">",
            },
          ],
          orderings: [
            {
              fieldName: "created",
              descending: true,
            },
          ],
        });
        indexBuilder.addIndex("TaskList", {
          name: "TaskCompletion",
          filters: [
            {
              fieldName: "type",
              operator: "=",
            },
            {
              fieldName: "percentComplete",
              operator: ">",
            },
          ],
        });
        indexBuilder.writeFileSync();

        // Verify
        assertThat(
          fs
            .readFileSync("./test_data/datastore_index_builder/index.yaml")
            .toString(),
          eq(`indexes:
  - kind: Task
    properties:
      - name: collaborators
        direction: asc
      - name: created
        direction: desc
      - name: lastActivity
        direction: asc
  - kind: Task
    properties:
      - name: collaborators
        direction: asc
      - name: created
        direction: desc
  - kind: Task
    properties:
      - name: done
        direction: asc
      - name: priority
        direction: desc
  - kind: TaskList
    properties:
      - name: type
        direction: asc
      - name: percentComplete
        direction: asc
  - kind: User
    properties:
      - name: username
        direction: asc
      - name: created
        direction: desc
`),
          `content`
        );
      }
      public tearDown() {
        fs.writeFileSync(
          "./test_data/datastore_index_builder/index.yaml",
          this.originalContent
        );
      }
    })(),
  ],
});
