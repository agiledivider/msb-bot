import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "../../../db/schema";
import {and, eq, isNull } from "drizzle-orm";
import {InsertProject, Project, projectsTable} from "../../../db/schema";

export class ProjectService {
    private guildId: string;
    private db: any

    constructor(guildId: string) {
        this.guildId = guildId
        this.db = drizzle(process.env.DATABASE_URL, {schema, logger: true});
    }

    async getProjects() :  Promise<Project[]> {
        return await this.db.query.projectsTable.findMany({
            where: (projects: typeof projectsTable) =>
                eq(projects.guildId, this.guildId)
        })
    }


    async getActiveProjects() : Promise<Project[]> {
        return await this.db.query.projectsTable.findMany({
            where: (projects: typeof projectsTable) =>
                and(
                    eq(projects.guildId, this.guildId),
                    isNull(projects.doneAt)
                )
        })
    }

    async addProject(project: InsertProject) : Promise<Project> {
        return await this.db.insert(projectsTable).values(project).returning()
    }

}

