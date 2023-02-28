import { WebServiceClientInterface } from '@selfage/service_descriptor/web_service_client_interface';
import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { GET_COMMENTS, UPLOAD_FILE } from './service';
import { UploadFileResponse } from './sub/upload_file';

export function getComments(
  client: WebServiceClientInterface,
  body: GetCommentsRequest,
): Promise<GetCommentsResponse> {
  return client.send({
    descriptor: GET_COMMENTS,
    body,
  });
}

export function uploadFile(
  client: WebServiceClientInterface,
  body: Blob,
): Promise<UploadFileResponse> {
  return client.send({
    descriptor: UPLOAD_FILE,
    body,
  });
}
