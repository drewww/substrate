import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('timestamp')
export class TimestampComponent extends Component {
    type: 'timestamp' = 'timestamp';
    public bestTime: number | null = null;
    public finalTime: number | null = null;

    constructor(public start: number = 0) {
        super();
    }

    public checkAndUpdateBestTime(endTime: number): void {
        const currentTime = endTime - this.start;
        
        if (this.bestTime === null || currentTime < this.bestTime) {
            this.bestTime = currentTime;
        }
        this.finalTime = currentTime;
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