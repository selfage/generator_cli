import { Definition } from "./definition";
import { MockDefinitionResolver } from "./definition_resolver_mock";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { generateRemoteCall } from "./service_generator";
import { assertThat, eq, eqLongStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ServiceGeneratorTest",
  cases: [
    {
      name: "GetCommentsService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(
            loggingPrefix: string,
            typeName: string,
            importPath?: string,
          ): Definition {
            this.called += 1;
            switch (typeName) {
              case "GetCommentsRequestBody":
                assertThat(importPath, eq(undefined), `importPath`);
                return {
                  kind: "Message",
                  name: "GetCommentsRequestBody",
                  fields: [],
                };
              case "GetCommentsResponse":
                assertThat(importPath, eq(undefined), `importPath`);
                return {
                  kind: "Message",
                  name: "GetCommentsResponse",
                  fields: [],
                };
              default:
                throw new Error("Unexpected type.");
            }
          }
        })();
        let descriptorContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_comments",
        );
        let clientContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_comments",
          "./web/client",
        );
        let handlerContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_comments",
          "./backend/handler",
        );

        // Execute
        generateRemoteCall(
          "./interface/get_comments",
          {
            name: "GetComments",
            path: "/get_comments",
            body: "GetCommentsRequestBody",
            response: "GetCommentsResponse",
          },
          "web",
          mockDefinitionResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(2), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_comments").build(),
          eqLongStr(`import { WebRemoteCallDescriptor } from '@selfage/service_descriptor';

export let GET_COMMENTS: WebRemoteCallDescriptor = {
  name: "GetComments",
  path: "/get_comments",
  body: {
    messageType: GET_COMMENTS_REQUEST_BODY,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
}
`),
          "output content",
        );
        assertThat(
          outputContentMap.get("./web/client").build(),
          eqLongStr(`import { GetCommentsRequestBody, GetCommentsResponse, GET_COMMENTS } from '../interface/get_comments';
import { WebClientInterface, WebClientOptions } from '@selfage/service_descriptor/client_interface';

export function getComments(
  client: WebClientInterface,
  body: GetCommentsRequestBody,
  options?: WebClientOptions,
): Promise<GetCommentsResponse> {
  return client.send(
    {
      descriptor: GET_COMMENTS,
      body,
    },
    options,
  );
}
`),
          "output web client content",
        );
        assertThat(
          outputContentMap.get("./backend/handler").build(),
          eqLongStr(`import { GetCommentsRequestBody, GET_COMMENTS, GetCommentsResponse } from '../interface/get_comments';
import { WebHandlerInterface } from '@selfage/service_descriptor/handler_interface';

export abstract class GetCommentsHandlerInterface implements WebHandlerInterface {
  public descriptor = GET_COMMENTS;
  public abstract handle(
    loggingPrefix: string,
    body: GetCommentsRequestBody,
  ): Promise<GetCommentsResponse>;
}
`),
          "output handler content",
        );
      },
    },
    {
      name: "GetHistoryService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(
            loggingPrefix: string,
            typeName: string,
            importPath?: string,
          ): Definition {
            this.called += 1;
            switch (typeName) {
              case "GetHistoryRequestBody":
                assertThat(importPath, eq("./request"), `importPath`);
                return {
                  kind: "Message",
                  name: "GetHistoryRequestBody",
                  fields: [],
                };
              case "GetHistoryResponse":
                assertThat(importPath, eq("./response"), `importPath`);
                return {
                  kind: "Message",
                  name: "GetHistoryResponse",
                  fields: [],
                };
              default:
                throw new Error(`Unexpected type ${typeName}.`);
            }
          }
        })();
        let descriptorContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_history",
        );
        let clientContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_history",
          "./web/client",
        );
        let handlerContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/get_history",
          "./backend/handler",
        );

        // Execute
        generateRemoteCall(
          "./interface/get_history",
          {
            name: "GetHistory",
            path: "/get_history",
            sessionKey: "s",
            body: "GetHistoryRequestBody",
            importBody: "./request",
            response: "GetHistoryResponse",
            importResponse: "./response",
          },
          "web",
          mockDefinitionResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(2), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_history").build(),
          eqLongStr(`import { GET_HISTORY_REQUEST_BODY } from '../request';
import { GET_HISTORY_RESPONSE } from '../response';
import { WebRemoteCallDescriptor } from '@selfage/service_descriptor';

export let GET_HISTORY: WebRemoteCallDescriptor = {
  name: "GetHistory",
  path: "/get_history",
  body: {
    messageType: GET_HISTORY_REQUEST_BODY,
  },
  sessionKey: "s",
  response: {
    messageType: GET_HISTORY_RESPONSE,
  },
}
`),
          "output content",
        );
        assertThat(
          outputContentMap.get("./web/client").build(),
          eqLongStr(`import { GetHistoryRequestBody } from '../request';
import { GetHistoryResponse } from '../response';
import { GET_HISTORY } from '../interface/get_history';
import { WebClientInterface, WebClientOptions } from '@selfage/service_descriptor/client_interface';

export function getHistory(
  client: WebClientInterface,
  body: GetHistoryRequestBody,
  options?: WebClientOptions,
): Promise<GetHistoryResponse> {
  return client.send(
    {
      descriptor: GET_HISTORY,
      body,
    },
    options,
  );
}
`),
          "output web client content",
        );
        assertThat(
          outputContentMap.get("./backend/handler").build(),
          eqLongStr(`import { GetHistoryRequestBody } from '../request';
import { GET_HISTORY } from '../interface/get_history';
import { GetHistoryResponse } from '../response';
import { WebHandlerInterface } from '@selfage/service_descriptor/handler_interface';

export abstract class GetHistoryHandlerInterface implements WebHandlerInterface {
  public descriptor = GET_HISTORY;
  public abstract handle(
    loggingPrefix: string,
    body: GetHistoryRequestBody,
    sessionStr: string,
  ): Promise<GetHistoryResponse>;
}
`),
          "output handler content",
        );
      },
    },
    {
      name: "UploadFileService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockDefinitionResolver = new (class extends MockDefinitionResolver {
          public resolve(
            loggingPrefix: string,
            typeName: string,
            importPath?: string,
          ): Definition {
            this.called += 1;
            switch (typeName) {
              case "UploadFileMetadata":
                assertThat(importPath, eq(undefined), `importPath`);
                return {
                  kind: "Message",
                  name: "UploadFileMetadata",
                  fields: [],
                };
              case "UploadFileResponse":
                assertThat(importPath, eq(undefined), `importPath`);
                return {
                  kind: "Message",
                  name: "UploadFileResponse",
                  fields: [],
                };
              default:
                throw new Error(`Unexpected type ${typeName}.`);
            }
          }
        })();
        let descriptorContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/upload_file",
        );
        let clientContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/upload_file",
          "./interface/client",
        );
        let handlerContentBuilder = TsContentBuilder.get(
          outputContentMap,
          "./interface/upload_file",
          "./interface/handler",
        );

        // Execute
        generateRemoteCall(
          "./interface/upload_file",
          {
            name: "UploadFile",
            path: "/upload_file",
            metadata: {
              key: "s",
              type: "UploadFileMetadata",
            },
            body: "bytes",
            response: "UploadFileResponse",
          },
          "node",
          mockDefinitionResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(2), "resolve called");
        assertThat(
          outputContentMap.get("./interface/upload_file").build(),
          eqLongStr(`import { PrimitveTypeForBody, NodeRemoteCallDescriptor } from '@selfage/service_descriptor';

export let UPLOAD_FILE: NodeRemoteCallDescriptor = {
  name: "UploadFile",
  path: "/upload_file",
  body: {
    primitiveType: PrimitveTypeForBody.BYTES,
  },
  metadata: {
    key: "s",
    type: UPLOAD_FILE_METADATA,
  },
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
}
`),
          "output content",
        );
        assertThat(
          outputContentMap.get("./interface/client").build(),
          eqLongStr(`import { UploadFileMetadata, UploadFileResponse, UPLOAD_FILE } from './upload_file';
import { NodeClientInterface, NodeClientOptions } from '@selfage/service_descriptor/client_interface';

export function uploadFile(
  client: NodeClientInterface,
  body: Blob,
  metadata: UploadFileMetadata,
  options?: NodeClientOptions,
): Promise<UploadFileResponse> {
  return client.send(
    {
      descriptor: UPLOAD_FILE,
      body,
      metadata,
    },
    options,
  );
}
`),
          "output node client content",
        );
        assertThat(
          outputContentMap.get("./interface/handler").build(),
          eqLongStr(`import { Readable } from 'stream';
import { UploadFileMetadata, UPLOAD_FILE, UploadFileResponse } from './upload_file';
import { NodeHandlerInterface } from '@selfage/service_descriptor/handler_interface';

export abstract class UploadFileHandlerInterface implements NodeHandlerInterface {
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadFileMetadata,
  ): Promise<UploadFileResponse>;
}
`),
          "output handler content",
        );
      },
    },
  ],
});
