import {
	ForumChannel,
	GuildForumTag,
	GuildForumTagData,
	MessagePayload,
	Snowflake,
	ThreadChannel
} from 'discord.js';
import { config } from '../config';
import { getRecord, insertRecord, removeRecord } from '../db';
import { ActionValue, Actions, Triggerer, logger } from '../logger';
import client from './discord';

const { DISCORD_CHANNEL_ID } = config;

const info = (
	action: ActionValue,
	channel: ForumChannel | ThreadChannel,
	threadId: string,
	messageId?: string
) =>
	logger.info(
		`${Triggerer.Github} | ${action} | ${`https://discord.com/channels/${channel.guildId}/${threadId}${messageId ? `/${messageId}` : ''}`}`
	);

async function getForumChannel(): Promise<ForumChannel> {
	const channel =
		client.channels.cache.get(DISCORD_CHANNEL_ID) ||
		(await client.channels.fetch(DISCORD_CHANNEL_ID));

	if (channel instanceof ForumChannel) {
		return channel;
	}

	throw new Error(`Channel with ID ${config.DISCORD_CHANNEL_ID} not found.`);
}

async function getThreadChannel(threadId: string): Promise<ThreadChannel | undefined> {
	const channel = client.channels.cache.get(threadId) || (await client.channels.fetch(threadId));

	if (channel instanceof ThreadChannel) {
		return channel;
	}

	return undefined;
}

export async function createThread({
	body,
	login,
	avatar_url,
	title,
	appliedTags,
	github_id,
	issue_number
}: {
	body: string;
	login: string;
	avatar_url: string;
	title: string;
	appliedTags: string[];
	github_id: number;
	issue_number: number;
}) {
	try {
		const channel = await getForumChannel();

		const tagIds = await getTagIds(appliedTags, channel);

		const webhook = await channel.createWebhook({ name: login, avatar: avatar_url });
		const messagePayload = MessagePayload.create(webhook, {
			content: body,
			threadName: title,
			appliedTags: tagIds
		}).resolveBody();
		const { id: discord_id } = await webhook.send(messagePayload);
		webhook.delete('Cleanup');

		insertRecord({ discord_id, github_id, issue_number });

		info(Actions.Created, channel, discord_id);
	} catch (err) {
		console.log(err);
	}
}

export async function closeThread(threadId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel || channel.archived) return;

	channel.setArchived(true);

	info(Actions.Closed, channel, threadId);
}

export async function reopenThread(threadId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel || !channel.archived) return;

	channel.setArchived(false);

	info(Actions.Reopened, channel, threadId);
}

export async function lockThread(threadId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel || channel.locked) return;

	if (channel.archived) {
		channel.setArchived(false);
		channel.setLocked(true);
		channel.setArchived(true);
	} else {
		channel.setLocked(true);
	}

	info(Actions.Locked, channel, threadId);
}

export async function unlockThread(threadId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel || !channel.locked) return;

	if (channel.archived) {
		channel.setArchived(false);
		channel.setLocked(false);
		channel.setArchived(true);
	} else {
		channel.setLocked(false);
	}

	info(Actions.Unlocked, channel, threadId);
}

export async function deleteThread(threadId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel) return;

	channel.delete();
	removeRecord({ discord_id: threadId });

	info(Actions.Deleted, channel, threadId);
}

export async function createComment({
	body,
	login,
	avatar_url,
	github_id,
	issue_number,
	issue_id
}: {
	body: string;
	login: string;
	avatar_url: string;
	github_id: number;
	issue_number: number;
	issue_id: number;
}) {
	try {
		const { discord_id: threadId } = (await getRecord({ github_id: issue_id })) || {};
		if (!threadId) return;

		const channel = await getThreadChannel(threadId);
		if (!channel?.parent) return;

		const webhook = await channel.parent.createWebhook({ name: login, avatar: avatar_url });
		const messagePayload = MessagePayload.create(webhook, {
			content: body,
			threadId
		}).resolveBody();
		const { id: discord_id } = await webhook.send(messagePayload);
		webhook.delete('Cleanup');

		insertRecord({ discord_id, github_id, issue_number });

		info(Actions.Commented, channel, threadId, discord_id);
	} catch (err) {
		console.log(err);
	}
}

export async function deleteComment(threadId: string, messageId: string) {
	const channel = await getThreadChannel(threadId);
	if (!channel) return;

	removeRecord({ discord_id: messageId });

	const targetMessage = await channel.messages.fetch(messageId);
	await targetMessage.delete();

	info(Actions.Deleted, channel, threadId, messageId);
}

export async function getTagIds(tags: string[], channel?: ForumChannel): Promise<Snowflake[]> {
	if (!channel) channel = await getForumChannel();

	await addTags(tags, channel);
	return filterAndExtractTagsAttributes(channel, 'name', tags, 'id');
}

export async function getTagNames(tagIds: Snowflake[], channel?: ForumChannel): Promise<string[]> {
	if (!channel) channel = await getForumChannel();

	return filterAndExtractTagsAttributes(channel, 'id', tagIds, 'name');
}

function filterAndExtractTagsAttributes<
	K extends keyof GuildForumTag,
	N extends keyof GuildForumTag
>(
	channel: ForumChannel,
	param: K,
	filterValues: GuildForumTag[K][],
	extractAttr: N
): GuildForumTag[N][] {
	const filterSet = new Set(filterValues);
	return channel.availableTags
		.filter((tag) => filterSet.has(tag[param]))
		.map((tag) => tag[extractAttr]);
}

async function addTags(tags: string[], channel?: ForumChannel): Promise<void> {
	if (!channel) channel = await getForumChannel();

	const currentTags = channel.availableTags as unknown as GuildForumTagData[];
	const currentTagsSet = new Set(currentTags.map((tag) => tag.name));

	const appliedTagsData = tags.map((name) => ({ name }));

	const newTags = appliedTagsData.filter(({ name }) => !currentTagsSet.has(name));
	if (newTags.length === 0) return;

	currentTags.push(...newTags);
	await channel.setAvailableTags(currentTags);
}
