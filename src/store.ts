/**
 * Temporarily holds locking status from a GitHub handler
 * to prevent duplicate calls from a Discord handler.
 */
export const lockTaskStore: Map<string, boolean> = new Map([]);

/**
 * Temporarily holds closing status from a GitHub handler
 * to prevent duplicate calls from a Discord handler.
 */
export const closeTaskStore: Map<string, boolean> = new Map([]);

/**
 * Temporarily holds the details of newly created thread info
 * for further use in the handleMessageCreate function.
 */
export const threadsCreateTaskStore: Map<
	string,
	{ id: string; name: string; appliedTags: string[] }
> = new Map([]);

