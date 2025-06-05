import {TrashDate, TrashRepository} from "./TrashService";

class TestTrashRepository implements TrashRepository {
    async getNextTrashDates(): Promise<TrashDate[]> {
        return [
            new TrashDate('Papier', new Date("2025-06-06")),
        ]
    }
    async getAllTrashDates(): Promise<TrashDate[]> {
        return []
    }
}

export default TestTrashRepository
