import { Point } from '../types';
import { Entity } from '../entity/entity';
import { logger } from '../util/logger';
import { Component } from '../entity/component';

export type EditorTool = 'pointer' | 'export';

interface ClipboardContent {
    type: 'entity' | 'components';
    entity?: Entity;
    components?: Component[];
}

export interface EditorState {
    selectedCell: Point | null;
    selectedEntityId: string | null;
    activeTool: EditorTool;
    entityClipboard: Entity | null;
    componentClipboard: Component[] | null;
}

export class EditorStateManager {
    private state: EditorState = {
        selectedCell: null,
        selectedEntityId: null,
        activeTool: 'pointer',
        entityClipboard: null,
        componentClipboard: null
    };

    public getState(): EditorState {
        return { ...this.state };
    }

    public setSelectedCell(point: Point | null): void {
        this.state.selectedCell = point;
    }

    public setSelectedEntity(entityId: string | null): void {
        this.state.selectedEntityId = entityId;
    }

    public setActiveTool(tool: EditorTool): void {
        this.state.activeTool = tool;
    }

    public setEntityClipboard(entity: Entity): void {
        this.state.entityClipboard = entity;
        this.state.componentClipboard = null;
        logger.info('Entity copied to clipboard:', entity);
    }

    public setComponentClipboard(components: Component[]): void {
        this.state.componentClipboard = components;
        this.state.entityClipboard = null;
        logger.info('Components copied to clipboard:', components);
    }

    public getClipboard(): ClipboardContent {
        if (this.state.entityClipboard) {
            return {
                type: 'entity',
                entity: this.state.entityClipboard
            };
        }
        if (this.state.componentClipboard) {
            return {
                type: 'components',
                components: this.state.componentClipboard
            };
        }
        return { type: 'components', components: [] };
    }

    public clearClipboard(): void {
        this.state.entityClipboard = null;
        this.state.componentClipboard = null;
    }
} 