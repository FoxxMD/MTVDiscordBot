# MTV Discord Bot

A discord bot to facilitate r/mealtimevideo discord server. The bot will (eventually):

* Tracks community-trust based on vote reacts given on user submissions
* Manages user submissions to restricted video channels in order to present a streamlined experience to users
  * Submissions are rate-limited based on built user trust and account age

# Install

## Local

```shell
git clone https://github.com/FoxxMD/MTVDiscordBot.git .
cd MTVDiscordBot
nvm use # optional, to set correct Node version
npm install
npm build
npm start
```

## Docker

```shell
git clone https://github.com/FoxxMD/MTVDiscordBot.git .
cd MTVDiscordBot
```

Or [`foxxmd/mtv-discord-bot:latest`](https://hub.docker.com/r/foxxmd/mtv-discord-bot)

If using a [config file](#config-file) modify the `volumes` property in `docker-compose.yml` to point to your config folder.

```shell
docker-compose up -d
```

# Setup

Create a [Discord Bot](https://discord.com/developers/applications)

You will need to provide:

* Discord Bot **Token** -- created when you initially made the bot
* Oauth2 Client ID -- Found on the OAuth2 section in the bot's application page

See [config.yaml.example](/config/config.yaml.example). 

* For local installations this should be located in `PROJECT_DIR/data/config.yaml`
* For docker mount a folder into container at `/config` IE `docker run ... -v /path/on/host/config:/config`

## Optional Setup

**Highly recommended.** Create [Youtube](https://developers.google.com/youtube/registering_an_application) and [Vimeo](https://developer.vimeo.com/api/guides/start#register-your-app) application credentials. These will enable these features:

* Automatic title and **video duration** parsing for these platforms
* Automatic Creator entity creation from videos with full IDs, NSFW flags, and popular flags
* Creator association to Discord users for these platforms

# Usage

All interaction with the bot is done through [Discord Slash Commands.](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ)

The below usage is an overview and not ehxuastive documentation. Each command has its own description and options that can be discovered through discord.

## Moderator

### `/settings`

Display or set guild-level bot behavior such as setting channel categories for showcase posts, setting allowed video min/max length, setting firehose channel...

### `/roles`

Display and manage special MTV role type associated to Discord roles. Role types are associated to a discord role and give users that have those roles special behavior within MTV Bot.

Roles include:

* `Approved` - Users with this role type can bypass the age check for submission.
* `Janitor` - TBD
* `TOS` - If any discord roles are associated with this role type then users using `/submit` **must** have one of these roles in order to submit (AKA read-the-rules verification role)
* `Content Creator` - Discord role to set/unset on a User when they are given or have a creator associated removed.

### `/creators`

Manage discord user associations to platform creators. Only supported for Youtube and Vimeo creators (and only if their APIs are enabled with valid configs).

Users who are associated will get the `Content Creator` associated discord role, be able to bypass the 20% self-promo rule for their own channels, and will be mentioned in video submissions/showcase posts.

## Public

### `/submit`

The command used to submit a new submission to the Firehose channel.

### `/standing`

Used to display stats/level/summaries for users.
