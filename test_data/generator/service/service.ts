import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { ClientType } from '@selfage/service_descriptor/client_type';
import { HttpsServiceDescriptor, PrimitveTypeForBody, RemoteCallDescriptor } from '@selfage/service_descriptor';
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

export let WEB_SERVICE: HttpsServiceDescriptor = {
  name: "WebService",
  clientType: ClientType.WEB,
  protocol: "https",
  port: 443,
}

export let UPLOAD_FILE: RemoteCallDescriptor = {
  name: "UploadFile",
  service: WEB_SERVICE,
  path: "/UploadFile",
  body: {
    primitiveType: PrimitveTypeForBody.BYTES,
  },
  metadata: {
    key: "sd",
    type: UPLOAD_FILE_REQUEST_METADATA,
  },
  authKey: "su",
  response: {
    messageType: UPLOAD_FILE_RESPONSE,
  },
}
