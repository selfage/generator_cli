import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export interface OrderDetails {
  category?: string,
}

export let ORDER_DETAILS: MessageDescriptor<OrderDetails> = {
  name: 'OrderDetails',
  fields: [{
    name: 'category',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }],
};

export interface Order {
  accountId?: string,
  orderId?: string,
  status?: string,
  total?: number,
  tags?: Array<string>,
  details?: OrderDetails,
}

export let ORDER: MessageDescriptor<Order> = {
  name: 'Order',
  fields: [{
    name: 'accountId',
    index: 1,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'orderId',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'status',
    index: 3,
    primitiveType: PrimitiveType.STRING,
  }, {
    name: 'total',
    index: 4,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'tags',
    index: 5,
    primitiveType: PrimitiveType.STRING,
    isArray: true,
  }, {
    name: 'details',
    index: 6,
    messageType: ORDER_DETAILS,
  }],
};
