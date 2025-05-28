import { integer, pgTable, varchar } from "drizzle-orm/pg-core";
import {timestamp} from "drizzle-orm/pg-core/columns/timestamp";
export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    age: integer().notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
});

export const memberCodesTable = pgTable("membercodes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar({ length: 255 }).notNull().unique(),
    userId: varchar(),
    guildId: varchar({ length: 255 }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    usedAt: timestamp(),
});