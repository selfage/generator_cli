import { ExecuteSqlRequest, RunResponse } from '@google-cloud/spanner/build/src/transaction';
import { Spanner } from '@google-cloud/spanner';
import { User, USER } from './user';
import { serializeMessage } from '@selfage/message/serializer';

export interface GetLastUserRow {
  userTableUserId?: number,
  ucContent?: Buffer,
}

export async function getLastUser(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  ucContentId: string,
): Promise<Array<GetLastUserRow>> {
  let [rows] = await run({
    sql: "SELECT UserTable.userId, uc.content FROM UserTable INNER JOIN UserContent AS uc ON UserTable.userId = uc.userId WHERE uc.contentId = @ucContentId ORDER BY UserTable.createdTimestamp LIMIT 1",
    params: {
      ucContentId: ucContentId,
    },
    types: {
      ucContentId: { type: "string" },
    }
  });
  let resRows = new Array<GetLastUserRow>();
  for (let row of rows) {
    resRows.push({
      userTableUserId: row.at(0).value == null ? undefined : row.at(0).value.value,
      ucContent: row.at(1).value == null ? undefined : row.at(1).value,
    });
  }
  return resRows;
}

export async function insertNewUser(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  userId: number,
  user: User,
): Promise<void> {
  await run({
    sql: "INSERT UserTable (userId, user, createdTimestamp) VALUES (@userId, @user, PENDING_COMMIT_TIMESTAMP())",
    params: {
      userId: Spanner.float(userId),
      user: Buffer.from(serializeMessage(user, USER).buffer),
    },
    types: {
      userId: { type: "float64" },
      user: { type: "bytes" },
    }
  });
}

export async function updateUserContent(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  setContent: Buffer,
  userContentUserId: number,
): Promise<void> {
  await run({
    sql: "UPDATE UserContent SET content = @setContent WHERE UserContent.userId = @userContentUserId",
    params: {
      setContent: setContent,
      userContentUserId: Spanner.float(userContentUserId),
    },
    types: {
      setContent: { type: "bytes" },
      userContentUserId: { type: "float64" },
    }
  });
}

export async function deleteUserContent(
  run: (query: ExecuteSqlRequest) => Promise<RunResponse>,
  userContentUserId: number,
  userContentContentId: string,
): Promise<void> {
  await run({
    sql: "DELETE UserContent WHERE (UserContent.userId = @userContentUserId AND UserContent.contentId = @userContentContentId)",
    params: {
      userContentUserId: Spanner.float(userContentUserId),
      userContentContentId: userContentContentId,
    },
    types: {
      userContentUserId: { type: "float64" },
      userContentContentId: { type: "string" },
    }
  });
}
