// @ts-ignore
import { describe, expect, test } from "bun:test";
import { TrashDate } from "../../src/Services/TrashService";
import { TrashDiscordService } from "../../src/Services/trashDiscordService";

describe("TrashDiscordService.filterTypesNeedingConfirmation", () => {
    const date = new Date("2025-01-01");

    test("removes types listed in skipTypes", () => {
        const dates = [
            new TrashDate("Restmülltonne", date),
            new TrashDate("Papierbehälter", date),
            new TrashDate("Gelbe Behälter", date),
        ];
        const result = TrashDiscordService.filterTypesNeedingConfirmation(dates, ["Restmülltonne"]);
        expect(result.map(t => t.type)).toEqual(["Papierbehälter", "Gelbe Behälter"]);
    });

    test("returns input unchanged when skipTypes is empty", () => {
        const dates = [
            new TrashDate("Restmülltonne", date),
            new TrashDate("Papierbehälter", date),
        ];
        const result = TrashDiscordService.filterTypesNeedingConfirmation(dates, []);
        expect(result.map(t => t.type)).toEqual(["Restmülltonne", "Papierbehälter"]);
    });

    test("returns empty array when all types are skipped", () => {
        const dates = [
            new TrashDate("Restmülltonne", date),
        ];
        const result = TrashDiscordService.filterTypesNeedingConfirmation(dates, ["Restmülltonne"]);
        expect(result).toEqual([]);
    });
});
