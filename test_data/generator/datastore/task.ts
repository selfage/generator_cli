import { EnumDescriptor, MessageDescriptor, PrimitiveType } from '@selfage/message/descriptor';

export enum Priority {
  HIGH = 1,
  DEFAULT = 2,
}

export let PRIORITY: EnumDescriptor<Priority> = {
  name: 'Priority',
  values: [
    {
      name: 'HIGH',
      value: 1,
    },
    {
      name: 'DEFAULT',
      value: 2,
    },
  ]
}

export interface Payload {
  operation?: string,
  userId?: string,
}

export let PAYLOAD: MessageDescriptor<Payload> = {
  name: 'Payload',
  fields: [
    {
      name: 'operation',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'userId',
      primitiveType: PrimitiveType.STRING,
    },
  ]
};

export interface Task {
  id?: string,
  payload?: Payload,
  tags?: Array<string>,
  done?: boolean,
  priority?: Priority,
  created?: number,
}

export let TASK: MessageDescriptor<Task> = {
  name: 'Task',
  fields: [
    {
      name: 'id',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'payload',
      messageType: PAYLOAD,
    },
    {
      name: 'tags',
      primitiveType: PrimitiveType.STRING,
      isArray: true,
    },
    {
      name: 'done',
      primitiveType: PrimitiveType.BOOLEAN,
    },
    {
      name: 'priority',
      enumType: PRIORITY,
    },
    {
      name: 'created',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
