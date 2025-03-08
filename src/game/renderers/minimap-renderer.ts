import { Display } from '../../display/display';
import { ChunkMetadata } from '../generators/layout-generator';
import { LayoutRenderer } from '../generators/layout-renderer';
import { Point } from '../../types';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { removeOpacity } from '../../display/util/color';
import { ObjectiveComponent } from '../components/objective.component';
import { logger } from '../../util/logger';

export class MinimapRenderer extends LayoutRenderer {
    private playerBlock: Point | null = null;
    private helicopterBlock: Point | null = null;
    private objectiveTiles: Map<string, string> = new Map(); // Map entityId -> tileId
    private world: World;
    private playerTile: string | null = null;
    private helicopterTile: string | null = null;
    private exploredBlocks: Set<string> = new Set();
    private isVisible: boolean = false;

    constructor(display: Display, world: World) {
        super(display);
        this.world = world;
        
        // Hide by default
        this.hide();

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

        world.on('entityAdded', (data: { entity: Entity }) => {
            if (data.entity.hasComponent('objective') && 
                (data.entity.getComponent('objective') as ObjectiveComponent)?.active === true) {
                this.objectiveTiles.set(data.entity.getId(), this.display.createTile(
                    data.entity.getPosition().x,
                    data.entity.getPosition().y,
                    '◎',
                    '#55CE4AFF',
                    '#00000000',
                    1000,
                    {
                        fontWeight: 'bold'
                    }
                ));
            }
        });
        
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
            } else if (data.entity.hasComponent('objective') && 
                       (data.entity.getComponent('objective') as ObjectiveComponent)?.active === true) {
                const blockPos = {
                    x: Math.floor(data.to.x / 12),
                    y: Math.floor(data.to.y / 12)
                };
                
                // Just update the objective tile position
                const tileId = this.objectiveTiles.get(data.entity.getId());
                if (tileId) {
                    this.display.moveTile(tileId, blockPos.x, blockPos.y);
                }
            }
        });

        world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
            if (data.componentType === 'objective') {
                const objective = data.entity.getComponent('objective') as ObjectiveComponent;
                const entityId = data.entity.getId();
                
                if (objective.active) {
                    // Add or update objective tile
                    const pos = data.entity.getPosition();
                    const blockPos = {
                        x: Math.floor(pos.x / 12),
                        y: Math.floor(pos.y / 12)
                    };
                    
                    if (!this.objectiveTiles.has(entityId)) {
                        const tileId = this.display.createTile(
                            blockPos.x,
                            blockPos.y,
                            '◎',
                            '#55CE4AFF',
                            '#00000000',
                            1000,
                            {
                                fontWeight: 'bold'
                            }
                        );
                        this.objectiveTiles.set(entityId, tileId);
                        logger.info(`Created new objective tile ${tileId} for entity ${entityId}`);
                    }
                } else {
                    // Remove objective tile when objective becomes inactive
                    const tileId = this.objectiveTiles.get(entityId);
                    if (tileId) {
                        logger.info(`Removing objective tile ${tileId} for entity ${entityId}`);
                        this.display.removeTile(tileId);
                        this.objectiveTiles.delete(entityId);
                    }
                }
            }
        });

        // We can keep this as a backup cleanup mechanism
        world.on('componentRemoved', (data: { entity: Entity, componentType: string }) => {
            if (data.componentType === 'objective') {
                const entityId = data.entity.getId();
                const tileId = this.objectiveTiles.get(entityId);
                if (tileId) {
                    logger.info(`Cleaning up objective tile ${tileId} for removed entity ${entityId}`);
                    this.display.removeTile(tileId);
                    this.objectiveTiles.delete(entityId);
                }
            }
        });
    }

    private updatePlayerBlock() {
        if (this.playerBlock && this.playerTile) {
            this.display.moveTile(this.playerTile, this.playerBlock.x, this.playerBlock.y);
        }
    }

    private updateHelicopterBlock() {
        if (this.helicopterBlock && this.helicopterTile) {
            this.display.moveTile(this.helicopterTile, this.helicopterBlock.x, this.helicopterBlock.y);
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

        // Add markers for all active objectives
        const objectives = this.world.getEntitiesWithComponent('objective')
            .filter(entity => (entity.getComponent('objective') as ObjectiveComponent)?.active === true);
        
        objectives.forEach(objective => {
            const pos = objective.getPosition();
            const blockPos = {
                x: Math.floor(pos.x / 12),
                y: Math.floor(pos.y / 12)
            };
            
            const tileId = this.display.createTile(
                blockPos.x,
                blockPos.y,
                '◎',
                '#55CE4AFF',
                '#00000000',
                1000,
                {
                    fontWeight: 'bold'
                }
            );
            
            this.objectiveTiles.set(objective.getId(), tileId);
        });
    }

    public show(): void {
        if (!this.isVisible) {
            this.isVisible = true;
            const canvas = this.display.getDisplayCanvas();
            canvas.style.position = 'absolute';
            canvas.style.top = '20px';  // Adjust these values as needed
            canvas.style.right = '20px';
            canvas.style.width = '200px';  // Adjust size as needed
            canvas.style.height = '200px';
            canvas.style.display = 'block';
            canvas.style.border = '2px solid #333';
            canvas.style.borderRadius = '4px';
            canvas.style.backgroundColor = '#000';
            canvas.style.zIndex = '1000';
        }
    }

    public hide(): void {
        if (this.isVisible) {
            this.isVisible = false;
            const canvas = this.display.getDisplayCanvas();
            canvas.style.display = 'none';
        }
    }

    public isShown(): boolean {
        return this.isVisible;
    }
} 