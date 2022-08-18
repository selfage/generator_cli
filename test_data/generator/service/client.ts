import { GetCommentsRequest, GetCommentsResponse } from './sub/get_comments';
import { WebServiceRequest } from '@selfage/service_descriptor';
import { GET_COMMENTS, UPLOAD_FILE } from './service';
import { UploadFileRequestSide, UploadFileResponse } from './sub/upload_file';

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

export interface UploadFileClientRequest {
  body: Blob;
  side: UploadFileRequestSide;
}

export function newUploadFileServiceRequest(
  request: UploadFileClientRequest
): WebServiceRequest<UploadFileClientRequest, UploadFileResponse> {
  return {
    descriptor: UPLOAD_FILE,
    request,
  };
}
