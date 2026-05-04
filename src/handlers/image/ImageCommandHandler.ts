import { Client, Events, Message } from "discord.js";
import {
  DiscordHandler,
  MessageCreateHandler as MessageCreateHandlerInterface,
} from "../../DiscordHandler/DiscordHandler";
import { Logger } from "pino";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export class ImageCommandHandler implements MessageCreateHandlerInterface {
  eventType: Events.MessageCreate = Events.MessageCreate;

  async execute(
    [message]: [message: Message],
    {
      client,
      handler,
      logger,
    }: { client: Client<true>; handler: DiscordHandler; logger: Logger },
  ) {
    // Get logger from handler services
    // Only process messages that start with !image
    if (message.inGuild()) return;
    if (message.author.bot) return;

    // Only process messages that start with !image
    if (!message.content.toLowerCase().startsWith("!image")) return;

    logger?.debug(
      "Processing !image command from user %s",
      message.author.displayName,
    );

    // Check if message has attachments
    if (message.attachments.size === 0) {
      await message.reply({
        content:
          "❌ Bitte hänge ein Bild an deine Nachricht an! Nutze: `!image` + Bild hochladen",
      });
      return;
    }

    // Process each attachment
    for (const [attachmentId, attachment] of message.attachments) {
      try {
        // Check if attachment is an image
        if (
          !attachment.contentType ||
          !attachment.contentType.startsWith("image/")
        ) {
          await message.reply({
            content: `❌ Die Datei "${attachment.name}" ist kein Bild. Bitte lade nur Bilddateien hoch.`,
          });
          continue;
        }

        // Get file extension from content type or filename
        const fileExtension = this.getFileExtension(attachment);
        const fileName = `${message.author.id}${fileExtension}`;
        const uploadsDir = path.join(process.cwd(), "uploads");
        const filePath = path.join(uploadsDir, fileName);

        // Ensure uploads directory exists
        try {
          await access(uploadsDir);
        } catch {
          await mkdir(uploadsDir, { recursive: true });
          logger?.info("Created uploads directory at %s", uploadsDir);
        }

        // Download and save the image
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await writeFile(filePath, buffer);

        logger?.info(
          "Saved image from user %s (%s) to %s",
          message.author.username,
          message.author.id,
          filePath,
        );

        await message.reply({
          content: `✅ Bild erfolgreich gespeichert als \`${fileName}\``,
        });
      } catch (error) {
        logger?.error(
          "Failed to save image from user %s: %o",
          message.author.id,
          error,
        );

        await message.reply({
          content:
            "❌ Fehler beim Speichern des Bildes. Bitte versuche es erneut.",
        });
      }
    }
  }

  private getFileExtension(attachment: any): string {
    // Try to get extension from filename first
    if (attachment.name) {
      const ext = path.extname(attachment.name);
      if (ext) {
        return ext;
      }
    }

    // Fall back to content type mapping
    const contentType = attachment.contentType;
    const extensionMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/bmp": ".bmp",
      "image/svg+xml": ".svg",
    };

    return extensionMap[contentType] || ".jpg";
  }

  getName(): string {
    return "ImageCommandHandler";
  }
}
