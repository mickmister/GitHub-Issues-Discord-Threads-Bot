# Managing GitHub Issues via Discord Threads

This Discord bot serves as a seamless bridge between Discord thread channel and GitHub repository issues, enabling efficient issue management and synchronization between the two platforms. This integration allows for efficient project management, ensuring that actions performed on either Discord or GitHub are reflected in both platforms, facilitating smoother collaboration and issue tracking across teams.

## Functionality Overview

#### Issue create

- \[x] discord -> github
- \[x] github -> discord

#### Issue edit

- \[ ] discord -> github
- \[ ] github -> discord

#### Issue delete

- \[x] discord -> github
- \[x] github -> discord

#### Issue Comment create

- \[x] discord -> github
- \[x] github -> discord

#### Issue Comment edit

- \[ ] discord -> github
- \[ ] github -> discord

#### Issue Comment delete

- \[x] discord -> github
- \[x] github -> discord

#### Issue Locking & Unlocking

- \[x] discord -> github
- \[x] github -> discord

#### Issue Open/Close

- \[x] discord -> github
- \[x] github -> discord

#### Issue Labels

- \[ ] discord -> github
- \[ ] github -> discord

#### Attachment Support

- \[x] Supported File Types: png, jpeg
- \[ ] Planned Support: gif, text, video

## Installation Steps

### Creating bot

Create bot https://discord.com/developers/applications?new_application=true

Bot settings:

- \[x] PRESENCE INTENT
- \[x] MESSAGE CONTENT INTENT

Invite url: https://discord.com/api/oauth2/authorize?client_id=APPLICATION_ID&permissions=0&scope=bot

### env

- DISCORD_TOKEN - Discord developer bot page "Settings->bot->reset token" (https://discord.com/developers/applications/APPLICATION_ID/bot)
- DISCORD_CHANNEL_ID - In the Discord server, create a forum channel and right-click (RMB) to copy the channel ID (developer settings must be turned on for this). Alternatively, you can copy the ID from the link. Example:
  https://discord.com/channels/<GUILD_ID>/<DISCORD_CHANNEL_ID>
- GITHUB_ACCESS_TOKEN
  1. [New Fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new) or follow these steps: Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token.
  2. In the "Repository access" section, select "Only select repositories" and choose the specific repositories you need access to.
  3. In the "Permissions" section, click on "Repository permissions" and set "Issues" to "Read & Write".
  4. Generate and copy the personal access token.
- GITHUB_USERNAME - example: https://github.com/<GITHUB_USERNAME>/<GITHUB_REPOSITORY>
- GITHUB_REPOSITORY

> **_NOTE:_** For detailed information about personal access tokens, visit the [Managing your personal access tokens - GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

### Start bot

```bash
npm run dev
```

or

```bash
npm run build && npm run start
```

### Activating GitHub to Discord Integration

```bash
npm run forward
```

Configure your webhook settings in GitHub:

- Go to your GitHub repository settings and navigate to **Webhooks**.
- Click on **Add webhook**.
- Set the following parameters:
  - **Payload URL:** Place your ngrok URL.
  - **Content type:** Select `application/json`.
  - **Individual events:** Choose `Issues` and `Issue comments`.
- Save your webhook settings.
