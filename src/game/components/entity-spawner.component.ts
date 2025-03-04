import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";



export const SPAWNER_TYPES = {
    'vehicle-followable': {
        'id': 'vehicle-followable',
        'position': { 'x': 0, 'y': 0 },
        'components': [
            {
                "type": "symbol",
                "char": "⧯",
                "foreground": "#FFFFFF",
                "background": "#0000FF",
                "zIndex": 100,
                "lockRotationToFacing": true
            },
            {
                "type": "facing",
                "direction": 1
            },
            {
                "type": "opacity"
            },
            {
                "type": "impassable"
            },
            {
                "type": "move"
            },
            {
                "type": "followable"
            },
            {
                "type": "cooldown",
                "cooldowns": {
                  "move": {
                    "base": 4,
                    "current": 4,
                    "ready": false
                  }
                }
              }
        ]
    }
}

// First define the valid spawn types as a type
export type SpawnerType = keyof typeof SPAWNER_TYPES;

@RegisterComponent('entity-spawner')
export class EntitySpawnerComponent extends Component {
    type: 'entity-spawner' = 'entity-spawner';

    constructor(
        public spawnTypes: SpawnerType[] = [],
    ) {
        super();
    }
}