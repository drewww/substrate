import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('vehicle-leader')
export class VehicleLeaderComponent extends Component {
    type: 'vehicle-leader' = 'vehicle-leader';

    constructor(public vehicleId: number = 0) {
        super();
    }
}