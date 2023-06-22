// temporary until i get actual testing implemented

import {Sequelize} from "sequelize";
import {User} from "./models/user.js";
import {Creator} from "./models/creator.js";
import {Video} from "./models/video.js";
import {VideoSubmission} from "./models/videosubmission.js";

const sandbox = async (db: Sequelize) => {
    let user = await User.findOne({where: {id: 1}, include: {all: true, nested: true}});

    if(user === null) {
        const newUser = await User.create({
            name: 'foxxmd#0'
        });
        user = newUser;
    }

    if(user.trustLevel !== undefined && user.trustLevel !== null) {
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
        creatorId: creator.id
    });
    const [submission] = await VideoSubmission.upsert({
        messageId: '1234',
        guildId: '123',
        userId: user.id,
        videoId: video.id
    });

    const hydratedUser = await User.findOne({where: {id: 1}, include: {all: true, nested: true}});
    const f = 1;
}
