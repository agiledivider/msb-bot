import {ActionHandler, CommandHandler, EventHandler} from "./DiscordHandler";
import * as fs from "node:fs";
import * as path from 'path';
import {BaseLogger} from "pino";

export class ActionLoader {
    private actions: ActionHandler[] = [];
    private path: string;
    private logger: BaseLogger;


    constructor(options: ActionLoaderOptions) {
        this.path = options.path
        this.logger = options.logger
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

            this.logger.info(`Loaded ${this.actions.length} actions`);
        } catch (error) {
            this.logger.error('Error loading actions:', error);
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
            const fileInfo = filePath.replace(this.path, '')

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
                        if (this.isEventHandler(instance)) {
                            this.logger.debug(`Loaded EventHandler: ${instance.eventType} from ${fileInfo}`);
                        } else if (this.isCommandHandler(instance)) {
                            this.logger.debug(`Loaded CommandHandler: ${instance.command.name} from ${fileInfo}`);
                        } else {
                            this.logger.warn(`Loaded unknown action: %o from ${fileInfo}`, instance);
                        }
                    }
                } catch (error) {
                    this.logger.error(error)
                }
            }
        } catch (error) {
            this.logger.warn(`Failed to load actions from ${filePath}: %o`, error);
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
            (typeof obj.run === 'function' || typeof obj.execute === 'function') &&
            typeof obj.getName === 'function'
        );
    }

    private isEventHandler(obj: any): obj is EventHandler {
        return (
            obj &&
            typeof obj.eventType === 'string'
        );
    }

    private isCommandHandler(obj: any): obj is CommandHandler {
        return (
            obj &&
            typeof obj.command === 'object'
        );
    }
}

export interface ActionLoaderOptions {
    path: string
    logger?: BaseLogger
}