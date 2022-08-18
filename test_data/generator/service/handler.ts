import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { ServiceHandler } from '@selfage/service_descriptor';
import { GET_COMMENTS, UserSession, UPLOAD_FILE } from './service';
import { Readable } from 'stream';
import { UploadFileRequestSide, UploadFileResponse } from './sub/upload_file';

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

export interface UploadFileHandlerRequest {
  requestId: string;
  body: Readable;
  userSession: UserSession
  side: UploadFileRequestSide;
}

export abstract class UploadFileHandlerInterface
  implements ServiceHandler<UploadFileHandlerRequest, UploadFileResponse>
{
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    args: UploadFileHandlerRequest
  ): Promise<UploadFileResponse>;
}
