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

# Usage

Create a [Discord Bot](https://discord.com/developers/applications)

You will need to provide:

* Discord Bot **Token** -- created when you initially made the bot
* Oauth2 Client ID -- Found on the OAuth2 section in the bot's application page

### ENV

Provide these as environmental variables to node/docker

* `DISCORD_TOKEN=1234`
* `CLIENT_ID=5678`

### Config File

See [config.yaml.example](/config/config.yaml.example). 

* For local installations this should be located in `PROJECT_DIR/data/config.yaml`
* For docker mount a folder into container at `/config` IE `docker run ... -v /path/on/host/config:/config`
