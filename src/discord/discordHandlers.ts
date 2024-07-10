import {
	AnyThreadChannel,
	Client,
	DMChannel,
	Message,
	NonThreadGuildBasedChannel,
	PartialMessage
} from 'discord.js';
import { config } from '../config';
import { getRecord } from '../db';
import {
	closeIssue,
	createIssue,
	createIssueComment,
	deleteIssue,
	deleteIssueComment,
	getIssue,
	lockIssue,
	openIssue,
	unlockIssue
} from '../github/githubActions';
import { logger } from '../logger';
import { store } from '../store';

export const threadsCreateTaskMap: Map<
	string,
	{ id: string; name: string; appliedTags: string[] }
> = new Map([]);

export async function handleClientReady(client: Client) {
	logger.info(`Logged in as ${client.user?.tag}!`);

	// // Fetch cache for closed threads
	// const threadPromises = store.threads.map(async (thread) => {
	//   const cachedChannel = client.channels.cache.get(thread.id) as
	//     | ThreadChannel
	//     | undefined;
	//   if (cachedChannel) {
	//     cachedChannel.messages.cache.forEach((message) => message.id);
	//     return thread; // Returning thread as valid
	//   } else {
	//     try {
	//       const channel = (await client.channels.fetch(
	//         thread.id,
	//       )) as ThreadChannel;
	//       channel.messages.cache.forEach((message) => message.id);
	//       return thread; // Returning thread as valid
	//     } catch (error) {
	//       return; // Marking thread as invalid
	//     }
	//   }
	// });
	// const threadPromisesResults = await Promise.all(threadPromises);
	// store.threads = threadPromisesResults.filter(
	//   (thread) => thread !== undefined,
	// ) as Thread[];

	// logger.info(`Issues loaded : ${store.threads.length}`);

	// client.channels.fetch(config.DISCORD_CHANNEL_ID).then((params) => {
	//   store.availableTags = (params as ForumChannel).availableTags;
	// });
}

export async function handleThreadCreate(params: AnyThreadChannel) {
	const { id, name, appliedTags, parentId } = params;
	if (parentId !== config.DISCORD_CHANNEL_ID) return;

	threadsCreateTaskMap.set(id, { id, name, appliedTags });
}

export async function handleChannelUpdate(params: DMChannel | NonThreadGuildBasedChannel) {
	const { id, type } = params;
	if (id !== config.DISCORD_CHANNEL_ID) return;

	if (type === 15) {
		store.availableTags = params.availableTags;
	}
}

export async function handleThreadUpdate(params: AnyThreadChannel) {
	const { id: discord_id, parentId, archived: wasArchived, locked: wasLocked } = params;
	if (parentId !== config.DISCORD_CHANNEL_ID) return;

	const { archived, locked } = params.members.thread;
	const { issue_number } = (await getRecord({ discord_id })) || {};
	if (!issue_number) return;

	if (archived !== wasArchived) {
		archived ? closeIssue(issue_number) : openIssue(issue_number);
	}

	if (locked !== wasLocked) {
		locked ? lockIssue(issue_number) : unlockIssue(issue_number);
	}
}

export async function handleMessageCreate(params: Message) {
	const {
		channelId: discord_id,
		nonce,
		author: { bot }
	} = params;
	if (bot) return;

	if (nonce === null) {
		const threadInfo = threadsCreateTaskMap.get(discord_id);
		threadsCreateTaskMap.delete(discord_id);
		if (!threadInfo) return;

		createIssue(threadInfo, params);
	} else {
		const { issue_number } = (await getRecord({ discord_id })) || {};
		if (!issue_number) return;

		createIssueComment(issue_number, params);
	}
}

export async function handleMessageDelete(params: Message | PartialMessage) {
	const { id: discord_id } = params;

	const { github_id, issue_number } = (await getRecord({ discord_id })) || {};
	if (!github_id || !issue_number) return;

	deleteIssueComment(github_id, issue_number);
}

export async function handleThreadDelete(params: AnyThreadChannel) {
	if (params.parentId !== config.DISCORD_CHANNEL_ID) return;

	const { issue_number } = (await getRecord({ discord_id: params.id })) || {};
	if (!issue_number) return;

	const { node_id } = (await getIssue(issue_number)) || {};
	if (!node_id) return;

	deleteIssue(node_id, issue_number);
}
