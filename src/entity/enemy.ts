import { Entity } from './entity';
import { Point } from '../types';
import { MoveCooldownComponent } from '../game/test/components/move-cooldown.component';
import { SymbolComponent } from './components/symbol-component';
export class EnemyEntity extends Entity {
    constructor(position: Point) {
        super(position);
        this.setComponent(new SymbolComponent(
            'E',             
            '#FFFFFFFF',      
            '#FF000055',   
            1               
        ));
        this.setComponent(new MoveCooldownComponent(4000, 4000));
    }
} 