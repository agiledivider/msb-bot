
import {defineConfig} from "drizzle-kit";
import * as process from "node:process";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",

    out: "./src/db/migrations",
    dbCredentials: {
        url: process.env.DATABASE_URL as string
    },
    migrations: {
        table: 'migrations',
        schema: 'makerspace_bot'
    },
    verbose: true,
    strict: true
})