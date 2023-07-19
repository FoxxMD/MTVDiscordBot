// if we want to use js-video-url-parser as the main library for allow/deny we can add allowed providers individually
// import baseUrlParser from 'js-video-url-parser/lib/base';
// import Youtube from 'js-video-url-parser/lib/provider/youtube';
// import Vimeo from 'js-video-url-parser/lib/provider/vimeo';
// import Ted from 'js-video-url-parser/lib/provider/ted';
// import Twitch from 'js-video-url-parser/lib/provider/twitch';
// import Facebook from 'js-video-url-parser/lib/provider/facebook.js';
// import DailyMotion from 'js-video-url-parser/lib/provider/dailymotion.js';
// export const urlParser = baseUrlParser;

// but for now it seems best to use the default parser and restrict based on provider keyword with custom domains added?

import videoUrlParser from "js-video-url-parser";
import {VideoInfo} from "js-video-url-parser/lib/urlParser.js";

export const urlParser = videoUrlParser;

export const videoDetailsToUrl = (data: VideoInfo<Record<string, any>>): string => {
    return urlParser.create({
        videoInfo: data,
        params: {
            start: data.params?.start
        }
    });
}
