import { Definition } from "./definition";
import { MockDefinitionResolver } from "./definition_resolver_mock";
import {
  OutputContentBuilder,
} from "./output_content_builder";
import {
  generateRemoteCallsGroup,
  generateService,
} from "./service_generator";
import { assertThat, eq, eqLongStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ServiceGeneratorTest",
  cases: [
    {
      name: "CommentWebService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateService(
          "./interface/comment_service",
          {
            kind: "Service",
            name: "CommentWebService",
            path: "/comment",
          },
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./interface/comment_service").build(),
          eqLongStr(`import { ServiceDescriptor } from '@selfage/service_descriptor';

export let COMMENT_WEB_SERVICE: ServiceDescriptor = {
  name: "CommentWebService",
  path: "/comment",
}
`),
          "output content",
        );
      },
    },
    {
      name: "CommentNodeService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateService(
          "./interface/comment_service",
          {
            kind: "Service",
            name: "CommentNodeService",
            path: "/comment",
          },
          outputContentMap,
        );

        // Verify
        assertThat(
          outputContentMap.get("./interface/comment_service").build(),
          eqLongStr(`import { ServiceDescriptor } from '@selfage/service_descriptor';

export let COMMENT_NODE_SERVICE: ServiceDescriptor = {
  name: "CommentNodeService",
  path: "/comment",
}
`),
          "output content",
        );
      },
    },
    {
      name: "GetCommentsRemoteCall",
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
              case "CommentWebService":
                assertThat(
                  importPath,
                  eq("./comment_service"),
                  `importPath for CommentWebService`,
                );
                return {
                  kind: "Service",
                  name: "CommentWebService",
                  path: "/comment",
                };
              case "GetCommentsRequestBody":
                assertThat(
                  importPath,
                  eq(undefined),
                  `importPath for GetCommentsRequestBody`,
                );
                return {
                  kind: "Message",
                  name: "GetCommentsRequestBody",
                  fields: [],
                };
              case "GetCommentsResponse":
                assertThat(
                  importPath,
                  eq(undefined),
                  `importPath for GetCommentsResponse`,
                );
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

        // Execute
        generateRemoteCallsGroup(
          "./interface/get_comments",
          {
            kind: "RemoteCallsGroup",
            name: "CommentWebCalls",
            service: "CommentWebService",
            importService: "./comment_service",
            calls: [
              {
                name: "GetComments",
                path: "/get_comments",
                body: "GetCommentsRequestBody",
                response: "GetCommentsResponse",
              },
            ],
            outputClient: "./web/client",
            outputHandler: "./web/handler",
          },
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(3), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_comments").build(),
          eqLongStr(`import { COMMENT_WEB_SERVICE } from '../comment_service';
import { RemoteCallDescriptor } from '@selfage/service_descriptor';

export let GET_COMMENTS: RemoteCallDescriptor = {
  name: "GetComments",
  service: COMMENT_WEB_SERVICE,
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
import { ClientRequestInterface } from '@selfage/service_descriptor/client_request_interface';

export function newGetCommentsRequest(
  body: GetCommentsRequestBody,
): ClientRequestInterface<GetCommentsResponse> {
  return {
    descriptor: GET_COMMENTS,
    body,
  };
}
`),
          "output client content",
        );
        assertThat(
          outputContentMap.get("./web/handler").build(),
          eqLongStr(`import { GetCommentsRequestBody, GET_COMMENTS, GetCommentsResponse } from '../interface/get_comments';
import { RemoteCallHandlerInterface } from '@selfage/service_descriptor/remote_call_handler_interface';

export abstract class GetCommentsHandlerInterface implements RemoteCallHandlerInterface {
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
      name: "GetHistoryRemoteCall",
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
              case "HistoryNodeSerivce":
                assertThat(
                  importPath,
                  eq("./history_service"),
                  `importPath for HistoryNodeSerivce`,
                );
                return {
                  kind: "Service",
                  name: "HistoryNodeSerivce",
                  path: "/history",
                };
              case "GetHistoryRequestBody":
                assertThat(
                  importPath,
                  eq("./request"),
                  `importPath for GetHistoryRequestBody`,
                );
                return {
                  kind: "Message",
                  name: "GetHistoryRequestBody",
                  fields: [],
                };
              case "GetHistoryResponse":
                assertThat(
                  importPath,
                  eq("./response"),
                  `importPath for GetHistoryResponse`,
                );
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

        // Execute
        generateRemoteCallsGroup(
          "./interface/get_history",
          {
            kind: "RemoteCallsGroup",
            name: "HistoryNodeCalls",
            service: "HistoryNodeSerivce",
            importService: "./history_service",
            calls: [
              {
                name: "GetHistory",
                path: "/get_history",
                authKey: "s",
                body: "GetHistoryRequestBody",
                importBody: "./request",
                response: "GetHistoryResponse",
                importResponse: "./response",
              },
            ],
            outputClient: "./node/client",
            outputHandler: "./node/handler",
          },
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(3), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_history").build(),
          eqLongStr(`import { HISTORY_NODE_SERIVCE } from '../history_service';
import { GET_HISTORY_REQUEST_BODY } from '../request';
import { GET_HISTORY_RESPONSE } from '../response';
import { RemoteCallDescriptor } from '@selfage/service_descriptor';

export let GET_HISTORY: RemoteCallDescriptor = {
  name: "GetHistory",
  service: HISTORY_NODE_SERIVCE,
  path: "/get_history",
  body: {
    messageType: GET_HISTORY_REQUEST_BODY,
  },
  authKey: "s",
  response: {
    messageType: GET_HISTORY_RESPONSE,
  },
}
`),
          "output content",
        );
        assertThat(
          outputContentMap.get("./node/client").build(),
          eqLongStr(`import { GetHistoryRequestBody } from '../request';
import { GetHistoryResponse } from '../response';
import { GET_HISTORY } from '../interface/get_history';
import { ClientRequestInterface } from '@selfage/service_descriptor/client_request_interface';

export function newGetHistoryRequest(
  body: GetHistoryRequestBody,
): ClientRequestInterface<GetHistoryResponse> {
  return {
    descriptor: GET_HISTORY,
    body,
  };
}
`),
          "output client content",
        );
        assertThat(
          outputContentMap.get("./node/handler").build(),
          eqLongStr(`import { GetHistoryRequestBody } from '../request';
import { GET_HISTORY } from '../interface/get_history';
import { GetHistoryResponse } from '../response';
import { RemoteCallHandlerInterface } from '@selfage/service_descriptor/remote_call_handler_interface';

export abstract class GetHistoryHandlerInterface implements RemoteCallHandlerInterface {
  public descriptor = GET_HISTORY;
  public abstract handle(
    loggingPrefix: string,
    body: GetHistoryRequestBody,
    authStr: string,
  ): Promise<GetHistoryResponse>;
}
`),
          "output handler content",
        );
      },
    },
    {
      name: "UploadFileRemoteCall",
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
              case "UploadFileService":
                assertThat(
                  importPath,
                  eq(undefined),
                  `importPath for UploadFileService`,
                );
                return {
                  kind: "Service",
                  name: "UploadFileService",
                  path: "/upload",
                };
              case "UploadFileMetadata":
                assertThat(
                  importPath,
                  eq(undefined),
                  `importPath for UploadFileMetadata`,
                );
                return {
                  kind: "Message",
                  name: "UploadFileMetadata",
                  fields: [],
                };
              case "UploadFileResponse":
                assertThat(
                  importPath,
                  eq(undefined),
                  `importPath for UploadFileResponse`,
                );
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

        // Execute
        generateRemoteCallsGroup(
          "./interface/upload_file",
          {
            kind: "RemoteCallsGroup",
            name: "UploadFileGroup",
            service: "UploadFileService",
            calls: [
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
            ],
            outputClient: "./interface/client",
            outputHandler: "./interface/handler",
          },
          mockDefinitionResolver,
          outputContentMap,
        );

        // Verify
        assertThat(mockDefinitionResolver.called, eq(3), "resolve called");
        assertThat(
          outputContentMap.get("./interface/upload_file").build(),
          eqLongStr(`import { PrimitveTypeForBody, RemoteCallDescriptor } from '@selfage/service_descriptor';

export let UPLOAD_FILE: RemoteCallDescriptor = {
  name: "UploadFile",
  service: UPLOAD_FILE_SERVICE,
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
import { ClientRequestInterface } from '@selfage/service_descriptor/client_request_interface';

export function newUploadFileRequest(
  body: Blob,
  metadata: UploadFileMetadata,
): ClientRequestInterface<UploadFileResponse> {
  return {
    descriptor: UPLOAD_FILE,
    body,
      metadata,
  };
}
`),
          "output client content",
        );
        assertThat(
          outputContentMap.get("./interface/handler").build(),
          eqLongStr(`import { Readable } from 'stream';
import { UploadFileMetadata, UPLOAD_FILE, UploadFileResponse } from './upload_file';
import { RemoteCallHandlerInterface } from '@selfage/service_descriptor/remote_call_handler_interface';

export abstract class UploadFileHandlerInterface implements RemoteCallHandlerInterface {
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
