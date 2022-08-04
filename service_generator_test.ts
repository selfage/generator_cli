import { Definition } from "./definition";
import { MockTypeLoader } from "./mocks";
import { OutputContentBuilder } from "./output_content_builder";
import { generateServiceDescriptor } from "./service_generator";
import { assertThat, eq } from "@selfage/test_matcher";
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
            assertThat(typeName, eq("GetCommentsRequest"), `typeName`);
            assertThat(importPath, eq(undefined), `importPath`);
            return { name: "GetCommentsRequest", message: { fields: [] } };
          }
        })();

        // Execute
        generateServiceDescriptor(
          "./interface/get_comments",
          "GetComments",
          {
            path: "/get_comments",
            body: "GetCommentsRequest",
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
    messageType: GET_COMMENTS_REQUEST,
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
          eq(`import { GetCommentsRequest, GetCommentsResponse, GET_COMMENTS } from '../interface/get_comments';

export interface GetCommentsClientRequest {
  body: GetCommentsRequest;
}

export function newGetCommentsServiceRequest(
  request: GetCommentsClientRequest
): WebServiceRequest<GetCommentsClientRequest, GetCommentsResponse> {
  return {
    descriptor: GET_COMMENTS,
    request,
  };
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./backend/handler").toString(),
          eq(`import { GetCommentsRequest, GetCommentsResponse, GET_COMMENTS } from '../interface/get_comments';

export interface GetCommentsHandlerRequest {
  requestId: string;
  body: GetCommentsRequest;
}

export abstract class GetCommentsHandlerInterface
  implements ServiceHandler<GetCommentsHandlerRequest, GetCommentsResponse>
{
  public descriptor = GET_COMMENTS;
  public abstract handle(
    args: GetCommentsHandlerRequest
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
            assertThat(typeName, eq("GetHistoryequest"), `typeName`);
            assertThat(importPath, eq("./request"), `importPath`);
            return { name: "GetCommentsRequest", message: { fields: [] } };
          }
        })();

        // Execute
        generateServiceDescriptor(
          "./interface/get_history",
          "GetHistory",
          {
            path: "/get_history",
            signedUserSession: {
              key: "s",
              type: "UserSession",
              import: "./user_session",
            },
            body: "GetHistoryequest",
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
import { GET_HISTORYEQUEST } from './request';
import { USER_SESSION } from './user_session';
import { GET_HISTORY_RESPONSE } from './response';

export let GET_HISTORY: ServiceDescriptor = {
  name: "GetHistory",
  path: "/get_history",
  body: {
    messageType: GET_HISTORYEQUEST,
  },
  signedUserSession: {
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
          eq(`import { GetHistoryequest } from '../interface/request';
import { GetHistoryResponse } from '../interface/response';
import { GET_HISTORY } from '../interface/get_history';

export interface GetHistoryClientRequest {
  body: GetHistoryequest;
}

export function newGetHistoryServiceRequest(
  request: GetHistoryClientRequest
): WebServiceRequest<GetHistoryClientRequest, GetHistoryResponse> {
  return {
    descriptor: GET_HISTORY,
    request,
  };
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./backend/handler").toString(),
          eq(`import { GetHistoryequest } from '../interface/request';
import { UserSession } from '../interface/user_session';
import { GetHistoryResponse } from '../interface/response';
import { GET_HISTORY } from '../interface/get_history';

export interface GetHistoryHandlerRequest {
  requestId: string;
  body: GetHistoryequest;
  userSession: UserSession
}

export abstract class GetHistoryHandlerInterface
  implements ServiceHandler<GetHistoryHandlerRequest, GetHistoryResponse>
{
  public descriptor = GET_HISTORY;
  public abstract handle(
    args: GetHistoryHandlerRequest
  ): Promise<GetHistoryResponse>;
}
`),
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
          "GetHistory",
          {
            path: "/upload_file",
            side: {
              key: "s",
              type: "UploadFileRequestSide",
            },
            body: "blob",
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

export let GET_HISTORY: ServiceDescriptor = {
  name: "GetHistory",
  path: "/upload_file",
  body: {
    primitiveType: PrimitveTypeForBody.BLOB,
  },
  side: {
    key: "s",
    type: UPLOAD_FILE_REQUEST_SIDE,
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
          eq(`import { UploadFileRequestSide, UploadFileResponse, GET_HISTORY } from './upload_file';

export interface GetHistoryClientRequest {
  body: Blob;
  side: UploadFileRequestSide;
}

export function newGetHistoryServiceRequest(
  request: GetHistoryClientRequest
): WebServiceRequest<GetHistoryClientRequest, UploadFileResponse> {
  return {
    descriptor: GET_HISTORY,
    request,
  };
}
`),
          "output web client content"
        );
        assertThat(
          contentMap.get("./interface/handler").toString(),
          eq(`import { Readable } from 'stream';
import { UploadFileRequestSide, UploadFileResponse, GET_HISTORY } from './upload_file';

export interface GetHistoryHandlerRequest {
  requestId: string;
  body: Readable;
  side: UploadFileRequestSide;
}

export abstract class GetHistoryHandlerInterface
  implements ServiceHandler<GetHistoryHandlerRequest, UploadFileResponse>
{
  public descriptor = GET_HISTORY;
  public abstract handle(
    args: GetHistoryHandlerRequest
  ): Promise<UploadFileResponse>;
}
`),
          "output handler content"
        );
      },
    },
  ],
});
