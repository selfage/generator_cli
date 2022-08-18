import { EnumDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { ObservableArray } from '@selfage/observable_array';
import { EventEmitter } from 'events';
import { ObservableDescriptor, ArrayType } from '@selfage/observable/descriptor';
import { Item, ITEM } from './item';

export enum Shop {
  Supermarket = 1,
  Clothing = 2,
}

export let SHOP: EnumDescriptor<Shop> = {
  name: 'Shop',
  values: [
    {
      name: 'Supermarket',
      value: 1,
    },
    {
      name: 'Clothing',
      value: 2,
    },
  ]
}

export interface Cart {
  on(event: 'userId', listener: (newValue: string, oldValue: string) => void): this;
  on(event: 'shop', listener: (newValue: Shop, oldValue: Shop) => void): this;
  on(event: 'coupons', listener: (newValue: Array<string>, oldValue: Array<string>) => void): this;
  on(event: 'items', listener: (newValue: ObservableArray<Item>, oldValue: ObservableArray<Item>) => void): this;
  on(event: 'created', listener: (newValue: number, oldValue: number) => void): this;
  on(event: 'init', listener: () => void): this;
}

export class Cart extends EventEmitter {
  private userId_?: string;
  get userId(): string {
    return this.userId_;
  }
  set userId(value: string) {
    let oldValue = this.userId_;
    if (value === oldValue) {
      return;
    }
    this.userId_ = value;
    this.emit('userId', this.userId_, oldValue);
  }

  private shop_?: Shop;
  get shop(): Shop {
    return this.shop_;
  }
  set shop(value: Shop) {
    let oldValue = this.shop_;
    if (value === oldValue) {
      return;
    }
    this.shop_ = value;
    this.emit('shop', this.shop_, oldValue);
  }

  private coupons_?: Array<string>;
  get coupons(): Array<string> {
    return this.coupons_;
  }
  set coupons(value: Array<string>) {
    let oldValue = this.coupons_;
    if (value === oldValue) {
      return;
    }
    this.coupons_ = value;
    this.emit('coupons', this.coupons_, oldValue);
  }

  private items_?: ObservableArray<Item>;
  get items(): ObservableArray<Item> {
    return this.items_;
  }
  set items(value: ObservableArray<Item>) {
    let oldValue = this.items_;
    if (value === oldValue) {
      return;
    }
    this.items_ = value;
    this.emit('items', this.items_, oldValue);
  }

  private created_?: number;
  get created(): number {
    return this.created_;
  }
  set created(value: number) {
    let oldValue = this.created_;
    if (value === oldValue) {
      return;
    }
    this.created_ = value;
    this.emit('created', this.created_, oldValue);
  }

  public triggerInitialEvents(): void {
    if (this.userId_ !== undefined) {
      this.emit('userId', this.userId_, undefined);
    }
    if (this.shop_ !== undefined) {
      this.emit('shop', this.shop_, undefined);
    }
    if (this.coupons_ !== undefined) {
      this.emit('coupons', this.coupons_, undefined);
    }
    if (this.items_ !== undefined) {
      this.emit('items', this.items_, undefined);
    }
    if (this.created_ !== undefined) {
      this.emit('created', this.created_, undefined);
    }
    this.emit('init');
  }

  public toJSON(): Object {
    return {
      userId: this.userId,
      shop: this.shop,
      coupons: this.coupons,
      items: this.items,
      created: this.created,
    };
  }
}

export let CART: ObservableDescriptor<Cart> = {
  name: 'Cart',
  constructor: Cart,
  fields: [
    {
      name: 'userId',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'shop',
      enumType: SHOP,
    },
    {
      name: 'coupons',
      primitiveType: PrimitiveType.STRING,
      asArray: ArrayType.NORMAL,
    },
    {
      name: 'items',
      observableType: ITEM,
      asArray: ArrayType.OBSERVABLE,
    },
    {
      name: 'created',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
