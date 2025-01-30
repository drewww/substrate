import { Point } from '../types';
import { Entity } from '../entity/entity';
import { logger } from '../util/logger';

export type EditorTool = 'pointer' | 'export';

export interface EditorState {
    selectedCell: Point | null;
    selectedEntityId: string | null;
    activeTool: EditorTool;
    clipboard: ((pos: Point) => Entity) | null;
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

    public setClipboard(createMethod: (pos: Point) => Entity): void {
        this.state.clipboard = createMethod;

        logger.info('Clipboard set to', createMethod);
    }

    public getClipboard(): ((pos: Point) => Entity) | null {
        return this.state.clipboard;
    }
} 