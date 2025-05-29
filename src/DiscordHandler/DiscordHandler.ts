import {Client, GuildMember, SlashCommandBuilder} from "discord.js";
import { Events } from "discord.js";
import {ActionLoader} from "./ActionLoader";
import {ContextAppendType, DiscordEventMap, EventContext, Reconcile} from "./types";

export interface DiscordHandlerOptions {
    client: Client,
    handlerPath: string
}


export class DiscordHandler<Decorators = {}> {
    private useHandlers: ((ctx: Decorators) => void)[] = [];
    private services: any;
    private client: Client;
    private actionLoader: ActionLoader;
    private options: DiscordHandlerOptions
    readonly commands: Map<string, CommandHandler> = new Map();
    readonly events: Map<string, EventHandler> = new Map();

    constructor (
        options: DiscordHandlerOptions,
        private decorators: Decorators = {} as Decorators
    )  {
        this.decorators = decorators
        console.log("this.decorators", this.decorators)
        this.services = []
        this.options = options
        this.client = options.client
        this.actionLoader = new ActionLoader({
            path: options.handlerPath
        })
        this.registerActions()
    };
    private eventHandlers: {
        [E in keyof DiscordEventMap]?: Array<
            (ctx: Decorators & EventContext<E>) => void
        >
    } = {};

    on<E extends keyof DiscordEventMap>(
        event: E,
        handler: (ctx: Decorators & EventContext<E>) => void
    ): this {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event]!.push(handler);

        // Register the Discord.js event if not already done
        if (!this.client.listenerCount(event)) {
            this.client.on(event, (...args: DiscordEventMap[E]) => {
                this.handleEvent(event, args);
            });
        }

        return this;
    }

    private handleEvent<E extends keyof DiscordEventMap>(
        event: E,
        args: DiscordEventMap[E]
    ) {
        const handlers = this.eventHandlers[event];
        if (handlers) {
            const eventContext: EventContext<E> = { event, args };
            const fullContext = { ...this.decorators, ...eventContext };

            for (const handler of handlers) {
                handler(fullContext as Decorators & EventContext<E>);
            }
        }
    }

    decorate<Name extends string, Value>(
        name: Name,
        value: Value
    ): DiscordHandler<Reconcile<Decorators, { [K in Name]: Value }>>;

    decorate<NewDecorators extends Record<string, unknown>>(
        decorators: NewDecorators
    ): DiscordHandler<Reconcile<Decorators, NewDecorators>>;

    decorate<
        NewDecorators extends Record<string, unknown>,
        Type extends ContextAppendType = 'append'
    >(
        options: { as: Type },
        decorators: NewDecorators
    ): DiscordHandler<Reconcile<Decorators, NewDecorators, Type extends 'override' ? true : false>>;

    decorate<
        Name extends string,
        Value,
        Type extends ContextAppendType = 'append'
    >(
        options: { as: Type },
        name: Name,
        value: Value
    ): DiscordHandler<Reconcile<Decorators, { [K in Name]: Value }, Type extends 'override' ? true : false>>;

    decorate(...args: any[]): DiscordHandler<any> {
        let decorators: Record<string, unknown> = {};
        let override = false;

        if (args.length === 1 && typeof args[0] === 'object') {
            decorators = args[0];
        } else if (
            args.length === 2 &&
            typeof args[0] === 'string'
        ) {
            decorators = {[args[0]]: args[1]};
        } else if (
            args.length === 2 &&
            typeof args[0] === 'object' &&
            'as' in args[0]
        ) {
            decorators = args[1];
            override = args[0].as === 'override';
        } else if (
            args.length === 3 &&
            typeof args[0] === 'object' &&
            'as' in args[0] &&
            typeof args[1] === 'string'
        ) {
            decorators = {[args[1]]: args[2]};
            override = args[0].as === 'override';
        }

        const newDecorators = mergeDeep(this.decorators, decorators, override);
        return new DiscordHandler(this.options, newDecorators)._copyHandlers(this.useHandlers);
    }

    private _copyHandlers(handlers: ((ctx: any) => void)[]) {
        this.useHandlers = [...handlers];
        return this;
    }

    executeHandlers() {
        console.log('🚀 Running app with context:');
        console.log(this.decorators);
        for (const handler of this.useHandlers) {
            handler(this.decorators);
        }
    }

    use(handler: (ctx: Decorators) => void) {
        this.useHandlers.push(handler);
        return this;
    }

    private registerActions() {
        const actions = this.actionLoader.load()
        actions.forEach((action: any) => {
            if (action.eventType) {
                this.client.on(action.eventType.toString(), action.run.bind(this, this.client, this))
                this.commands.set(action.getName(), action)
            } else if (action.command) {
                this.commands.set(action.getName(), action)
            }
        })
    }


    addService(name: string, service: any) {
        this.services[name] = service;
    }

    service(name: string) {
        return this.services[name] || null
    }

    isEvent(eventName: string) {
        return Object.values(Events).includes(eventName as Events);
    }
}

export interface ActionHandler {
    getName(): string;
}

export interface CommandHandler extends ActionHandler {
    command: object
}

interface EventHandler extends ActionHandler {
    eventType: Events
    run: (...args: any[]) => void
}

export interface ClientReadyHandler extends EventHandler {
    eventType: Events
    run: (client: Client, handler: DiscordHandler) => void
}

export interface GuildMemberAddHandler extends EventHandler {
    eventType: Events
    run: (client: Client, handler: DiscordHandler, newMember: GuildMember) => void
}

export interface GuildMemberUpdateHandler extends EventHandler {
    eventType: Events
    run: (client: Client, handler: DiscordHandler, oldMember: GuildMember, newMember: GuildMember) => void
}


function mergeDeep<T, U>(
    target: T,
    source: U,
    override = false
): Reconcile<T, U> {
    const result: any = { ...target };

    for (const key in source) {
        const srcVal = (source as any)[key];
        const tgtVal = (target as any)[key];

        if (
            !override &&
            typeof srcVal === 'object' &&
            typeof tgtVal === 'object' &&
            srcVal !== null &&
            tgtVal !== null
        ) {
            result[key] = mergeDeep(tgtVal, srcVal, override);
        } else {
            result[key] = srcVal;
        }
    }

    return result;
}


