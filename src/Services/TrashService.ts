export interface DateService {
    now(): Date
}

export interface TrashRepository {
    getAllTrashDates(): Promise<TrashDate[]>
    getNextTrashDates(): Promise<TrashDate[]>
}

export class TrashDate {
    type: string
    startDate: Date

    constructor(type, startDate) {
        this.type = type
        this.startDate = startDate
    }

    daysUntil(date: Date) {
        const diff = (this.startDate).valueOf() - (date).valueOf()
        return Math.ceil(diff / 1000 / 60 / 60 / 24)
    }

    timeString() {
        return (this.startDate).toLocaleString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Berlin'
        })
    }

}

export class RealDateService implements DateService {
    now(): Date {
        return new Date()
    }
}


export class TrashService {
    private trashRepository: any;
    private dateService: DateService | null

    constructor(trashRepository: TrashRepository, dateService : DateService | null = null) {
        this.trashRepository = trashRepository
        this.dateService = dateService
    }

    async getNextTrashDates() : Promise<TrashDate[]> {
        return await this.trashRepository.getNextTrashDates()
    }

    async getAllTrashDates(): Promise<TrashDate[]> {
        return await this.trashRepository.getAllTrashDates()
    }
}


interface IcalEvent {
    summary: {
        val: string
    }
    start: string
    type: string
}

import * as ical from "node-ical";

export class icsTrashRepository implements TrashRepository {
    trashDates: TrashDate[] = []
    private dateService: DateService | null;

    constructor(icsFile: string = __dirname + '/../muell.ics', dateService: DateService | null = null) {
        this.dateService = dateService
        var events: any = ical.sync.parseFile(icsFile)
        for (const event of Object.values(events) as IcalEvent[]) {
            if (event.summary?.val.match(/Bio|Gross/)) continue
            if (event.type !== 'VEVENT') continue

            this.trashDates.push(
                new TrashDate(
                    event.summary?.val.replace(/ae/ig, 'ä').replace(/ue/ig, 'ü').trim(),
                    new Date(event.start),
                )
            )
        }
        this.trashDates = this.trashDates.sort((a, b) => a.startDate.valueOf() - b.startDate.valueOf())
    }

    async getNextTrashDates(): Promise<TrashDate[]> {
        var uniqueTrashDates = {}
        for (const trashDate of this.trashDates) {
            if (this.dateService !== null && trashDate.startDate.valueOf() < this.dateService.now().valueOf()) continue
            if (!uniqueTrashDates[trashDate.type]) {
                uniqueTrashDates[trashDate.type] = trashDate
            } else if (uniqueTrashDates[trashDate.type].startDate > trashDate.startDate) {
                uniqueTrashDates[trashDate.type] = trashDate
            }
        }
        return Object.values(uniqueTrashDates) as TrashDate[]
    }


    async getAllTrashDates(): Promise<TrashDate[]> {
        return this.trashDates
    }


}