import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { User, USER } from './user';
import { serializeMessage } from '@selfage/message/serializer';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertNewUserStatement(
  userId: number,
  user: User | null | undefined,
): Statement {
  return {
    sql: "INSERT UserTable (userId, user, createdTimestamp) VALUES (@userId, @user, PENDING_COMMIT_TIMESTAMP())",
    params: {
      userId: Spanner.float(userId),
      user: user == null ? null : Buffer.from(serializeMessage(user, USER).buffer),
    },
    types: {
      userId: { type: "float64" },
      user: { type: "bytes" },
    }
  };
}

export function updateUserContentStatement(
  userContentUserIdEq: number,
  setContent: string,
): Statement {
  return {
    sql: "UPDATE UserContent SET content = @setContent WHERE UserContent.userId = @userContentUserIdEq",
    params: {
      userContentUserIdEq: Spanner.float(userContentUserIdEq),
      setContent: setContent,
    },
    types: {
      userContentUserIdEq: { type: "float64" },
      setContent: { type: "string" },
    }
  };
}

export function deleteUserContentStatement(
  userContentUserIdEq: number,
  userContentContentIdEq: string,
): Statement {
  return {
    sql: "DELETE UserContent WHERE (UserContent.userId = @userContentUserIdEq AND UserContent.contentId = @userContentContentIdEq)",
    params: {
      userContentUserIdEq: Spanner.float(userContentUserIdEq),
      userContentContentIdEq: userContentContentIdEq,
    },
    types: {
      userContentUserIdEq: { type: "float64" },
      userContentContentIdEq: { type: "string" },
    }
  };
}

export interface GetLastUserRow {
  userTableUserId: number,
  ucContent: string,
}

export let GET_LAST_USER_ROW: MessageDescriptor<GetLastUserRow> = {
  name: 'GetLastUserRow',
  fields: [{
    name: 'userTableUserId',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'ucContent',
    index: 2,
    primitiveType: PrimitiveType.STRING,
  }],
};

export async function getLastUser(
  runner: Database | Transaction,
  ucContentIdEq: string,
): Promise<Array<GetLastUserRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserTable.userId, uc.content FROM UserTable INNER JOIN UserContent AS uc ON UserTable.userId = uc.userId WHERE uc.contentId = @ucContentIdEq ORDER BY UserTable.createdTimestamp",
    params: {
      ucContentIdEq: ucContentIdEq,
    },
    types: {
      ucContentIdEq: { type: "string" },
    }
  });
  let resRows = new Array<GetLastUserRow>();
  for (let row of rows) {
    resRows.push({
      userTableUserId: row.at(0).value.value,
      ucContent: row.at(1).value,
    });
  }
  return resRows;
}
