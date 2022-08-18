import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export interface UploadFileRequestSide {
  fileName?: string,
}

export let UPLOAD_FILE_REQUEST_SIDE: MessageDescriptor<UploadFileRequestSide> = {
  name: 'UploadFileRequestSide',
  fields: [
    {
      name: 'fileName',
      primitiveType: PrimitiveType.STRING,
    },
  ]
};

export interface UploadFileResponse {
  bytesSent?: number,
  success?: boolean,
}

export let UPLOAD_FILE_RESPONSE: MessageDescriptor<UploadFileResponse> = {
  name: 'UploadFileResponse',
  fields: [
    {
      name: 'bytesSent',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'success',
      primitiveType: PrimitiveType.BOOLEAN,
    },
  ]
};
