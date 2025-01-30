import { Point } from '../types';
import { Entity } from '../entity/entity';
import { logger } from '../util/logger';
import { Component } from '../entity/component';

export type EditorTool = 'pointer' | 'export';

export interface EditorState {
    selectedCell: Point | null;
    selectedEntityId: string | null;
    activeTool: EditorTool;
    clipboard: Entity | Component[] | null;    // the clipboard can contain an entity or a component. (what about an array of components?? we will want to have palette options that are multiple for sure)
}

export class EditorStateManager {
    private state: EditorState = {
        selectedCell: null,
        selectedEntityId: null,
        activeTool: 'pointer',
        clipboard: null
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

    public setClipboard(entity: Entity | Component[]): void {
        this.state.clipboard = entity;

        logger.info('Clipboard set to', entity);
    }

    public clearClipboard(): void {
        this.state.clipboard = null;
    }

    public getClipboard(): Entity | Component[] | null {
        return this.state.clipboard;
    }
} 