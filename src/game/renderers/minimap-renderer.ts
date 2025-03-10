import { Display } from '../../display/display';
import { ChunkMetadata } from '../generators/layout-generator';
import { LayoutRenderer } from '../generators/layout-renderer';
import { Point } from '../../types';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { removeOpacity } from '../../display/util/color';
import { ObjectiveComponent } from '../components/objective.component';
import { logger } from '../../util/logger';
import { LockedComponent } from '../components/locked.component';

export class MinimapRenderer extends LayoutRenderer {
    private playerBlock: Point | null = null;
    private helicopterBlock: Point | null = null;
    // private objectiveTiles: Map<string, string> = new Map(); // Map entityId -> tileId
    private objectiveTile: string | null = null;
    private world: World;
    private playerTile: string | null = null;
    private helicopterTile: string | null = null;
    private exploredBlocks: Set<string> = new Set();
    private isVisible: boolean = false;
    private firstLock: boolean = true;

    constructor(display: Display, world: World, private readonly minimapCellSize: number = 20) {
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

                    this.updateObjectiveTile(data.entity.getPosition());
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
               
                this.updateObjectiveTile(data.entity.getPosition());
            }
        });


        world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
            if (data.componentType === 'objective') {
                const objective = data.entity.getComponent('objective') as ObjectiveComponent;
                if (objective.active) {
                    this.updateObjectiveTile(data.entity.getPosition());
                }
            }

            if(data.componentType === 'locked') {
                const locked = data.entity.getComponent('locked') as LockedComponent;
                if(locked && this.firstLock) {
                    this.firstLock = false;

                    logger.info(`Starting helicopter spin animation`);
                    // start spinning the helicopter tile
                    if(this.helicopterTile) {
                        this.display.addValueAnimation(this.helicopterTile, {
                            rotation: {
                                start: 0,
                                end: 2*Math.PI,
                                duration: 2,
                                loop: true
                            }
                        });
                    }
                }
            }
        });

        // world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
        //     if (data.componentType === 'objective') {
        //         const objective = data.entity.getComponent('objective') as ObjectiveComponent;
        //         const entityId = data.entity.getId();
                
        //         if (objective.active) {
        //             // Add or update objective tile
        //             const pos = data.entity.getPosition();
        //             const blockPos = {
        //                 x: Math.floor(pos.x / 12),
        //                 y: Math.floor(pos.y / 12)
        //             };
                    
        //             if (!this.objectiveTiles.has(entityId)) {
        //                 // const tileId = this.display.createTile(
        //                 //     blockPos.x,
        //                 //     blockPos.y,
        //                 //     '◎',
        //                 //     '#55CE4AFF',
        //                 //     '#00000000',
        //                 //     1000,
        //                 //     {
        //                 //         fontWeight: 'bold'
        //                 //     }
        //                 // );
        //                 // this.objectiveTiles.set(entityId, tileId);
        //                 // logger.info(`Created new objective tile ${tileId} for entity ${entityId}`);
        //             }
        //         } else {
        //             // Remove objective tile when objective becomes inactive
        //             const tileId = this.objectiveTiles.get(entityId);
        //             if (tileId) {
        //                 logger.info(`Removing objective tile ${tileId} for entity ${entityId}`);
        //                 this.display.removeTile(tileId);
        //                 this.objectiveTiles.delete(entityId);
        //             }
        //         }
        //     }
        // });

        // We can keep this as a backup cleanup mechanism
        world.on('componentRemoved', (data: { entity: Entity, componentType: string }) => {
            if (data.componentType === 'objective') {
                if(this.objectiveTile) {
                    this.display.removeTile(this.objectiveTile);
                    this.objectiveTile = null;
                }
            }

            const locked = data.entity.getComponent('locked') as LockedComponent;
            if(locked) {
                // start spinning the helicopter tile
                logger.info(`Clearing helicopter spin animation`);
                if(this.helicopterTile) {
                    this.display.clearAnimations(this.helicopterTile);
                }

                this.firstLock = true;
            }
        });
    }

    private updateObjectiveTile(pos: Point) {

        const blockPos = {
            x: Math.floor(pos.x / 12),
            y: Math.floor(pos.y / 12)
        };

        if(this.objectiveTile) {
            this.display.moveTile(this.objectiveTile, blockPos.x, blockPos.y);
        } else {
            this.objectiveTile = this.display.createTile(blockPos.x, blockPos.y, '◎', '#55CE4AFF', '#00000000', 1000);
        }
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
        // this.display.clear();
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
                                fg: removeOpacity(tile.color) + 'FF',
                                bg: removeOpacity(tile.backgroundColor) + 'FF'
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
                                fg: removeOpacity(tile.color) + 'AA',
                                bg: removeOpacity(tile.backgroundColor) + 'AA'
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
        // const objectives = this.world.getEntitiesWithComponent('objective')
        //     .filter(entity => (entity.getComponent('objective') as ObjectiveComponent)?.active === true);
        
        // objectives.forEach(objective => {
        //     const pos = objective.getPosition();
        //     const blockPos = {
        //         x: Math.floor(pos.x / 12),
        //         y: Math.floor(pos.y / 12)
        //     };
            
        //     // const tileId = this.display.createTile(
        //     //     blockPos.x,
        //     //     blockPos.y,
        //     //     '◎',
        //     //     '#55CE4AFF',
        //     //     '#00000000',
        //     //     1000,
        //     //     {
        //     //         fontWeight: 'bold'
        //     //     }
        //     // );
            
        //     // this.objectiveTiles.set(objective.getId(), tileId);
        // };
    }

    public show(): void {
        if (!this.isVisible) {
            this.isVisible = true;
            const canvas = this.display.getDisplayCanvas();
            const worldWidth = this.world.getWorldWidth();
            const worldHeight = this.world.getWorldHeight();
            
            // Calculate block size (assuming 12x12 blocks as per the code)
            const blockWidth = worldWidth / 12;
            const blockHeight = worldHeight / 12;

            logger.info(`MINIMAP blockWidth: ${blockWidth}, blockHeight: ${blockHeight}`);
            
            // Each block should be visible, let's make each block 40px
            const width = blockWidth * this.minimapCellSize;
            const height = blockHeight * this.minimapCellSize;

            logger.info(`MINIMAP width: ${width}, height: ${height}`);

            // Get the game display element to position relative to it
            const gameDisplay = document.getElementById('display');
            if (gameDisplay) {
                
                // canvas.style.position = 'absolute';
                // Position flush with right and bottom edges of game display
                // canvas.style.right = '0px';
                // canvas.style.bottom = '40px'; // Account for UI bar height
                // canvas.style.width = `${width}px`;
                // canvas.style.height = `${height}px`;
                canvas.style.display = 'block';
                canvas.style.borderTop = '1px solid #fff';
                canvas.style.borderLeft = '1px solid #fff';
                // canvas.style.borderRadius = '4px';
                canvas.style.backgroundColor = '#000';
                canvas.style.zIndex = '1000';

                const minimapContainer = document.getElementById('minimap-container');
                if (minimapContainer) {
                    // minimapContainer.style.width = `${width}px`;
                    // minimapContainer.style.height = `${height}px`;
                    minimapContainer.style.right = `${width}px`;
                    minimapContainer.style.bottom = `${height+60}px`;
                }
            }
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