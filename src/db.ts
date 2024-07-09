import { Database } from "sqlite3";

type IssueRecord = {
  githubIssueId: string;
  discordThreadId: string;
};

type Query = { githubIssueId: string } | { discordThreadId: string };

const db = new Database("./data.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS records (
        githubIssueId TEXT UNIQUE,
        discordThreadId TEXT UNIQUE
    )`);
});

export function insertRecord(
  githubIssueId: string,
  discordThreadId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO records (githubIssueId, discordThreadId) VALUES (?, ?)",
      [githubIssueId, discordThreadId],
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });
}

export function getAllRecords(): Promise<IssueRecord[]> {
  return new Promise((resolve, reject) => {
    db.all<IssueRecord>("SELECT * FROM records", (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
}

export function getRecord(query: Query): Promise<IssueRecord | null> {
  const { condition, param } = getConditionAndParam(query);

  return new Promise((resolve, reject) => {
    db.get<IssueRecord>(
      `SELECT * FROM records WHERE ${condition}`,
      [param],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      },
    );
  });
}

export function removeRecord(query: Query): Promise<void> {
  const { condition, param } = getConditionAndParam(query);

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM records WHERE ${condition}`, [param], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getConditionAndParam(query: Query): {
  condition: string;
  param: string;
} {
  if ("githubIssueId" in query) {
    return {
      condition: "githubIssueId = ?",
      param: query.githubIssueId,
    };
  }

  if ("discordThreadId" in query) {
    return {
      condition: "discordThreadId = ?",
      param: query.discordThreadId,
    };
  }

  throw new Error("Either githubIssueId or discordThreadId must be provided");
}

(async () => {
  try {
    await insertRecord("123", "abc");
  } catch (error) {
    console.error("Error:", error);
  }
  try {
    await insertRecord("124", "def");
  } catch (error) {
    console.error("Error:", error);
  }
  try {
    const records = await getAllRecords();
    console.log(records);
  } catch (error) {
    console.error("Error fetching records:", error);
  }
  const record2 = await getRecord({ discordThreadId: "abc" });
  if (record2) {
    console.log("Record:", record2);
  } else {
    console.log("Record with discordThreadId abc not found.");
  }
  try {
    await removeRecord({ discordThreadId: "abc" });
  } catch (error) {
    console.error("Error removing records:", error);
  }
})();
