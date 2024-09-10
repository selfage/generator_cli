import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface GetCommentsRequest {
  videoId?: string,
}

export let GET_COMMENTS_REQUEST: MessageDescriptor<GetCommentsRequest> = {
  name: 'GetCommentsRequest',
  fields: [{
    name: 'videoId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface GetCommentsResponse {
  text?: Array<string>,
}

export let GET_COMMENTS_RESPONSE: MessageDescriptor<GetCommentsResponse> = {
  name: 'GetCommentsResponse',
  fields: [{
    name: 'text',
    index: 1,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }],
};
