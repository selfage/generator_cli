import { UploadFileRequestMetadata, UploadFileResponse } from './sub/upload_file';
import { UPLOAD_FILE } from './service';
import { ClientRequestInterface } from '@selfage/service_descriptor/client_request_interface';

export function newUploadFileRequest(
  body: Blob,
  metadata: UploadFileRequestMetadata,
): ClientRequestInterface<UploadFileResponse> {
  return {
    descriptor: UPLOAD_FILE,
    body,
      metadata,
  };
}
