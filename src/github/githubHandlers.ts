import type { components } from '@octokit/openapi-webhooks-types';
import { Request } from 'express';
import { getRecord } from '../db';
import {
	closeThread,
	createComment,
	createThread,
	deleteComment,
	deleteThread,
	lockThread,
	reopenThread,
	unlockThread,
	updateThreadTags
} from '../discord/discordActions';
import { closeTaskStore, lockTaskStore } from '../store';
import { getDiscordInfoFromGithubBody } from './githubActions';

type GithubRequest<K extends keyof components['schemas']> = Request<
	object,
	object,
	components['schemas'][K]
>;

export async function handleOpened(req: GithubRequest<'webhook-issues-opened'>) {
	if (!req.body.issue) return;
	const { id: github_id, number: issue_number, title, user, body, labels } = req.body.issue;
	if (!user || !body) return;

	const appliedTags = labels?.map((label) => label.name) || [];

	const { login, avatar_url } = user;
	if (!avatar_url) return;

	const exist = await getRecord({ github_id });
	if (exist) return;

	createThread({
		login,
		issue_number,
		title,
		body,
		github_id,
		avatar_url,
		appliedTags
	});
}

export async function handleCreated(req: GithubRequest<'webhook-issue-comment-created'>) {
	const { user, id: github_id, body } = req.body.comment;
	if (!user) return;
	const { login, avatar_url } = user;
	if (!avatar_url) return;
	const { id: issue_id, number: issue_number } = req.body.issue;

	// Check if the comment already contains Discord info
	if (getDiscordInfoFromGithubBody(body).channelId) {
		// If it does, stop processing (assuming created with a bot)
		return;
	}

	createComment({
		body,
		login,
		avatar_url,
		github_id,
		issue_number,
		issue_id
	});
}

export async function handleClosed(req: GithubRequest<'webhook-issues-closed'>) {
	const { id: github_id } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	closeThread(discord_id);
	closeTaskStore.set(discord_id, true);
}

export async function handleReopened(req: GithubRequest<'webhook-issues-reopened'>) {
	const { id: github_id } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	reopenThread(discord_id);
	closeTaskStore.set(discord_id, false);
}

export async function handleLocked(req: GithubRequest<'webhook-issues-locked'>) {
	const { id: github_id } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	lockThread(discord_id);
	lockTaskStore.set(discord_id, true);
}

export async function handleUnlocked(req: GithubRequest<'webhook-issues-unlocked'>) {
	const { id: github_id } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	unlockThread(discord_id);
	lockTaskStore.set(discord_id, false);
}

export async function handleDeleted(req: GithubRequest<'webhook-issues-deleted'>) {
	const { id: github_id } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	deleteThread(discord_id);
}

export async function handleCommentDeleted(req: GithubRequest<'webhook-issue-comment-deleted'>) {
	const issueId = req.body.issue.id;
	const commentId = req.body.comment.id;
	const { discord_id: threadId } = (await getRecord({ github_id: issueId })) || {};
	const { discord_id: messageId } = (await getRecord({ github_id: commentId })) || {};
	if (!threadId || !messageId) return;

	deleteComment(threadId, messageId);
}

export async function handeLabelUpdated(
	req: GithubRequest<'webhook-issues-labeled' | 'webhook-issues-unlabeled'>
) {
	const { id: github_id, labels } = req.body.issue;
	const { discord_id } = (await getRecord({ github_id })) || {};
	if (!discord_id) return;

	const tags = labels?.map(({ name }) => name) || [];
	// updateThreadTags(discord_id, tags);		// TODO - fix discord->github->discord loop
}

// 'webhook-issues-edited';
// 'webhook-issue-comment-edited';
