import { MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export interface CreditCard {
  cardNumber?: number,
}

export let CREDIT_CARD: MessageDescriptor<CreditCard> = {
  name: 'CreditCard',
  fields: [
    {
      name: 'cardNumber',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
