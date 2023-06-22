import {Sequelize} from "sequelize";
import * as video from './models/video.js'
import * as user from './models/user.js'
import * as videoSubmission from './models/videosubmission.js'

export const setupMappings = (db: Sequelize) => {
    user.init(db);
    video.init(db);
    videoSubmission.init(db);

    user.associate();
    video.associate();
    videoSubmission.associate();
}
