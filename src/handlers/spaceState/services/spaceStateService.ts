
export class SpaceStateService {
    private stateApiUrl: string;
    private apiKey: string;

    constructor() {
        this.stateApiUrl = process.env.MSB_STATE_API_URL || ''
        if (this.stateApiUrl === '') {
            throw new Error('MSB_STATE_API_URL is not set')
        }
        this.apiKey = process.env.MSB_STATE_API_KEY || ''
        if (this.apiKey === '') {
            throw new Error('MSB_STATE_API_KEY is not set')
        }
    }

    async changeState(state: String, until: String | null) : Promise<boolean> {
        let requestUrl =this.stateApiUrl + `${state}`
        if (state == 'open' && until && until.match(/[012]?\d{1}:\d{2}/)) {
            requestUrl += `Until/${until}`
        }

        const response = await fetch(requestUrl, {
            headers: {
                'msb-key': this.apiKey
            }
        })

        return response.status === 200;

    }
}