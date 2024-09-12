import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { GET_COMMENTS_REQUEST, GET_COMMENTS_RESPONSE } from './sub/get_comments';
import { NodeRemoteCallDescriptor, PrimitveTypeForBody, WebRemoteCallDescriptor } from '@selfage/service_descriptor';
import { UPLOAD_FILE_REQUEST_METADATA, UPLOAD_FILE_RESPONSE } from './sub/upload_file';

export interface UserSession {
  userId?: string,
  expirationTime?: number,
}

export let USER_SESSION: MessageDescriptor<UserSession> = {
  name: 'UserSession',
  fields: [{
    name: 'userId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'expirationTime',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export let GET_COMMENTS: NodeRemoteCallDescriptor = {
  name: "GetComments",
  path: "/GetComments",
  body: {
    messageType: GET_COMMENTS_REQUEST,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
}

export let UPLOAD_FILE: WebRemoteCallDescriptor = {
  name: "UploadFile",
  path: "/UploadFile",
  body: {
    primitiveType: PrimitveTypeForBody.BYTES,
  },
  metadata: {
    key: "sd",
    type: UPLOAD_FILE_REQUEST_METADATA,
  },
  sessionKey: "su",
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
}
