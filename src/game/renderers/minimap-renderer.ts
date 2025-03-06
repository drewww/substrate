import { Display } from '../../display/display';
import { ChunkMetadata } from '../generators/layout-generator';
import { LayoutRenderer } from '../generators/layout-renderer';
import { Point } from '../../types';

export class MinimapRenderer extends LayoutRenderer {
    private playerBlock: Point | null = null;
    private helicopterBlock: Point | null = null;
    private objectiveBlocks: Set<string> = new Set();

    constructor(display: Display) {
        super(display);
    }

    // Override the renderLayout method to add player/helicopter/objective markers
    renderLayout(layout: ChunkMetadata[][]): void {
        super.renderLayout(layout);

        // // Add markers on top of the base layout
        // if (this.playerBlock) {
        //     this.display.createTile(
        //         this.playerBlock.x,
        //         this.playerBlock.y,
        //         'P',
        //         '#FF194D',
        //         '#00000000',
        //         1000  // High z-index to be on top
        //     );
        // }

        // if (this.helicopterBlock) {
        //     this.display.createTile(
        //         this.helicopterBlock.x,
        //         this.helicopterBlock.y,
        //         'H',
        //         '#FF0000',
        //         '#00000000',
        //         1000
        //     );
        // }

        // // Render objectives
        // for (const blockKey of this.objectiveBlocks) {
        //     const [x, y] = blockKey.split(',').map(Number);
        //     this.display.createTile(
        //         x,
        //         y,
        //         '⚑',
        //         '#FFFF00',
        //         '#00000000',
        //         1000
        //     );
        // }
    }

    // Methods to update markers
    // setPlayerBlock(x: number, y: number): void {
    //     this.playerBlock = { x, y };
    // }

    // setHelicopterBlock(x: number, y: number): void {
    //     this.helicopterBlock = { x, y };
    // }

    // addObjectiveBlock(x: number, y: number): void {
    //     this.objectiveBlocks.add(`${x},${y}`);
    // }

    // removeObjectiveBlock(x: number, y: number): void {
    //     this.objectiveBlocks.delete(`${x},${y}`);
    // }

    // clearObjectiveBlocks(): void {
    //     this.objectiveBlocks.clear();
    // }
} 