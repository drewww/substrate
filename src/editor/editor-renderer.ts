import { BaseRenderer } from '../render/base-renderer';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Component } from '../entity/component';
import { Display } from '../display/display';
import { World } from '../world/world';
import { BlendMode } from '../display/types';
import { PedestrianNavigationComponent } from '../game/components/pedestrian-navigation.component';
import { TrafficControllerComponent } from '../game/components/traffic-controller.component';
import { SpawnHintComponent } from '../game/components/spawn-hint.component';

export class EditorRenderer extends BaseRenderer {
    private highlightTileId: string | null = null;
    private hoverTileId: string | null = null;
    protected world: World;
    protected display: Display;
    private hoverPoint: Point | null = null;
    private selectedCells: string[] = [];

    constructor(world: World, display: Display) {
        super(world, display);
        this.world = world;
        this.display = display;
    }

    public handleEntityAdded(entity: Entity): void {
        this.updateEntityVisuals(entity);
    }

    public handleEntityModified(entity: Entity, componentType: string): void {
        this.updateEntityVisuals(entity);
    }

    private updateEntityVisuals(entity: Entity): void {
        let tileId = this.entityTiles.get(entity.getId());
        const position = entity.getPosition();

        if (entity.hasComponent(PedestrianNavigationComponent.type)) {
            // Create tile if it doesn't exist
            if (!tileId) {
                tileId = this.display.createTile(
                    position.x,
                    position.y,
                    '◊',  // Diamond shape for nav node
                    '#00FF00AA',  // Semi-transparent green
                    '#00000000',  // Transparent background
                    1000  // High z-index to stay visible
                );
                this.entityTiles.set(entity.getId(), tileId);
                this.tileEntities.set(tileId, entity.getId());
                return;
            }

            // Update existing tile
            this.display.updateTile(tileId, {
                char: '◊',
                fg: '#00FF00AA',
                bg: '#00000000'
            });
        } else if (entity.hasComponent('traffic-controller')) {
            // Create tile if it doesn't exist
            if (!tileId) {
                tileId = this.display.createTile(
                    position.x,
                    position.y,
                    '⍠',  // Traffic controller symbol
                    '#00FF00AA',  // Same semi-transparent green as nav points
                    '#00000000',  // Transparent background
                    1000  // High z-index to stay visible
                );
                this.entityTiles.set(entity.getId(), tileId);
                this.tileEntities.set(tileId, entity.getId());
                return;
            }

            // Update existing tile
            this.display.updateTile(tileId, {
                char: '⍠',
                fg: '#00FF00AA',
                bg: '#00000000'
            });
        } else if (entity.hasComponent(SpawnHintComponent.type)) {
            // Create tile if it doesn't exist
            let char = '';
            switch ((entity.getComponent(SpawnHintComponent.type) as SpawnHintComponent).hint) {
                case "camera":
                    char = '⏚';
                    break;
                case "turret":
                    char = '⛣';
                    break;
                case "boomer":
                    char = '🜻';
                    break;
                default:
                    char = '?';
                    break;
            }

            if (!tileId) {
                tileId = this.display.createTile(       
                    position.x,
                    position.y,
                    char,
                    '#00FF00AA',
                    '#00000000',
                    1000
                );
            }
        }
    }

    public handleComponentModified(entity: Entity, componentType: string): void {
        // Delegate to entityModified for now
        this.handleEntityModified(entity, componentType);
    }

    public handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        
    }

    public handleEntityRemoved(entity: Entity): void {
    }

    public handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        return true;
    }

    public highlightCell(point: Point | null): void {
        // Remove existing highlight
        if (this.highlightTileId) {
            this.display.removeTile(this.highlightTileId);
            this.highlightTileId = null;
        }

        // Add new highlight if point provided
        if (point) {
            this.highlightTileId = this.display.createTile(
                point.x,
                point.y,
                ' ',
                '#00000000',
                '#FFFFFF44',
                1000, // High z-index to stay on top
                { blendMode: BlendMode.SourceOver }
            );
        }
    }

    public hoverCell(point: Point | null): void {
        // Remove existing hover highlight
        if (this.hoverTileId) {
            this.display.removeTile(this.hoverTileId);
            this.hoverTileId = null;
        }

        // Add new hover highlight if point provided
        if (point) {
            this.hoverTileId = this.display.createTile(
                point.x,
                point.y,
                ' ',
                '#00000000',
                '#0088FF33', // Light blue with 20% opacity
                999, // High z-index but below selection
                { blendMode: BlendMode.SourceOver }
            );
        }
    }

    public handleUpdate(timestamp: number): void {
        // No special update logic needed for editor
    }

    public highlightCells(points: Point[]): void {
        // Remove all existing highlight tiles first
        this.clearHighlights();

        // Create new highlights
        points.forEach(point => {
            const tileId = this.display.createTile(
                point.x,
                point.y,
                ' ',
                '#00000000',
                '#0088FF3A', // Light blue with 10% opacity
                998, // High z-index but below hover
                { blendMode: BlendMode.SourceOver }
            );

            this.selectedCells.push(tileId);
        });
    }

    public clearHighlights(): void {
        // Clear all selections
        this.selectedCells.forEach(tileId => {
            this.display.removeTile(tileId);
        });
        this.selectedCells = [];
    }

    public update(timestamp: number): void {
        // No need for update since we're managing tiles directly
    }
} 