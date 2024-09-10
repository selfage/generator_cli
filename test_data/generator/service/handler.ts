import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { GET_COMMENTS, UserSession, UPLOAD_FILE } from './service';
import { NodeHandlerInterface, WebHandlerInterface } from '@selfage/service_descriptor/handler_interface';
import { Readable } from 'stream';
import { UploadFileRequestMetadata, UploadFileResponse } from './sub/upload_file';

export abstract class GetCommentsHandlerInterface implements NodeHandlerInterface {
  public descriptor = GET_COMMENTS;
  public abstract handle(
    loggingPrefix: string,
    body: GetCommentsRequest,
  ): Promise<GetCommentsResponse>;
}

export abstract class UploadFileHandlerInterface implements WebHandlerInterface {
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadFileRequestMetadata,
    auth: UserSession,
  ): Promise<UploadFileResponse>;
}
