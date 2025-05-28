import {Client, Events, GuildMember, Interaction, Message} from "discord.js";

export type DiscordEventMap = {
    [Events.ClientReady]: [client: Client];
    [Events.GuildMemberAdd]: [member: GuildMember];
    [Events.MessageCreate]: [message: Message];
    [Events.InteractionCreate]: [interaction: Interaction];
    // Add any other events you need
};

export type EventContext<E extends keyof DiscordEventMap> = {
    event: E;
    args: DiscordEventMap[E];
};






type IsBothObject<A, B> = A extends object
    ? B extends object
        ? true
        : false
    : false;

type Prettify<T> = { [K in keyof T]: T[K] };

type Reconcile<A, B, Override extends boolean = false> =
    Override extends true
        ? {
        [K in keyof A as K extends keyof B ? never : K]: A[K];
    } & {
        [K in keyof B]: K extends keyof A
            ? IsBothObject<A[K], B[K]> extends true
                ? Reconcile<A[K], B[K], Override>
                : B[K]
            : B[K];
    }
        : {
        [K in keyof B as K extends keyof A ? never : K]: B[K];
    } & {
        [K in keyof A]: K extends keyof B
            ? IsBothObject<A[K], B[K]> extends true
                ? Reconcile<A[K], B[K], Override>
                : A[K]
            : A[K];
    };

type ContextAppendType = 'append' | 'override';

export { ContextAppendType, IsBothObject, Prettify, Reconcile}
