// temporary until i get actual testing implemented

import {Sequelize} from "sequelize";
import {User} from "./models/user.js";
import {Creator} from "./models/creator.js";
import {Video} from "./models/video.js";
import {VideoSubmission} from "./models/videosubmission.js";
import {Guild} from "./models/Guild.js";
import {ShowcasePost} from "./models/ShowcasePost.js";

export const sandbox = async (db: Sequelize) => {

    try {
        const guilds = await Guild.findAll();
        let guild: Guild;
        if (guilds.length > 0) {
            guild = guilds[0];
            const setted = await guild.upsertSetting('test', 'anothertest');
        } else {
            guild = await Guild.create({
                name: 'TEST',
                id: '1234'
            });
            const created = await guild.upsertSetting('test', 1234);
        }

        let updatedGuild = await Guild.findOne({where: {id: guild.id}, include: {all: true, nested: true}});

        let user = await User.findOne({where: {id: 1}, include: {all: true, nested: true}});

        if (user === null) {
            const newUser = await User.create({
                name: 'foxxmd#0',
                guildId: guild.id
            });
            user = newUser;
        }

        if (user.trustLevel !== undefined && user.trustLevel !== null) {
            await user.trustLevel.destroy();
        }

        await user.createTrustLevel({
            trustLevelId: 2
        });

        const [creator] = await Creator.upsert({
            platform: 'youtube',
            platformId: '555',
            name: 'TEST',
            nsfw: false
        });

        await user.addCreator(creator);

        const [video] = await Video.upsert({
            platform: 'youtube',
            platformId: '12345',
            length: 1234,
            nsfw: false,
            creatorId: creator.id,
            url: 'https://youtube.com/123467'
        });
        const [submission] = await VideoSubmission.upsert({
            messageId: '1234',
            guildId: guild.id,
            userId: user.id,
            videoId: video.id,
            url: 'https://reddit.com/r/mealtimevideos/test'
        });

        const [showcase] = await ShowcasePost.upsert({
            messageId: '12347',
            guildId: guild.id,
            userId: user.id,
            videoId: video.id,
            url: 'https://reddit.com/r/mealtimevideos/test',
            submissionId: submission.id
        });

        const hydratedUser = await User.findOne({where: {id: 1}, include: {all: true, nested: true}});
        const f = 1;
    } catch (e) {
        throw e;
    }
}
