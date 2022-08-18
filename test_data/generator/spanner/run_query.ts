import {
  buildQueryCartOfUserStatement,
  parseQueryCartOfUserRow,
} from "./query";
import { Spanner } from "@google-cloud/spanner";

let SPANNER = new Spanner();
let INSTANCE = SPANNER.instance("your-instance");
let DATABASE = INSTANCE.database("your-db");

async function main() {
  let [rows] = await DATABASE.run(buildQueryCartOfUserStatement("user id"));
  if (rows.length !== 1) {
    throw new Error(`Expected one row.`);
  }
  let row = parseQueryCartOfUserRow(rows[0]);
  console.log(row.shop);
  console.log(row.coupons.join(","));
}

main();
