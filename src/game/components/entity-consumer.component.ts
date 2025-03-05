import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('entity-consumer')
export class EntityConsumerComponent extends Component {
    type: 'entity-consumer' = 'entity-consumer';

    constructor() {
        super();
    }
}