import { ClientReadyEvent } from "../../DiscordHandler/eventTypes";
import { Client, Events, TextChannel } from "discord.js";
import mqtt, { MqttClient } from "mqtt";
import { Logger } from "pino";
import { Config } from "../../DiscordHandler/DiscordHandler";

type State = {
  open: boolean;
  openUntil: string;
};

class SpaceStateInfoHandler implements ClientReadyEvent {
  eventType: Events.ClientReady = Events.ClientReady;
  spaceStateInfo?: SpaceStateInfoProcessor;

  execute([], { logger, client, config }) {
    logger.debug("spaceStateInfo execute called");
    logger.debug("spaceStateInfo %s", config);
    if (!this.spaceStateInfo) {
      //const guild = client.guilds.cache.get(config.spaceStateInfo.guildId);
      logger.debug(
        "spaceStateInfo channelId %s",
        config?.spaceStateInfo?.channelId,
      );
      //if (!guild) {
      //    logger.error('guild not found')
      const channel = client.channels.cache.get(
        config.spaceStateInfo.channelId,
      );
      if (!channel || !(channel instanceof TextChannel)) {
        logger.error("channel not found %o", channel);
        return;
      }
      this.spaceStateInfo = new SpaceStateInfoProcessor(
        channel,
        logger,
        config,
        client,
      );
    }
  }

  getName(): string {
    return "spacestate handler";
  }
}

export default SpaceStateInfoHandler;

class SpaceStateInfoProcessor {
  private mqttClient: MqttClient;
  private channel: TextChannel;
  private lastState: State;
  private statechanges = [];
  private logger: Logger;
  private config: any;
  private client: Client;

  constructor(channel: TextChannel, logger: Logger, config, client: Client) {
    this.config = config;
    this.logger = logger.child(
      {},
      { msgPrefix: `[${this.constructor.name}] ` },
    );
    this.channel = channel;
    this.client = client;
    const mqtturl = process.env.MQTT_URL || "mqtt://status.makerspacebonn.de";
    this.logger.info("connecting MQTT URL: %s", mqtturl);
    this.mqttClient = mqtt.connect(mqtturl, {
      username: process.env.MQTT_USER,
      password: process.env.MQTT_PASSWORD,
    });

    const mqttClient = this.mqttClient;

    mqttClient.on("message", async (topic, message) => {
      this.logger.debug("message %o", message.toString());
      const state = JSON.parse(message.toString()) as State;
      if (this.lastState === undefined) {
        this.lastState = state;
        return;
      }

      this.logger.debug("state %o", state);
      if (
        this.lastState.open === state.open &&
        this.lastState.openUntil === state.openUntil
      )
        return;

      this.statechanges.push(state);
      this.lastState = state;
      const statesting = state.open ? "geöffnet." : "geschlossen.";
      this.logger.debug("statestring %o", statesting);
      if (state.open && state.openUntil) {
        await this.channel.send({
          content:
            "Der Makerspace ist bis " + state.openUntil + " " + statesting,
        });
      } else {
        await this.channel.send({
          content: "Der Makerspace ist nun " + statesting,
        });
      }

      this.checkChangeAbuse();
      this.cleanPreviousStateMessages();
    });

    mqttClient.on("connect", () => {
      this.logger.info("connected to mqtt");
      mqttClient.subscribe(this.config.spaceStateInfo.mqttTopic, () => {
        this.logger.info("subscribed %o", this.config.spaceStateInfo.mqttTopic);
      });
    });

    mqttClient.on("error", (err) => {
      this.logger.error("error", err);
    });

    mqttClient.on("close", () => {
      this.logger.warn("mqtt connection closed");
    });

    mqttClient.on("reconnect", () => {
      this.logger.info("mqtt connection reconnected");
    });
  }

  async cleanPreviousStateMessages() {
    this.logger.debug("Cleaning previous state messages");
    const messages = await this.channel.messages.fetch({ limit: 100 });
    this.logger.debug(messages.at(0)?.createdTimestamp);
    this.logger.debug(Date.now());
    const stateMessages = messages.filter(
      (msg) =>
        msg.author.id === this.client.user.id &&
        msg.content.includes("Der Makerspace ist") &&
        msg.createdTimestamp < Date.now() - 5000,
    );

    this.logger.debug("Found %d state messages", stateMessages.size);
    for (const [id, message] of stateMessages) {
      try {
        //this.logger.debug(message);
        await message.delete();
      } catch (error) {
        console.warn(`Nachricht ${id} konnte nicht gelöscht werden:`, error);
      }
    }
  }

  checkChangeAbuse() {
    this.logger.debug("statechanges %o", this.statechanges);
    if (this.statechanges.length > 4) {
      this.statechanges = this.statechanges.filter(
        (state) => state.lastchange > Date.now() / 1000 - 3600,
      );
      this.logger.debug("statechanges length %o", this.statechanges.length);
      if (this.statechanges.length > 4) {
        this.channel.send({
          content: "Hör auf dauernd den Knopf zu drücken!",
        });
      }
    }
  }
}
