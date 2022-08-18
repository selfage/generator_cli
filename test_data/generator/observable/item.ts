import { EnumDescriptor, PrimitiveType } from '@selfage/message/descriptor';
import { EventEmitter } from 'events';
import { ObservableDescriptor } from '@selfage/observable/descriptor';
import { Money, MONEY } from './sub/money';

export enum ProductCategory {
  Veges = 1,
  Meat = 2,
  Beverage = 3,
}

export let PRODUCT_CATEGORY: EnumDescriptor<ProductCategory> = {
  name: 'ProductCategory',
  values: [
    {
      name: 'Veges',
      value: 1,
    },
    {
      name: 'Meat',
      value: 2,
    },
    {
      name: 'Beverage',
      value: 3,
    },
  ]
}

export interface Item {
  on(event: 'productName', listener: (newValue: string, oldValue: string) => void): this;
  on(event: 'productCategory', listener: (newValue: ProductCategory, oldValue: ProductCategory) => void): this;
  on(event: 'price', listener: (newValue: Money, oldValue: Money) => void): this;
  on(event: 'quantity', listener: (newValue: number, oldValue: number) => void): this;
  on(event: 'init', listener: () => void): this;
}

export class Item extends EventEmitter {
  private productName_?: string;
  get productName(): string {
    return this.productName_;
  }
  set productName(value: string) {
    let oldValue = this.productName_;
    if (value === oldValue) {
      return;
    }
    this.productName_ = value;
    this.emit('productName', this.productName_, oldValue);
  }

  private productCategory_?: ProductCategory;
  get productCategory(): ProductCategory {
    return this.productCategory_;
  }
  set productCategory(value: ProductCategory) {
    let oldValue = this.productCategory_;
    if (value === oldValue) {
      return;
    }
    this.productCategory_ = value;
    this.emit('productCategory', this.productCategory_, oldValue);
  }

  private price_?: Money;
  get price(): Money {
    return this.price_;
  }
  set price(value: Money) {
    let oldValue = this.price_;
    if (value === oldValue) {
      return;
    }
    this.price_ = value;
    this.emit('price', this.price_, oldValue);
  }

  private quantity_?: number;
  get quantity(): number {
    return this.quantity_;
  }
  set quantity(value: number) {
    let oldValue = this.quantity_;
    if (value === oldValue) {
      return;
    }
    this.quantity_ = value;
    this.emit('quantity', this.quantity_, oldValue);
  }

  public triggerInitialEvents(): void {
    if (this.productName_ !== undefined) {
      this.emit('productName', this.productName_, undefined);
    }
    if (this.productCategory_ !== undefined) {
      this.emit('productCategory', this.productCategory_, undefined);
    }
    if (this.price_ !== undefined) {
      this.emit('price', this.price_, undefined);
    }
    if (this.quantity_ !== undefined) {
      this.emit('quantity', this.quantity_, undefined);
    }
    this.emit('init');
  }

  public toJSON(): Object {
    return {
      productName: this.productName,
      productCategory: this.productCategory,
      price: this.price,
      quantity: this.quantity,
    };
  }
}

export let ITEM: ObservableDescriptor<Item> = {
  name: 'Item',
  constructor: Item,
  fields: [
    {
      name: 'productName',
      primitiveType: PrimitiveType.STRING,
    },
    {
      name: 'productCategory',
      enumType: PRODUCT_CATEGORY,
    },
    {
      name: 'price',
      messageType: MONEY,
    },
    {
      name: 'quantity',
      primitiveType: PrimitiveType.NUMBER,
    },
  ]
};
