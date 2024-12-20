import { Entity } from './entity';
import { Point } from '../types';
import { SymbolComponent } from './component';
import { MoveCooldownComponent } from '../game/test/components/move-cooldown.component';

export class EnemyEntity extends Entity {
    constructor(position: Point) {
        super(position);
        this.setComponent(new SymbolComponent(
            'E',             
            '#FF0000',      
            'transparent',   
            1               
        ));
        this.setComponent(new MoveCooldownComponent(4000, 4000));
    }
} 