import {Client} from "discord.js";
import {ActionHandler, DiscordHandler} from "./DiscordHandler";
import * as fs from "node:fs";
import * as path from 'path';

export class ActionLoader {
    private actions: Map<string, ActionHandler> = new Map();
    private path: string;
    public Ready: Promise<any>;


    constructor(options: ActionLoaderOptions) {
        this.path = options.path
    }


    async load() {
        try {
            // Ensure the directory exists
            if (this.path === undefined || this.path === null || this.path === '') {
                return this.actions
            }

            if (!fs.existsSync(this.path)) {
                throw new Error(`Directory does not exist: ${this.path}`);
            }

            // Process files in the directory
            await this.processDirectory(this.path);

            console.log(`Loaded ${this.actions.size} actions`);
        } catch (error) {
            console.error('Error loading actions:', error);
            throw error;
        }
        return this.actions
    }

    private async processDirectory(directoryPath: string): Promise<void> {
        console.log(`Processing directory: ${directoryPath}`);
        const items = fs.readdirSync(directoryPath);

        for (const item of items) {
            const itemPath = path.join(directoryPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                // Recursively process subdirectories
                await this.processDirectory(itemPath);
            } else if (this.isTypeScriptFile(itemPath)) {
                console.log(`Processing file: ${itemPath}`);
                // If it's a TypeScript file, try to load actions from it
                await this.loadActionsFromFile(itemPath);
            }
        }
    }

    private isTypeScriptFile(filePath: string): boolean {
        return filePath.endsWith('.ts') && !filePath.endsWith('.d.ts');
    }

    private async loadActionsFromFile(filePath: string): Promise<void> {
        try {
            // Convert file path to module path
            const modulePath = this.filePathToModulePath(filePath);

            // Dynamically import the module
            const importedModule = await import(modulePath);

            console.log(importedModule)

            // Check each exported item to see if it's a class implementing Action
            for (const exportName in importedModule) {
                const exportedItem = importedModule[exportName];
                console.log(exportedItem, typeof exportedItem)

                // Skip if not a constructor function
                if (typeof exportedItem !== 'function') continue;

                try {
                    // Try to instantiate and check if it implements Action
                    const instance = new exportedItem();
                    console.log(instance)

                    if (this.isActionHandler(instance)) {
                        console.log("instance", instance)
                        const actionName = instance.getName();
                        this.actions.set(actionName, instance);
                        console.log(`Loaded action: ${actionName} from ${filePath}`);
                    }
                } catch (error) {
                    // Skip items that can't be instantiated or don't implement Action
                    console.log(error)
                }
            }
        } catch (error) {
            console.warn(`Failed to load actions from ${filePath}:`, error);
        }
    }

    private filePathToModulePath(filePath: string): string {
        // Remove the file extension and ensure it's an absolute path
        const absolutePath = path.resolve(filePath);
        return absolutePath.replace(/\.[^/.]+$/, '');
    }

    private isActionHandler(obj: any): obj is ActionHandler {
        return (
            obj &&
            typeof obj.run === 'function' &&
            typeof obj.getName === 'function'
        );
    }
}

export interface ActionLoaderOptions {
    path: string
}