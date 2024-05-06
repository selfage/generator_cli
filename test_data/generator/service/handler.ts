import { ServiceHandlerInterface } from '@selfage/service_descriptor/service_handler_interface';
import { GET_COMMENTS, UPLOAD_FILE } from './service';
import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { Readable } from 'stream';
import { UploadFileResponse } from './sub/upload_file';

export abstract class GetCommentsHandlerInterface implements ServiceHandlerInterface {
  public descriptor = GET_COMMENTS;
  public abstract handle(
    loggingPrefix: string,
    body: GetCommentsRequest,
  ): Promise<GetCommentsResponse>;
}

export abstract class UploadFileHandlerInterface implements ServiceHandlerInterface {
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    loggingPrefix: string,
    body: Readable,
  ): Promise<UploadFileResponse>;
}
