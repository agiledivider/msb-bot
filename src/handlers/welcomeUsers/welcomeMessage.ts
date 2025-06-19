import {DiscordHandler, GuildMemberAddHandler} from "../../DiscordHandler/DiscordHandler";
import {Client, Events, GuildMember} from "discord.js";


export default class WelcomeMessage implements GuildMemberAddHandler{
    private channel: any;


    getName(): string {
        return "Welcome Message";
    }

    eventType: Events = Events.GuildMemberAdd
    run(client: Client, handler: DiscordHandler, newMember: GuildMember) {
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

        try {
            this.channel = newMember.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID)
            const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)].replace(/\[user]/g, `<@${newMember.id}>`);

            newMember.send({
                content: `Hallo ${newMember.displayName}! \n\nFalls Du schon Mitglied bist und einen Code im Makerspace mitgenommen hast, kannst Du Dich im Kanal <#763379471533211708> mit dem Command \`/membercode <code>\` für den Mitgliederbereich freischalten.`
            })

            this.channel.send({
                content: message
            })

        } catch (e) {
            console.log(e)
        }
    }
}