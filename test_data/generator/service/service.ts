import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { ServiceDescriptor, PrimitveTypeForBody } from '@selfage/service_descriptor';
import { GET_COMMENTS_REQUEST, GET_COMMENTS_RESPONSE } from './sub/get_comments';
import { UPLOAD_FILE_RESPONSE } from './sub/upload_file';

export interface UserSession {
  userId?: string,
  expirationTime?: number,
}

export let USER_SESSION: MessageDescriptor<UserSession> = {
  name: 'UserSession',
  fields: [
    {
      name: 'userId',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'expirationTime',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};

export let GET_COMMENTS: ServiceDescriptor = {
  name: "GetComments",
  path: "/GetComments",
  body: {
    messageType: GET_COMMENTS_REQUEST,
  },
  response: {
    messageType: GET_COMMENTS_RESPONSE,
  },
}

export let UPLOAD_FILE: ServiceDescriptor = {
  name: "UploadFile",
  path: "/UploadFile",
  body: {
    primitiveType: PrimitveTypeForBody.BYTES,
  },
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
}
