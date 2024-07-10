import { Database } from "sqlite3";

type IssueRecord = {
  github_id: number;
  discord_id: string;
  issue_number: number;
};

type Query = { github_id: number } | { discord_id: string };

const db = new Database("./data.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS records (
        github_id INTEGER UNIQUE,
        discord_id TEXT UNIQUE,
        issue_number INTEGER
    )`);
});

export function insertRecord({
  github_id,
  discord_id,
  issue_number,
}: IssueRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO records (github_id, discord_id, issue_number) VALUES (?, ?, ?)",
      [github_id, discord_id, issue_number],
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

export function removeRecorsByIssueNumber(issue_number: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM records WHERE issue_number = ?`,
      [issue_number],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  });
}

function getConditionAndParam(query: Query): {
  condition: string;
  param: string | number;
} {
  if ("github_id" in query) {
    return {
      condition: "github_id = ?",
      param: query.github_id,
    };
  }

  if ("discord_id" in query) {
    return {
      condition: "discord_id = ?",
      param: query.discord_id,
    };
  }

  throw new Error("Either github_id or discord_id must be provided");
}

