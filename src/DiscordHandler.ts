import { Client } from "discord.js";
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
            console.log("registering", action)
            this.client.on(action.eventType, action.run.bind(this, this.client, this))
        })

        console.log("actions registered", this.client.listeners())

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
    eventType: Events
}



export interface ClientReadyHandler extends EventHandler {
    run(client: Client, handler: DiscordHandler)
}

