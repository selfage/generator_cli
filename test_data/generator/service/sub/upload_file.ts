import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface UploadFileRequestMetadata {
  fileName?: string,
}

export let UPLOAD_FILE_REQUEST_METADATA: MessageDescriptor<UploadFileRequestMetadata> = {
  name: 'UploadFileRequestMetadata',
  fields: [{
    name: 'fileName',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface UploadFileResponse {
  bytesSent?: number,
  success?: boolean,
}

export let UPLOAD_FILE_RESPONSE: MessageDescriptor<UploadFileResponse> = {
  name: 'UploadFileResponse',
  fields: [{
    name: 'bytesSent',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'success',
    index: 2,
    primitiveType: PrimitiveType.BOOLEAN,
  }],
};
