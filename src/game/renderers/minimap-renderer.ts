import { Display } from '../../display/display';
import { ChunkMetadata } from '../generators/layout-generator';
import { LayoutRenderer } from '../generators/layout-renderer';
import { Point } from '../../types';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';

export class MinimapRenderer extends LayoutRenderer {
    private playerBlock: Point | null = null;
    private helicopterBlock: Point | null = null;
    private objectiveBlocks: Set<string> = new Set();
    private world: World;
    private playerTile: string | null = null;
    private helicopterTile: string | null = null;

    constructor(display: Display, world: World) {
        super(display);
        this.world = world;

        const player = this.world.getPlayer();
        if (player) {
            this.playerBlock = {
                x: Math.floor(player.getPosition().x / 12),
                y: Math.floor(player.getPosition().y / 12)
            };
        }

        const helicopter = this.world.getEntitiesWithComponent('aoe-damage')[0];
        if (helicopter) {
            this.helicopterBlock = {
                x: Math.floor(helicopter.getPosition().x / 12),
                y: Math.floor(helicopter.getPosition().y / 12)
            };
        }

        world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
            if (data.entity.hasComponent('player')) {
                this.playerBlock = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };

                this.updatePlayerBlock();
            } else if (data.entity.hasComponent('aoe-damage')) {
                this.helicopterBlock = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };

                this.updateHelicopterBlock();
            }
        });
    }

    updatePlayerBlock() {
        if (this.playerBlock && this.playerTile) {
            this.display.moveTile(this.playerTile, this.playerBlock.x, this.playerBlock.y);
        }
    }

    updateHelicopterBlock() {
        if (this.helicopterBlock && this.helicopterTile) {
            this.display.moveTile(this.helicopterTile, this.helicopterBlock.x, this.helicopterBlock.y);
        }
    }

    // Override the renderLayout method to add player/helicopter/objective markers
    renderLayout(layout: ChunkMetadata[][]): void {
        super.renderLayout(layout);

        // Add markers on top of the base layout
        if (this.playerBlock) {
            this.playerTile = this.display.createTile(
                this.playerBlock.x,
                this.playerBlock.y,
                '⧋',
                '#FFFFFFFF',
                '#00000000',
                1000  // High z-index to be on top
                ,
                {
                    rotation: Math.PI/2,
                    fontWeight: 'bold'
                }
            );
        }

        if (this.helicopterBlock) {
            this.helicopterTile = this.display.createTile(
                this.helicopterBlock.x,
                this.helicopterBlock.y,
                '🜛',
                '#FF0000FF',
                '#00000000',
                1000,
                {
                    fontWeight: 'bold'
                }
            );
        }

        // Render objectives
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