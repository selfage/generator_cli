import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';
import { UserInfo, USER_INFO } from './user_info';
import { CreditCard, CREDIT_CARD } from './sub/credit_card';

export interface User {
  id?: string,
  userInfo?: UserInfo,
  creditCards?: Array<CreditCard>,
}

export let USER: MessageDescriptor<User> = {
  name: 'User',
  fields: [{
    name: 'id',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'userInfo',
    index: 2,
    messageType: USER_INFO,
  }, {
    name: 'creditCards',
    index: 3,
    messageType: CREDIT_CARD,
    isArray: true,
  }],
};
