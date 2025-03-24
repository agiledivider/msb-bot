import {Client, GuildMember} from "discord.js";
import { Events } from "discord.js";
import {ActionLoader} from "./ActionLoader";

export interface DiscordHandlerOptions {
    client: Client,
    handlerPath: string
}

export class DiscordHandler {
    private services: any;
    private client: Client;
    private actionLoader: ActionLoader;

    constructor (options: DiscordHandlerOptions)  {
        this.services = []
        this.client = options.client
        this.actionLoader = new ActionLoader({
            path: options.handlerPath
        })
    }

    async registerActions() {
        const actions = await this.actionLoader.load()

        actions.forEach((action: any) => {
            this.client.on(action.eventType.toString(), action.run.bind(this, this.client, this))
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



interface EventHandler extends ActionHandler {
    run: (...args: any[]) => void
}

export interface ClientReadyHandler extends EventHandler {
    eventType: Events.ClientReady
    run: (client: Client, handler: DiscordHandler) => void
}

export interface GuildMemberAddHandler extends EventHandler {
    eventType: Events.GuildMemberAdd
    run: (client: Client, handler: DiscordHandler, newMember: GuildMember) => void
}

