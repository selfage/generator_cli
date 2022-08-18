import { Statement } from '@google-cloud/spanner/build/src/transaction';

export function buildQueryCartOfUserStatement(
  userId: string,
): Statement {
  return {
    sql: "SELECT * FROM Cart WHERE userId = @userId",
    params: {
      userId,
    },
    types: {
      userId: {
        type: "string"
      },
    }
  }
}

export interface QueryCartOfUserRow {
  shop: number;
  coupons: Array<string>;
}

export function parseQueryCartOfUserRow(row: any): QueryCartOfUserRow {
  // No need to wrap number until we want to support int64 as bigint.
  let obj = row.toJSON();
  return obj;
}
