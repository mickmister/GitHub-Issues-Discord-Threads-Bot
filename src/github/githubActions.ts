import { graphql } from "@octokit/graphql";
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Attachment, Collection, Message } from "discord.js";
import { config } from "../config";
import { insertRecord, removeRecord, removeRecorsByIssueNumber } from "../db";
import { ActionValue, Actions, Triggerer, logger } from "../logger";

export const octokit = new Octokit({
  auth: config.GITHUB_ACCESS_TOKEN,
  baseUrl: "https://api.github.com",
});

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
  },
});

export const repoCredentials = {
  owner: config.GITHUB_USERNAME,
  repo: config.GITHUB_REPOSITORY,
};

const info = (
  action: ActionValue,
  issue_number: number,
  additional: string = "",
) =>
  logger.info(
    `${Triggerer.Discord} | ${action} | https://github.com/${config.GITHUB_USERNAME}/${config.GITHUB_REPOSITORY}/issues/${issue_number}${additional}`,
  );
const error = (action: ActionValue, err: unknown) =>
  logger.error(
    `${Triggerer.Discord} | ${action} | ${err instanceof Error ? err.message : String(err)}`,
  );

function attachmentsToMarkdown(attachments: Collection<string, Attachment>) {
  let md = "";
  attachments.forEach(({ url, name, contentType }) => {
    switch (contentType) {
      case "image/png":
      case "image/jpeg":
        md += `![${name}](${url} "${name}")`;
        break;
    }
  });
  return md;
}

function getIssueBody(params: Message) {
  const { guildId, channelId, id, content, author, attachments } = params;
  const { globalName, avatar } = author;

  return (
    `<kbd>[![${globalName}](https://cdn.discordapp.com/avatars/${author.id}/${avatar}.webp?size=40)](https://discord.com/channels/${guildId}/${channelId}/${id})</kbd> [${globalName}](https://discord.com/channels/${guildId}/${channelId}/${id})  \`BOT\`\n\n` +
    `${content}\n` +
    `${attachmentsToMarkdown(attachments)}\n`
  );
}

const regexForDiscordCredentials =
  /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)(?=\))/;
export function getDiscordInfoFromGithubBody(body: string) {
  const match = body.match(regexForDiscordCredentials);
  if (!match || match.length !== 4)
    return { channelId: undefined, id: undefined };
  const [, , channelId, id] = match;
  return { channelId, id };
}

export async function getIssue(issue_number: number) {
  const response = await octokit.rest.issues.get({
    ...repoCredentials,
    issue_number,
  });

  if (!response || !response.data) {
    throw new Error("Failed to retrieve issue data");
  }

  return response.data;
}

export async function createIssue(
  thread: { id: string; name: string; appliedTags: string[] },
  params: Message,
) {
  try {
    const { name: title, appliedTags, id: discord_id } = thread;

    const body = getIssueBody(params);
    const response = await octokit.rest.issues.create({
      ...repoCredentials,
      labels: appliedTags,
      title,
      body,
    });

    if (!response?.data) {
      throw new Error("No response data");
    }

    const { id: github_id, number: issue_number } = response.data;

    insertRecord({
      github_id,
      discord_id,
      issue_number,
    });

    info(Actions.Created, issue_number);
  } catch (err) {
    error(Actions.Created, err);
  }
}

async function updateIssue(
  issue_number: number,
  params: Partial<RestEndpointMethodTypes["issues"]["update"]["parameters"]>,
) {
  try {
    await octokit.rest.issues.update({
      ...repoCredentials,
      ...params,
      issue_number,
    });
    return true;
  } catch (err) {
    return err;
  }
}

export async function openIssue(issue_number: number) {
  try {
    const response = await updateIssue(issue_number, { state: "open" });
    if (response !== true) {
      throw new Error("No response");
    }

    info(Actions.Reopened, issue_number);
  } catch (err) {
    error(Actions.Reopened, err);
  }
}

export async function closeIssue(issue_number: number) {
  try {
    const response = await updateIssue(issue_number, { state: "closed" });
    if (response !== true) {
      throw new Error("No response");
    }

    info(Actions.Closed, issue_number);
  } catch (err) {
    error(Actions.Closed, err);
  }
}

export async function lockIssue(issue_number: number) {
  try {
    const response = await octokit.rest.issues.lock({
      ...repoCredentials,
      issue_number,
    });
    if (response?.status !== 204) {
      throw new Error("No response");
    }

    info(Actions.Locked, issue_number);
  } catch (err) {
    error(Actions.Locked, err);
  }
}

export async function unlockIssue(issue_number: number) {
  try {
    const response = await octokit.rest.issues.unlock({
      ...repoCredentials,
      issue_number,
    });
    if (response?.status !== 204) {
      throw new Error("No response");
    }

    info(Actions.Unlocked, issue_number);
  } catch (err) {
    error(Actions.Unlocked, err);
  }
}

export async function deleteIssue(node_id: string, issue_number: number) {
  try {
    await graphqlWithAuth(
      `mutation {deleteIssue(input: {issueId: "${node_id}"}) {clientMutationId}}`,
    );
    await removeRecorsByIssueNumber(issue_number);

    info(Actions.Deleted, issue_number);
  } catch (err) {
    error(Actions.Deleted, err);
  }
}

export async function createIssueComment(
  issue_number: number,
  params: Message,
) {
  try {
    const body = getIssueBody(params);

    const response = await octokit.rest.issues.createComment({
      ...repoCredentials,
      issue_number,
      body,
    });

    if (!response?.data) {
      throw new Error("No response data");
    }

    const github_id = response.data.id;
    const discord_id = params.id;

    await insertRecord({ github_id, discord_id, issue_number });

    info(Actions.Commented, issue_number, `#issuecomment-${github_id}`);
  } catch (err) {
    error(Actions.Commented, err);
  }
}

export async function deleteIssueComment(
  github_id: number,
  issue_number: number,
) {
  try {
    await octokit.rest.issues.deleteComment({
      ...repoCredentials,
      comment_id: github_id,
    });
    await removeRecord({ github_id });

    info(Actions.DeletedComment, issue_number, `#issuecomment-${github_id}`);
  } catch (err) {
    error(Actions.DeletedComment, err);
  }
}

