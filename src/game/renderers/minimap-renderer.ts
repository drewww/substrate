import { Display } from '../../display/display';
import { ChunkMetadata } from '../generators/layout-generator';
import { LayoutRenderer } from '../generators/layout-renderer';
import { Point } from '../../types';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { removeOpacity } from '../../display/util/color';
import { ObjectiveComponent } from '../components/objective.component';

export class MinimapRenderer extends LayoutRenderer {
    private playerBlock: Point | null = null;
    private helicopterBlock: Point | null = null;
    private objectiveBlocks: Set<string> = new Set();
    private world: World;
    private playerTile: string | null = null;
    private helicopterTile: string | null = null;
    private exploredBlocks: Set<string> = new Set();
    private objectiveBlock: any;
    private objectiveTile: string | null = null;

    constructor(display: Display, world: World) {
        super(display);
        this.world = world;

        const player = this.world.getPlayer();
        if (player) {
            this.playerBlock = {
                x: Math.floor(player.getPosition().x / 12),
                y: Math.floor(player.getPosition().y / 12)
            };
            this.markBlockExplored(this.playerBlock);
        }

        const helicopter = this.world.getEntitiesWithComponent('aoe-damage')[0];
        if (helicopter) {
            this.helicopterBlock = {
                x: Math.floor(helicopter.getPosition().x / 12),
                y: Math.floor(helicopter.getPosition().y / 12)
            };
        }

        const objective = this.world.getEntitiesWithComponent('objective').filter(entity => (entity.getComponent('objective') as ObjectiveComponent)?.active === true)[0];
        if (objective) {
            this.objectiveBlock = {
                x: Math.floor(objective.getPosition().x / 12),
                y: Math.floor(objective.getPosition().y / 12)
            };
        }

        world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
            if (data.entity.hasComponent('player')) {
                this.playerBlock = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };
                
                this.markBlockExplored(this.playerBlock);
                this.updatePlayerBlock();
            } else if (data.entity.hasComponent('aoe-damage')) {
                this.helicopterBlock = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };

                this.updateHelicopterBlock();
            } else if (data.entity.hasComponent('objective') && (data.entity.getComponent('objective') as ObjectiveComponent)?.active === true) {
               
                this.objectiveBlock = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };
               
                this.updateObjectiveBlock();
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

    updateObjectiveBlock() {
        if (this.objectiveBlock && this.objectiveTile) {
            this.display.moveTile(this.objectiveTile, this.objectiveBlock.x, this.objectiveBlock.y);
        }
    }

    private markBlockExplored(block: Point): void {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = block.x + dx;
                const y = block.y + dy;
                const key = `${x},${y}`;
                if (!this.exploredBlocks.has(key)) {
                    this.exploredBlocks.add(key);
                    const tileId = this.getTileIdAt(x, y);
                    if (tileId) {
                        const tile = this.display.getTile(tileId);
                        if (tile) {
                            // Restore original colors but with 50% opacity
                            this.display.updateTile(tileId, {
                                fg: removeOpacity(tile.color) + '70',
                                bg: removeOpacity(tile.backgroundColor) + '70'
                            });
                        }
                    }
                }
            }
        }
    }

    private getTileIdAt(x: number, y: number): string | null {
        const tiles = this.display.getTilesAt(x, y);
        return tiles.length > 0 ? tiles[0].id : null;
    }

    renderLayout(layout: ChunkMetadata[][]): void {
        this.processRoadConnections(layout);
        this.display.clear();

        // Render all chunks with fog of war
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                const isExplored = this.exploredBlocks.has(`${x},${y}`);
                const chunk = layout[y][x];
                
                if (isExplored) {
                    // Render with 50% opacity
                    this.renderChunk(chunk, x, y);

                    const tileId = this.getTileIdAt(x, y);
                    if (tileId) {
                        const tile = this.display.getTile(tileId);
                        if (tile) {
                            this.display.updateTile(tileId, {
                                fg: removeOpacity(tile.color) + '70',
                                bg: removeOpacity(tile.backgroundColor) + '70'
                            });
                        }
                    }
                } else {
                    // Render completely hidden (just black)
                    this.renderChunk(chunk, x, y);

                    const tileId = this.getTileIdAt(x, y);
                    if (tileId) {
                        const tile = this.display.getTile(tileId);
                        if (tile) {
                            this.display.updateTile(tileId, {
                                fg: removeOpacity(tile.color) + '00',
                                bg: removeOpacity(tile.backgroundColor) + '00'
                            });
                        }
                    }
                }
            }
        }

        // Add markers
        if (this.playerBlock) {
            this.playerTile = this.display.createTile(
                this.playerBlock.x,
                this.playerBlock.y,
                '⧋',
                '#FFFFFFFF',
                '#00000000',
                1000,
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

        // this assumes a single objective block
        if (this.objectiveBlock) {
            this.objectiveTile = this.display.createTile(
                this.objectiveBlock.x,
                this.objectiveBlock.y,
                '◎',
                '#FFCC0DFF',
                '#00000000',
                1000,
                {
                    fontWeight: 'bold'
                }
            );
        }
    }
} 