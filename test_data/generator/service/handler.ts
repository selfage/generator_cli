import { Readable } from 'stream';
import { UploadFileRequestMetadata, UploadFileResponse } from './sub/upload_file';
import { UPLOAD_FILE } from './service';
import { RemoteCallHandlerInterface } from '@selfage/service_descriptor/remote_call_handler_interface';

export abstract class UploadFileHandlerInterface implements RemoteCallHandlerInterface {
  public descriptor = UPLOAD_FILE;
  public abstract handle(
    loggingPrefix: string,
    body: Readable,
    metadata: UploadFileRequestMetadata,
    authStr: string,
  ): Promise<UploadFileResponse>;
}
