import { Definition } from "./definition";
import { MockMessageResolver } from "./message_resolver_mock";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { generateRemoteCall } from "./service_generator";
import { assertThat, containStr, eq, eqLongStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ServiceGeneratorTest",
  cases: [
    {
      name: "GetCommentsService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {
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
                  message: { name: "GetCommentsRequestBody", fields: [] },
                };
              case "GetCommentsResponse":
                assertThat(importPath, eq(undefined), `importPath`);
                return { message: { name: "GetCommentsResponse", fields: [] } };
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
          mockMessageResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockMessageResolver.called, eq(2), "resolve called");
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
import { WebServiceClientInterface, WebServiceClientOptions } from '@selfage/service_descriptor/client_interface';

export function getComments(
  client: WebServiceClientInterface,
  body: GetCommentsRequestBody,
  options?: WebServiceClientOptions,
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
        let mockMessageResolver = new (class extends MockMessageResolver {
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
                  message: { name: "GetHistoryRequestBody", fields: [] },
                };
              case "GetHistoryResponse":
                assertThat(importPath, eq("./response"), `importPath`);
                return { message: { name: "GetHistoryResponse", fields: [] } };
              case "UserSession":
                assertThat(importPath, eq("./user_session"), `importPath`);
                return { message: { name: "UserSession", fields: [] } };
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
            auth: {
              key: "s",
              type: "UserSession",
              import: "./user_session",
            },
            body: "GetHistoryRequestBody",
            importBody: "./request",
            response: "GetHistoryResponse",
            importResponse: "./response",
          },
          "web",
          mockMessageResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockMessageResolver.called, eq(3), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_history").build(),
          eqLongStr(`import { GET_HISTORY_REQUEST_BODY } from '../request';
import { USER_SESSION } from '../user_session';
import { GET_HISTORY_RESPONSE } from '../response';
import { WebRemoteCallDescriptor } from '@selfage/service_descriptor';

export let GET_HISTORY: WebRemoteCallDescriptor = {
  name: "GetHistory",
  path: "/get_history",
  body: {
    messageType: GET_HISTORY_REQUEST_BODY,
  },
  auth: {
    key: "s",
    type: USER_SESSION
  },
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
import { WebServiceClientInterface, WebServiceClientOptions } from '@selfage/service_descriptor/client_interface';

export function getHistory(
  client: WebServiceClientInterface,
  body: GetHistoryRequestBody,
  options?: WebServiceClientOptions,
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
import { UserSession } from '../user_session';
import { GET_HISTORY } from '../interface/get_history';
import { GetHistoryResponse } from '../response';
import { WebHandlerInterface } from '@selfage/service_descriptor/handler_interface';

export abstract class GetHistoryHandlerInterface implements WebHandlerInterface {
  public descriptor = GET_HISTORY;
  public abstract handle(
    loggingPrefix: string,
    body: GetHistoryRequestBody,
    auth: UserSession,
  ): Promise<GetHistoryResponse>;
}
`),
          "output handler content",
        );
      },
    },
    {
      name: "GetHistoryServiceWithExternalUserSession",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {
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
                  message: { name: "GetHistoryRequestBody", fields: [] },
                };
              case "GetHistoryResponse":
                assertThat(importPath, eq("./response"), `importPath`);
                return { message: { name: "GetHistoryResponse", fields: [] } };
              case "UserSession":
                assertThat(
                  importPath,
                  eq("@package/user_session"),
                  `importPath`,
                );
                return { message: { name: "UserSession", fields: [] } };
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
            auth: {
              key: "s",
              type: "UserSession",
              import: "@package/user_session",
            },
            body: "GetHistoryRequestBody",
            importBody: "./request",
            response: "GetHistoryResponse",
            importResponse: "./response",
          },
          "web",
          mockMessageResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockMessageResolver.called, eq(3), "resolve called");
        assertThat(
          outputContentMap.get("./interface/get_history").build(),
          containStr("import { USER_SESSION } from '@package/user_session';"),
          "output content",
        );
        assertThat(
          outputContentMap.get("./backend/handler").build(),
          containStr("import { UserSession } from '@package/user_session';"),
          "output handler content",
        );
      },
    },
    {
      name: "UploadFileService",
      execute: () => {
        // Prepare
        let outputContentMap = new Map<string, OutputContentBuilder>();
        let mockMessageResolver = new (class extends MockMessageResolver {
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
                  message: { name: "UploadFileMetadata", fields: [] },
                };
              case "UploadFileResponse":
                assertThat(importPath, eq(undefined), `importPath`);
                return { message: { name: "UploadFileResponse", fields: [] } };
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
          mockMessageResolver,
          descriptorContentBuilder,
          clientContentBuilder,
          handlerContentBuilder,
        );

        // Verify
        assertThat(mockMessageResolver.called, eq(2), "resolve called");
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
import { NodeServiceClientInterface, NodeServiceClientOptions } from '@selfage/service_descriptor/client_interface';

export function uploadFile(
  client: NodeServiceClientInterface,
  body: Blob,
  metadata: UploadFileMetadata,
  options?: NodeServiceClientOptions,
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
          "output web client content",
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
