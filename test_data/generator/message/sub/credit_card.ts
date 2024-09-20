import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface CreditCard {
  CardNumber?: number,
}

export let CREDIT_CARD: MessageDescriptor<CreditCard> = {
  name: 'CreditCard',
  fields: [{
    name: 'CardNumber',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
