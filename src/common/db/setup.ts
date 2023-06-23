import {Sequelize} from "sequelize";
import * as video from './models/video.js'
import * as user from './models/user.js'
import * as videoSubmission from './models/videosubmission.js'
import * as creator from './models/creator.js';
import * as subLevel from './models/SubmissionTrustLevel.js';
import * as userLevel from './models/UserTrustLevel.js';
import * as guild from './models/Guild.js';
import * as showcase from './models/ShowcasePost.js';

export const setupMappings = (db: Sequelize) => {
    user.init(db);
    video.init(db);
    videoSubmission.init(db);
    creator.init(db);
    subLevel.init(db);
    userLevel.init(db);
    guild.init(db);
    showcase.init(db);

    user.associate();
    video.associate();
    videoSubmission.associate();
    creator.associate();
    subLevel.associate();
    userLevel.associate();
    showcase.associate();
}
