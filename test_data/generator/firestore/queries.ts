import { Order, ORDER } from './orders';
import { Firestore, Transaction, Query, Filter } from '@google-cloud/firestore';
import { parseMessage } from '@selfage/message/parser';

export function insertOrder(
  firestore: Firestore,
  transaction: Transaction,
  message: Order,
): void {
  if (message.accountId == null) {
    throw new Error("Firestore primary key field accountId is required.");
  }
  if (message.orderId == null) {
    throw new Error("Firestore primary key field orderId is required.");
  }
  transaction.create(firestore.doc(["orders", message.accountId + message.orderId].join("/")), message);
}

export function upsertOrder(
  firestore: Firestore,
  transaction: Transaction,
  message: Order,
): void {
  if (message.accountId == null) {
    throw new Error("Firestore primary key field accountId is required.");
  }
  if (message.orderId == null) {
    throw new Error("Firestore primary key field orderId is required.");
  }
  transaction.set(firestore.doc(["orders", message.accountId + message.orderId].join("/")), message);
}

export function updateOrder(
  firestore: Firestore,
  transaction: Transaction,
  message: Order,
): void {
  if (message.accountId == null) {
    throw new Error("Firestore primary key field accountId is required.");
  }
  if (message.orderId == null) {
    throw new Error("Firestore primary key field orderId is required.");
  }
  transaction.update(firestore.doc(["orders", message.accountId + message.orderId].join("/")), message);
}

export async function getOrder(
  firestore: Firestore,
  args: {
    accountId: string,
    orderId: string,
  },
  transaction?: Transaction,
): Promise<Order | undefined> {
  let document = firestore.doc(["orders", args.accountId + args.orderId].join("/"));
  let snapshot = transaction
    ? await transaction.get(document)
    : await document.get();
  if (!snapshot.exists) {
    return undefined;
  }
  return parseMessage(snapshot.data(), ORDER);
}

export function deleteOrder(
  firestore: Firestore,
  transaction: Transaction,
  args: {
    accountId: string,
    orderId: string,
  },
): void {
  transaction.delete(firestore.doc(["orders", args.accountId + args.orderId].join("/")));
}

export async function listOrders(
  firestore: Firestore,
  args: {
    accountId: string,
  },
  transaction?: Transaction,
): Promise<Array<Order>> {
  let query: Query = firestore.collection("orders");
  query = query.where(Filter.where("accountId", "==", args.accountId));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ORDER));
}

export async function listOrdersByStatus(
  firestore: Firestore,
  args: {
    accountId: string,
    statusEq: string,
  },
  transaction?: Transaction,
): Promise<Array<Order>> {
  let query: Query = firestore.collection("orders");
  query = query.where(Filter.and(Filter.where("accountId", "==", args.accountId), Filter.where("status", "==", args.statusEq)));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ORDER));
}

export async function listOrdersByTotalRange(
  firestore: Firestore,
  args: {
    accountId: string,
    minimumTotal: number,
    maximumTotal: number,
    limit: number,
  },
  transaction?: Transaction,
): Promise<Array<Order>> {
  let query: Query = firestore.collection("orders");
  query = query.where(Filter.and(Filter.where("accountId", "==", args.accountId), Filter.where("total", ">=", args.minimumTotal), Filter.where("total", "<=", args.maximumTotal)));
  query = query.orderBy("total", "desc");
  query = query.limit(args.limit);
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ORDER));
}

export async function listOrdersByTagOrStatus(
  firestore: Firestore,
  args: {
    accountId: string,
    tagsArrayContainsAny: Array<string>,
    statusEq: string,
  },
  transaction?: Transaction,
): Promise<Array<Order>> {
  let query: Query = firestore.collection("orders");
  query = query.where(Filter.and(Filter.where("accountId", "==", args.accountId), Filter.or(Filter.where("tags", "array-contains-any", args.tagsArrayContainsAny), Filter.where("status", "==", args.statusEq))));
  let snapshot = transaction
    ? await transaction.get(query)
    : await query.get();
  return snapshot.docs.map((document) => parseMessage(document.data(), ORDER));
}
