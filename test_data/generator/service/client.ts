import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { GET_COMMENTS, UPLOAD_FILE } from './service';
import { NodeClientInterface, NodeClientOptions, WebClientInterface, WebClientOptions } from '@selfage/service_descriptor/client_interface';
import { UploadFileRequestMetadata, UploadFileResponse } from './sub/upload_file';

export function getComments(
  client: NodeClientInterface,
  body: GetCommentsRequest,
  options?: NodeClientOptions,
): Promise<GetCommentsResponse> {
  return client.send(
    {
      descriptor: GET_COMMENTS,
      body,
    },
    options,
  );
}

export function uploadFile(
  client: WebClientInterface,
  body: Blob,
  metadata: UploadFileRequestMetadata,
  options?: WebClientOptions,
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
