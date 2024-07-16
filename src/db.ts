import { Database } from 'sqlite3';

const FILE = './data.db';

const TABLE = 'records';
const GITHUB_ID_FIELD = 'github_id' as const;
const DISCORD_ID_FIELD = 'discord_id' as const;
const ISSUE_NUMBER_FIELD = 'issue_number' as const;

const SELECT_ALL_FROM = 'SELECT * FROM';
const WHERE = 'WHERE';
const DELETE_FROM = 'DELETE FROM';
const INSERT_INTO = 'INSERT INTO';

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & unknown;
type GithubFieldType = {
	readonly [GITHUB_ID_FIELD]: number;
};
type DiscordFieldType = {
	readonly [DISCORD_ID_FIELD]: string;
};
interface IssueRecordType extends DiscordFieldType, GithubFieldType {
	readonly [ISSUE_NUMBER_FIELD]: number;
}
type QueryType = GithubFieldType | DiscordFieldType;
type IssueRecord = Simplify<IssueRecordType>;
type Query = Simplify<QueryType>;

const db = new Database(FILE);
process.on('exit', () => db.close());

db.serialize(() => {
	db.run(
		`CREATE TABLE IF NOT EXISTS ${TABLE} (${GITHUB_ID_FIELD} INTEGER UNIQUE, ${DISCORD_ID_FIELD} TEXT UNIQUE, ${ISSUE_NUMBER_FIELD} INTEGER)`
	);
});

export function insertRecord({ github_id, discord_id, issue_number }: IssueRecord): Promise<void> {
	return new Promise((resolve, reject) => {
		db.run(
			`${INSERT_INTO} ${TABLE} (${GITHUB_ID_FIELD}, ${DISCORD_ID_FIELD}, ${ISSUE_NUMBER_FIELD}) VALUES (?, ?, ?)`,
			[github_id, discord_id, issue_number],
			(err) => {
				if (err) reject(err);
				resolve();
			}
		);
	});
}

export function getAllRecords(): Promise<IssueRecord[]> {
	return new Promise((resolve, reject) => {
		db.all<IssueRecord>(`${SELECT_ALL_FROM} ${TABLE}`, (err, rows) => {
			if (err) reject(err);
			resolve(rows);
		});
	});
}

export function getRecord(query: Query): Promise<IssueRecord | null> {
	const { condition, param } = getConditionAndParam(query);

	return new Promise((resolve, reject) => {
		db.get<IssueRecord>(
			`${SELECT_ALL_FROM} ${TABLE} ${WHERE} ${condition}`,
			[param],
			(err, row) => {
				if (err) reject(err);
				resolve(row);
			}
		);
	});
}

export function removeRecord(query: Query): Promise<void> {
	const { condition, param } = getConditionAndParam(query);

	return new Promise((resolve, reject) => {
		db.run(`${DELETE_FROM} ${TABLE} ${WHERE} ${condition}`, [param], (err) => {
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
		db.run(`${DELETE_FROM} ${TABLE} ${WHERE} ${ISSUE_NUMBER_FIELD} = ?`, [issue_number], (err) => {
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
	param: string | number;
} {
	if (GITHUB_ID_FIELD in query) {
		return {
			condition: `${GITHUB_ID_FIELD} = ?`,
			param: query.github_id
		};
	}

	if (DISCORD_ID_FIELD in query) {
		return {
			condition: `${DISCORD_ID_FIELD} = ?`,
			param: query.discord_id
		};
	}

	throw new Error('Either github_id or discord_id must be provided');
}
