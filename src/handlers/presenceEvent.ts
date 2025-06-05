import {Client, Events, Presence} from "discord.js";
import {DiscordHandler, PresenceUpdateHandler} from "../DiscordHandler/DiscordHandler";

class DummyPresenceUpdateHandler implements PresenceUpdateHandler {
    eventType: Events.PresenceUpdate = Events.PresenceUpdate;
    run(client: Client, handler: DiscordHandler, oldPresence: Presence, newPresence: Presence) {
        console.log('NOOOOOOOOOO')
    }

    execute([oldPresence, newPresence], { logger }) {
        logger.trace('presence updated: %s %s -> %s', oldPresence.member.displayName, oldPresence.status, newPresence.status)
    }
    getName(): string {
        return "some test ready handler"
    }

}

export default DummyPresenceUpdateHandler