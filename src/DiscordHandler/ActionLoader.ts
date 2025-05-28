import {ActionHandler} from "./DiscordHandler";
import * as fs from "node:fs";
import * as path from 'path';

export class ActionLoader {
    private actions: ActionHandler[] = [];
    private path: string;


    constructor(options: ActionLoaderOptions) {
        this.path = options.path
    }


    load() {
        try {
            // Ensure the directory exists
            if (this.path === undefined || this.path === null || this.path === '') {
                return this.actions
            }

            if (!fs.existsSync(this.path)) {
                throw new Error(`Directory does not exist: ${this.path}`);
            }

            // Process files in the directory
            this.processDirectory(this.path);

            console.log(`Loaded ${this.actions.length} actions`);
        } catch (error) {
            console.error('Error loading actions:', error);
            throw error;
        }
        return this.actions
    }

    private  processDirectory(directoryPath: string): void {
        const items = fs.readdirSync(directoryPath);

        for (const item of items) {
            const itemPath = path.join(directoryPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                this.processDirectory(itemPath);
            } else if (this.isTypeScriptFile(itemPath)) {
                this.loadActionsFromFile(itemPath);
            }
        }
    }

    private isTypeScriptFile(filePath: string): boolean {
        return filePath.endsWith('.ts') && !filePath.endsWith('.d.ts');
    }

    private loadActionsFromFile(filePath: string): void {
        try {
            // Convert file path to module path
            const modulePath = this.filePathToModulePath(filePath);

            // Dynamically import the module
            const importedModule = require(modulePath);
            // Check each exported item to see if it's a class implementing Action
            for (const exportName in importedModule) {
                const exportedItem = importedModule[exportName];
                if (typeof exportedItem !== 'function') continue;

                try {
                    const instance = new exportedItem();
                    if (this.isActionHandler(instance)) {
                        this.actions.push(instance);
                        console.log(`Loaded action: ${instance.getName()} from ${filePath}`);
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