import { EnumDescriptor, MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export enum Color {
  RED = 10,
  GREEN = 2,
  BLUE = 1,
}

export let COLOR: EnumDescriptor<Color> = {
  name: 'Color',
  values: [
    {
      name: 'RED',
      value: 10,
    },
    {
      name: 'GREEN',
      value: 2,
    },
    {
      name: 'BLUE',
      value: 1,
    },
  ]
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
  fields: [
    {
      name: 'isPaid',
      primitiveType: PrimitiveType.BOOLEAN,
    },
    {
      name: 'paidSince',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'nickname',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'nicknameHistory',
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
    {
      name: 'backgroundColor',
      enumType: COLOR,
    },
    {
      name: 'colorHistory',
      enumType: COLOR,
      isArray: true,
    },
  ]
};
