import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface User {
  username?: string,
  password?: string,
}

export let USER: MessageDescriptor<User> = {
  name: 'User',
  fields: [{
    name: 'username',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'password',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};
