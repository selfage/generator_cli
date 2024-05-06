import { Definition } from "./definition";
import { MockTypeLoader } from "./mocks";
import { OutputContentBuilder } from "./output_content_builder";
import { generateServiceDescriptor } from "./service_generator";
import { assertThat, eq, containStr } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "ServiceGeneratorTest",
  cases: [
    {
      name: "GetCommentsService",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();
        let mockTypeLoader = new (class extends MockTypeLoader {
          public getDefinition(
            typeName: string,
            importPath?: string
          ): Definition {
            this.called.increment("getDefinition");
            assertThat(typeName, eq("GetCommentsRequestBody"), `typeName`);
            assertThat(importPath, eq(undefined), `importPath`);
            return { name: "GetCommentsRequestBody", message: { fields: [] } };
          }
        })();

        // Execute
        generateServiceDescriptor(
          "./interface/get_comments",
          "GetComments",
          {
            path: "/get_comments",
            body: "GetCommentsRequestBody",
            response: "GetCommentsResponse",
            outputWebClient: "../web/client",
            outputHandler: "../backend/handler",
          },
          mockTypeLoader,
          contentMap
        );

        // Verify
        assertThat(
          mockTypeLoader.called.get("getDefinition"),
          eq(1),
          "getDefinition called"
        );
        assertThat(
          contentMap.get("./interface/get_comments").toString(),
          eq(`import { ServiceDescriptor } from '@selfage/service_descriptor';

export let GET_COMMENTS: ServiceDescriptor = {
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
          "output content"
        );
        assertThat(
          contentMap.get("./web/client").toString(),
          eq(`import { WebServiceClientInterface } from '@selfage/service_descriptor/web_service_client_interface';
import { GetCommentsRequestBody, GetCommentsResponse, GET_COMMENTS } from '../interface/get_comments';

export function getComments(
  client: WebServiceClientInterface,
  body: GetCommentsRequestBody,
): Promise<GetCommentsResponse> {
  return client.send({
    descriptor: GET_COMMENTS,
    body,
  });
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./backend/handler").toString(),
          eq(`import { ServiceHandlerInterface } from '@selfage/service_descriptor/service_handler_interface';
import { GET_COMMENTS, GetCommentsRequestBody, GetCommentsResponse } from '../interface/get_comments';

export abstract class GetCommentsHandlerInterface implements ServiceHandlerInterface {
  public descriptor = GET_COMMENTS;
  public abstract handle(
    loggingPrefix: string,
    body: GetCommentsRequestBody,
  ): Promise<GetCommentsResponse>;
}
`),
          "output handler content"
        );
      },
    },
    {
      name: "GetHistoryService",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();
        let mockTypeLoader = new (class extends MockTypeLoader {
          public getDefinition(
            typeName: string,
            importPath?: string
          ): Definition {
            this.called.increment("getDefinition");
            assertThat(typeName, eq("GetHistoryRequestBody"), `typeName`);
            assertThat(importPath, eq("./request"), `importPath`);
            return { name: "GetHistoryRequestBody", message: { fields: [] } };
          }
        })();

        // Execute
        generateServiceDescriptor(
          "./interface/get_history",
          "GetHistory",
          {
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
            outputWebClient: "../web/client",
            outputHandler: "../backend/handler",
          },
          mockTypeLoader,
          contentMap
        );

        // Verify
        assertThat(
          mockTypeLoader.called.get("getDefinition"),
          eq(1),
          "getDefinition called"
        );
        assertThat(
          contentMap.get("./interface/get_history").toString(),
          eq(`import { ServiceDescriptor } from '@selfage/service_descriptor';
import { GET_HISTORY_REQUEST_BODY } from './request';
import { USER_SESSION } from './user_session';
import { GET_HISTORY_RESPONSE } from './response';

export let GET_HISTORY: ServiceDescriptor = {
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
          "output content"
        );
        assertThat(
          contentMap.get("./web/client").toString(),
          eq(`import { WebServiceClientInterface } from '@selfage/service_descriptor/web_service_client_interface';
import { GetHistoryRequestBody } from '../interface/request';
import { GetHistoryResponse } from '../interface/response';
import { GET_HISTORY } from '../interface/get_history';

export function getHistory(
  client: WebServiceClientInterface,
  body: GetHistoryRequestBody,
): Promise<GetHistoryResponse> {
  return client.send({
    descriptor: GET_HISTORY,
    body,
  });
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./backend/handler").toString(),
          eq(`import { ServiceHandlerInterface } from '@selfage/service_descriptor/service_handler_interface';
import { GET_HISTORY } from '../interface/get_history';
import { GetHistoryRequestBody } from '../interface/request';
import { UserSession } from '../interface/user_session';
import { GetHistoryResponse } from '../interface/response';

export abstract class GetHistoryHandlerInterface implements ServiceHandlerInterface {
  public descriptor = GET_HISTORY;
  public abstract handle(
    loggingPrefix: string,
    body: GetHistoryRequestBody,
    auth: UserSession,
  ): Promise<GetHistoryResponse>;
}
`),
          "output handler content"
        );
      },
    },
    {
      name: "GetHistoryServiceWithExternalUserSession",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();
        let mockTypeLoader = new (class extends MockTypeLoader {
          public getDefinition(
            typeName: string,
            importPath?: string
          ): Definition {
            this.called.increment("getDefinition");
            assertThat(typeName, eq("GetHistoryRequestBody"), `typeName`);
            assertThat(importPath, eq("./request"), `importPath`);
            return { name: "GetHistoryRequestBody", message: { fields: [] } };
          }
        })();

        // Execute
        generateServiceDescriptor(
          "./interface/get_history",
          "GetHistory",
          {
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
            outputWebClient: "../web/client",
            outputHandler: "../backend/handler",
          },
          mockTypeLoader,
          contentMap
        );

        // Verify
        assertThat(
          mockTypeLoader.called.get("getDefinition"),
          eq(1),
          "getDefinition called"
        );
        assertThat(
          contentMap.get("./interface/get_history").toString(),
          containStr("import { USER_SESSION } from '@package/user_session';"),
          "output content"
        );
        assertThat(
          contentMap.get("./backend/handler").toString(),
          containStr("import { UserSession } from '@package/user_session';"),
          "output handler content"
        );
      },
    },
    {
      name: "UploadFileService",
      execute: () => {
        // Prepare
        let contentMap = new Map<string, OutputContentBuilder>();

        // Execute
        generateServiceDescriptor(
          "./interface/upload_file",
          "UploadFile",
          {
            path: "/upload_file",
            metadata: {
              key: "s",
              type: "UploadFileMetadata",
            },
            body: "bytes",
            response: "UploadFileResponse",
            outputWebClient: "./client",
            outputHandler: "./handler",
          },
          undefined,
          contentMap
        );

        // Verify
        assertThat(
          contentMap.get("./interface/upload_file").toString(),
          eq(`import { ServiceDescriptor, PrimitveTypeForBody } from '@selfage/service_descriptor';

export let UPLOAD_FILE: ServiceDescriptor = {
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
          "output content"
        );
        assertThat(
          contentMap.get("./interface/client").toString(),
          eq(`import { WebServiceClientInterface } from '@selfage/service_descriptor/web_service_client_interface';
import { UploadFileMetadata, UploadFileResponse, UPLOAD_FILE } from './upload_file';

export function uploadFile(
  client: WebServiceClientInterface,
  body: Blob,
  metadata: UploadFileMetadata,
): Promise<UploadFileResponse> {
  return client.send({
    descriptor: UPLOAD_FILE,
    body,
    metadata,
  });
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./interface/handler").toString(),
          eq(`import { ServiceHandlerInterface } from '@selfage/service_descriptor/service_handler_interface';
import { UPLOAD_FILE, UploadFileMetadata, UploadFileResponse } from './upload_file';
import { Readable } from 'stream';

export abstract class UploadFileHandlerInterface implements ServiceHandlerInterface {
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadFileMetadata,
  ): Promise<UploadFileResponse>;
}
`),
          "output handler content"
        );
      },
    },
  ],
});
