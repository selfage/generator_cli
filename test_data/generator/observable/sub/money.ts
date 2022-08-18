import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export interface Money {
  integral?: number,
  nano?: number,
}

export let MONEY: MessageDescriptor<Money> = {
  name: 'Money',
  fields: [
    {
      name: 'integral',
      primitiveType: PrimitiveType.NUMBER,
    },
    {
      name: 'nano',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
