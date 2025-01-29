import { Component } from '../../../entity/component';

export enum EnemyAIMode {
    IDLE = 'idle',
    PATROL = 'patrol',
    CHASE = 'chase',
    FLEE = 'flee'
}

export enum EnemyAIType {
    EMP_TURRET = 'emp_turret',
    FOLLOWER = 'follower',
    FAST_FOLLOWER = 'fast_follower'
}

export class EnemyAIComponent extends Component {
    public readonly type = 'enemyAI';

    constructor(
        public aiType: EnemyAIType = EnemyAIType.EMP_TURRET,
        public turnsLocked: number = 0,
        public visionRadius: number = 5,
        public mode: EnemyAIMode = EnemyAIMode.IDLE
    ) {
        super();
    }

    clone(): EnemyAIComponent {
        return new EnemyAIComponent(
            this.aiType,
            this.turnsLocked,
            this.visionRadius,
            this.mode
        );
    }

    toJSON(): any {
        return {
            turnsLocked: this.turnsLocked,
            visionRadius: this.visionRadius,
            mode: this.mode
        };
    }

    static fromJSON(json: any): EnemyAIComponent {
        return new EnemyAIComponent(
            json.turnsLocked,
            json.visionRadius,
            json.mode
        );
    }
} 