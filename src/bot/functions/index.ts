import {VideoSubmission} from "../../common/db/models/videosubmission.js";

export const submissionInGoodStanding = (submission: VideoSubmission) => {
    // naive
    return submission.upvotes >= submission.downvotes;
}
