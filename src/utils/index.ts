import {InteractionLike} from "../common/infrastructure/Atomic.js";
import {
    InteractionReplyOptions,
    InteractionResponse,
    InteractionUpdateOptions,
    Message,
    MessagePayload
} from "discord.js";

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
    if(t === 'boolean') {
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
    defer?: boolean
}

export const interact = async (interaction: InteractionLike, messageOptions: MessagePayload | InteractionReplyOptions | InteractionUpdateOptions, replyOptions?: ReplyOptions): Promise<Message<boolean> | InteractionResponse<boolean>> => {
    const {defer} = replyOptions || {};
    if(interaction.isMessageComponent()) {
        const {components = [], content} = messageOptions as InteractionUpdateOptions;
        return await interaction.update({content, components});
    } else if(interaction.replied) {
        return await interaction.followUp(messageOptions as MessagePayload | InteractionReplyOptions);
    } else {
        return await interaction.reply(messageOptions as MessagePayload | InteractionReplyOptions);
    }
}
