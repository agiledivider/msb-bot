import { Events, TextChannel } from "discord.js";
import mqtt, { MqttClient } from "mqtt";
import { Logger } from "pino";
import { z } from "zod";
import { defineEventHandler } from "../../DiscordHandler/define";
import { registerConfigSlice } from "../../Services/registry";

const configSlice = registerConfigSlice({
  spaceStateInfo: z.object({
    channelId: z.string(),
    guildId: z.string(),
    mqttTopic: z.string(),
  }),
});

declare module "../../Services/registry" {
  interface Config extends z.infer<typeof configSlice> {}
}

type State = {
  open: boolean;
  openUntil: string;
};

// ClientReady can fire more than once across reconnects; the module-level
// reference makes sure we only spin up one MQTT subscriber.
let processor: SpaceStateInfoProcessor | undefined;

export default defineEventHandler({
  name: "spacestate handler",
  eventType: Events.ClientReady,
  needs: ["client", "logger", "config"],
  execute([], { client, logger, config }) {
    logger.debug("spaceStateInfo execute called");
    if (processor) return;

    const channelId = config.spaceStateInfo.channelId;
    logger.debug("spaceStateInfo channelId %s", channelId);

    const channel = client.channels.cache.get(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.error("channel not found: %s", String(channel));
      return;
    }

    processor = new SpaceStateInfoProcessor(
      channel,
      logger,
      config.spaceStateInfo.mqttTopic,
    );
  },
});

class SpaceStateInfoProcessor {
  private mqttClient: MqttClient;
  private channel: TextChannel;
  private lastState: State | undefined;
  private statechanges: State[] = [];
  private logger: Logger;
  private mqttTopic: string;

  constructor(channel: TextChannel, logger: Logger, mqttTopic: string) {
    this.mqttTopic = mqttTopic;
    this.logger = logger.child(
      {},
      { msgPrefix: `[${this.constructor.name}] ` },
    );
    this.channel = channel;
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
    });

    mqttClient.on("connect", () => {
      this.logger.info("connected to mqtt");
      mqttClient.subscribe(this.mqttTopic, () => {
        this.logger.info("subscribed %o", this.mqttTopic);
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

  checkChangeAbuse() {
    this.logger.debug("statechanges %o", this.statechanges);
    if (this.statechanges.length > 4) {
      this.statechanges = this.statechanges.filter(
        (state: any) => state.lastchange > Date.now() / 1000 - 3600,
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
