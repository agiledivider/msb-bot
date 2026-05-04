import { Events } from "discord.js";
import { defineEventHandler } from "../../DiscordHandler/define";

const welcomeMessages: string[] = [
  "**Willkommen [user]**! Schön, dass Du da bist.",
  "🎉**Willkomen [user]**! Bist du hier, damit jemand deine Lötunfälle bewundert? Oder was treibt Dich her?",
  "👋 **Willkommen [user]**! Warnung: Bei uns wird gesägt, gelötet, gebastelt und manchmal auch verzweifelt. Was machst Du gerne?",
  "**Willkommen [user]**! 🚨 Aber Achtung: Dieser Server enthält Späne, Kaffee-Flecken und Leute, die über PIs reden, als wären sie Kuchen. Worüber redest Du gerne?",
  "**Willkommen [user]**! Falls du jemals ‘Ich brauche nur fünf Minuten’ sagst – wir haben auch eine Selbsthilfegruppe. Was machst Du so in 5 Minuten?",
  "**Willkommen [user]**! Der MakerSpace ist voller Menschen, die ‘nur kurz was fragen’ und zack, ist der Abend um. Welches Thema sorgt bei Dir dafür?",
  "**Willkommen [user]!** Falls Du nicht aus versehen hier bist, was treibt Dich her?",
  "**Willkommen [user]!** Schön dass Du da bist. Kennst Du Dich mit Stickmaschinen aus? Oder was machst Du gerne?",
  "**Willkommen [user]!** Wir haben da noch ein- oder zweihundert angefangene Projekte für den MakerSpace fertigzustellen. Wobei könntest Du denn helfen?",
  "**Willkommen [user]!** Wenn Du Luft magst, könntest Du die Absaugung automatisieren. Oder wo liegen Deine Fähigkeiten?",
  "**Willkommen [user]!** Dies ist die erste Stufe des MakerSpace Chaos. Wie magst Du dazu beitragen?",
];

export default defineEventHandler({
  name: "welcome-message",
  eventType: Events.GuildMemberAdd,
  needs: ["logger"],
  async execute([newMember], { logger }) {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) {
      logger.warn(
        "WELCOME_CHANNEL_ID not set; skipping welcome message for %s",
        newMember.displayName,
      );
      return;
    }

    const channel = newMember.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      logger.warn(
        "welcome channel %s not found or not text-based; skipping public welcome",
        channelId,
      );
      return;
    }

    const template =
      welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const message = template.replace(/\[user]/g, `<@${newMember.id}>`);

    try {
      await newMember.send({
        content: `Hallo ${newMember.displayName}! \n\nFalls Du schon Mitglied bist und einen Code im Makerspace mitgenommen hast, kannst Du Dich im Kanal <#763379471533211708> mit dem Command \`/membercode <code>\` für den Mitgliederbereich freischalten.`,
      });

      await channel.send({ content: message });
    } catch (e) {
      logger.error(
        "failed to send welcome message: %s",
        e instanceof Error ? e.message : String(e),
      );
    }
  },
});
