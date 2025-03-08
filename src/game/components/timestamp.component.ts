import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('timestamp')
export class TimestampComponent extends Component {
    type: 'timestamp' = 'timestamp';
    private static bestTime: number | null = null;
    public finalTime: number | null = null;

    constructor(public start: number = 0) {
        super();
    }

    public checkAndUpdateBestTime(endTime: number): void {
        const currentTime = endTime - this.start;
        
        if (TimestampComponent.bestTime === null || currentTime < TimestampComponent.bestTime) {
            TimestampComponent.bestTime = currentTime;
        }
        this.finalTime = currentTime;
    }

    public static getBestTime(): number | null {
        return TimestampComponent.bestTime;
    }

    static fromJSON(data: any): TimestampComponent {
        return new TimestampComponent(data.start);
    }

    toJSON(): any {
        return {
            start: this.start,
            finalTime: this.finalTime
        };
    }
}