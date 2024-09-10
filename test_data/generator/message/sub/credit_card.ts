import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface CreditCard {
  cardNumber?: number,
}

export let CREDIT_CARD: MessageDescriptor<CreditCard> = {
  name: 'CreditCard',
  fields: [{
    name: 'cardNumber',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }],
};
