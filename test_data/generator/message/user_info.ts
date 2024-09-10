import { EnumDescriptor, PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export enum Color {
  RED = 10,
  GREEN = 2,
  BLUE = 1,
}

export let COLOR: EnumDescriptor<Color> = {
  name: 'Color',
  values: [{
    name: 'RED',
    value: 10,
  }, {
    name: 'GREEN',
    value: 2,
  }, {
    name: 'BLUE',
    value: 1,
  }]
}

export interface UserInfo {
  isPaid?: boolean,
  paidSince?: number,
  nickname?: string,
  nicknameHistory?: Array<string>,
  backgroundColor?: Color,
  colorHistory?: Array<Color>,
}

export let USER_INFO: MessageDescriptor<UserInfo> = {
  name: 'UserInfo',
  fields: [{
    name: 'isPaid',
    index: 1,
    primitiveType: PrimitiveType.BOOLEAN,
  }, {
    name: 'paidSince',
    index: 2,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'nickname',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'nicknameHistory',
    index: 4,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'backgroundColor',
    index: 5,
    enumType: COLOR,
  }, {
    name: 'colorHistory',
    index: 6,
    enumType: COLOR,
    isArray: true,
  }],
};
