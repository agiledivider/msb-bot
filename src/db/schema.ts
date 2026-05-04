import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import {timestamp} from "drizzle-orm/pg-core/columns/timestamp";
export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar({ length: 255 }).notNull(),
    guildId: varchar({ length: 255 }).notNull(),
    firstName: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    age: integer(),
    email: varchar({ length: 255 }),
    lastSeen: timestamp().defaultNow().notNull(),
    lastContacted: timestamp(),
});

export const memberCodesTable = pgTable("membercodes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar({ length: 255 }).notNull().unique(),
    userId: varchar(),
    guildId: varchar({ length: 255 }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    usedAt: timestamp(),
});