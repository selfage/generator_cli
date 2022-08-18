import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { UserInfo, USER_INFO } from './user_info';
import { CreditCard, CREDIT_CARD } from './sub/credit_card';

export interface User {
  id?: string,
  userInfo?: UserInfo,
  creditCards?: Array<CreditCard>,
}

export let USER: MessageDescriptor<User> = {
  name: 'User',
  fields: [
    {
      name: 'id',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'userInfo',
      messageType: USER_INFO,
    },
    {
      name: 'creditCards',
      messageType: CREDIT_CARD,
      isArray: true,
    },
  ]
};
