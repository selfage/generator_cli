import { Spanner, Database, Transaction } from '@google-cloud/spanner';
import { User, USER } from './user';
import { serializeMessage, deserializeMessage } from '@selfage/message/serializer';
import { Statement } from '@google-cloud/spanner/build/src/transaction';
import { PrimitiveType, MessageDescriptor } from '@selfage/message/descriptor';

export function insertNewUserStatement(
  args: {
    userId: number,
    user: User | null | undefined,
    createdTimestamp: number,
  }
): Statement {
  return {
    sql: "INSERT UserTable (userId, user, createdTimestamp) VALUES (@userId, @user, @createdTimestamp)",
    params: {
      userId: Spanner.float(args.userId),
      user: args.user == null ? null : Buffer.from(serializeMessage(args.user, USER).buffer),
      createdTimestamp: new Date(args.createdTimestamp).toISOString(),
    },
    types: {
      userId: { type: "float64" },
      user: { type: "bytes" },
      createdTimestamp: { type: "timestamp" },
    }
  };
}

export function deleteUserStatement(
  args: {
    userTableUserIdEq: number,
  }
): Statement {
  return {
    sql: "DELETE UserTable WHERE (UserTable.userId = @userTableUserIdEq)",
    params: {
      userTableUserIdEq: Spanner.float(args.userTableUserIdEq),
    },
    types: {
      userTableUserIdEq: { type: "float64" },
    }
  };
}

export interface GetUserRow {
  userTableUserId?: number,
  userTableUser?: User,
  userTableCreatedTimestamp?: number,
}

export let GET_USER_ROW: MessageDescriptor<GetUserRow> = {
  name: 'GetUserRow',
  fields: [{
    name: 'userTableUserId',
    index: 1,
    primitiveType: PrimitiveType.NUMBER,
  }, {
    name: 'userTableUser',
    index: 2,
    messageType: USER,
  }, {
    name: 'userTableCreatedTimestamp',
    index: 3,
    primitiveType: PrimitiveType.NUMBER,
  }],
};

export async function getUser(
  runner: Database | Transaction,
  args: {
    userTableUserIdEq: number,
  }
): Promise<Array<GetUserRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserTable.userId, UserTable.user, UserTable.createdTimestamp FROM UserTable WHERE (UserTable.userId = @userTableUserIdEq)",
    params: {
      userTableUserIdEq: Spanner.float(args.userTableUserIdEq),
    },
    types: {
      userTableUserIdEq: { type: "float64" },
    }
  });
  let resRows = new Array<GetUserRow>();
  for (let row of rows) {
    resRows.push({
      userTableUserId: row.at(0).value == null ? undefined : row.at(0).value.value,
      userTableUser: row.at(1).value == null ? undefined : deserializeMessage(row.at(1).value, USER),
      userTableCreatedTimestamp: row.at(2).value == null ? undefined : row.at(2).value.valueOf(),
    });
  }
  return resRows;
}

export function updateUserStatement(
  args: {
    userTableUserIdEq: number,
    setUser: User | null | undefined,
    setCreatedTimestamp: number,
  }
): Statement {
  return {
    sql: "UPDATE UserTable SET user = @setUser, createdTimestamp = @setCreatedTimestamp WHERE (UserTable.userId = @userTableUserIdEq)",
    params: {
      userTableUserIdEq: Spanner.float(args.userTableUserIdEq),
      setUser: args.setUser == null ? null : Buffer.from(serializeMessage(args.setUser, USER).buffer),
      setCreatedTimestamp: new Date(args.setCreatedTimestamp).toISOString(),
    },
    types: {
      userTableUserIdEq: { type: "float64" },
      setUser: { type: "bytes" },
      setCreatedTimestamp: { type: "timestamp" },
    }
  };
}

export function insertNewUserContentStatement(
  args: {
    userId: number,
    contentId: string,
    content: string,
  }
): Statement {
  return {
    sql: "INSERT UserContent (userId, contentId, content) VALUES (@userId, @contentId, @content)",
    params: {
      userId: Spanner.float(args.userId),
      contentId: args.contentId,
      content: args.content,
    },
    types: {
      userId: { type: "float64" },
      contentId: { type: "string" },
      content: { type: "string" },
    }
  };
}

export function updateUserContentStatement(
  args: {
    userContentUserIdEq: number,
    setContent: string,
  }
): Statement {
  return {
    sql: "UPDATE UserContent SET content = @setContent WHERE UserContent.userId = @userContentUserIdEq",
    params: {
      userContentUserIdEq: Spanner.float(args.userContentUserIdEq),
      setContent: args.setContent,
    },
    types: {
      userContentUserIdEq: { type: "float64" },
      setContent: { type: "string" },
    }
  };
}

export function deleteUserContentStatement(
  args: {
    userContentUserIdEq: number,
    userContentContentIdEq: string,
  }
): Statement {
  return {
    sql: "DELETE UserContent WHERE (UserContent.userId = @userContentUserIdEq AND UserContent.contentId = @userContentContentIdEq)",
    params: {
      userContentUserIdEq: Spanner.float(args.userContentUserIdEq),
      userContentContentIdEq: args.userContentContentIdEq,
    },
    types: {
      userContentUserIdEq: { type: "float64" },
      userContentContentIdEq: { type: "string" },
    }
  };
}

export interface GetLastUserRow {
  userTableUserId?: number,
  ucContent?: string,
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
  args: {
    ucContentIdEq: string,
    limit: number,
  }
): Promise<Array<GetLastUserRow>> {
  let [rows] = await runner.run({
    sql: "SELECT UserTable.userId, uc.content FROM UserTable INNER JOIN UserContent AS uc ON UserTable.userId = uc.userId WHERE uc.contentId = @ucContentIdEq ORDER BY UserTable.createdTimestamp LIMIT @limit",
    params: {
      ucContentIdEq: args.ucContentIdEq,
      limit: args.limit.toString(),
    },
    types: {
      ucContentIdEq: { type: "string" },
      limit: { type: "int53" },
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
