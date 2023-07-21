import {InteractionLike} from "../common/infrastructure/Atomic.js";
import {
    InteractionReplyOptions,
    InteractionResponse,
    InteractionUpdateOptions,
    Message,
    MessagePayload
} from "discord.js";
import dayjs, {Dayjs} from "dayjs";
import {MTVLogger} from "../common/logging.js";

export const overwriteMerge = (destinationArray: any[], sourceArray: any[], options: any): any[] => sourceArray;

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const mergeArr = (objValue: [], srcValue: []): (any[] | undefined) => {
    if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
    }
}

export const valToString = (val: any): string => {
    const t = typeof val;
    if (t === 'boolean') {
        return val === true ? '1' : '0';
    }
    return val.toString();
}

export const intersect = (a: Array<any>, b: Array<any>) => {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    return Array.from(intersection);
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ReplyOptions {
    defer?: boolean,
    edit?: boolean
}

export const interact = async (interaction: InteractionLike, messageOptions: MessagePayload | InteractionReplyOptions | InteractionUpdateOptions, replyOptions?: ReplyOptions): Promise<Message<boolean> | InteractionResponse<boolean>> => {
    const {defer, edit = false} = replyOptions || {};
    if (interaction.isMessageComponent()) {
        const {components = [], content} = messageOptions as InteractionUpdateOptions;
        return await interaction.update({content, components});
    } else if (interaction.replied) {
        if (edit) {
            return await interaction.editReply(messageOptions as MessagePayload | InteractionReplyOptions);
        }
        return await interaction.followUp(messageOptions as MessagePayload | InteractionReplyOptions);
    } else {
        return await interaction.reply(messageOptions as MessagePayload | InteractionReplyOptions);
    }
}

export class RateLimitFunc {
    public lastExecute?: Dayjs;
    public msBetween: number;
    protected shouldWait: boolean;
    protected logger?: MTVLogger;

    constructor(msBetween: number, shouldWait: boolean, logger?: MTVLogger) {
        this.msBetween = msBetween;
        this.lastExecute = dayjs().subtract(msBetween + 1, 'ms');
        this.logger = logger;
        this.shouldWait = shouldWait;
    }

    async exec(func: Function, shouldCheck?: boolean) {
        if (shouldCheck ?? true) {
            const since = dayjs().diff(this.lastExecute, 'milliseconds');
            const shouldExec = since > this.msBetween;
            if (!shouldExec && this.shouldWait) {
                const willWait = this.msBetween - since;
                if (this.logger !== undefined) {
                    this.logger.debug(`Will wait ${willWait}ms`);
                }
                await sleep(willWait);
            }
            if (shouldExec || (!shouldExec && this.shouldWait)) {
                // its past time OR we waited
                await func();
                this.lastExecute = dayjs();
            }
        }
    }
}
