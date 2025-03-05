// @ts-ignore
import {describe, expect, test, setSystemTime, beforeAll} from "bun:test";
import { TrashService, icsTrashRepository, DateService } from "../src/Services/TrashService";




class FakeDateService implements DateService {
    date
    constructor(date: Date) {
        this.date = date
    }
    now() {
        return this.date
    }
}

describe("change opening state", () => {

    test("empty trashservice", async () => {
        const trashService = new TrashService(new icsTrashRepository(__dirname + '/muell_testdata.ics'))
        const trashdates = await trashService.getAllTrashDates()
        expect(trashdates.length).toBe(53)
    })

    test("empty trashservice", async () => {
        const trashService = new TrashService(new icsTrashRepository(__dirname + '/muell_testdata_5_items.ics'))
        const trashdates = await trashService.getAllTrashDates()
        expect(trashdates.length).toBe(10)
    })

    test("empty trashservice", async () => {
        const trashService = new TrashService(
            new icsTrashRepository(__dirname + '/muell_testdata_5_items.ics'),
            new FakeDateService(new Date(2025, 0, 5))
        )
        const trashdates = await trashService.getNextTrashDates()
        expect(trashdates.length).toBe(5)
    })

    test.each(
        [
            [new Date("2025-01-01"), "Sonntag, 5. Januar 2025", "Papierbehälter", 4 ],
            [new Date("2025-01-02"), "Sonntag, 5. Januar 2025", "Papierbehälter", 3 ],
            [new Date("2025-01-04"), "Sonntag, 5. Januar 2025", "Papierbehälter", 1 ],
            [new Date("2025-01-05"), "Sonntag, 5. Januar 2025", "Papierbehälter", 0 ],
            [new Date("2025-01-07"), "Dienstag, 7. Januar 2025", "Gelbe Behälter", 0 ],
        ]
    )("empty trashservice %s %s %s", async (date, timeString, type, daysUntil) => {
        const fakeDateService = new FakeDateService(date)
        const trashService = new TrashService(
            new icsTrashRepository(__dirname + '/muell_testdata_5_items.ics', fakeDateService),
            fakeDateService
        )

        const trashdates = await trashService.getNextTrashDates()
        expect(trashdates[0].timeString()).toBe(timeString)
        expect(trashdates[0].type).toBe(type)
        expect(trashdates[0].daysUntil(date)).toBe(daysUntil)

    })

})