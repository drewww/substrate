import { Point } from '../types';

export type EditorTool = 'pointer' | 'export';

export interface EditorState {
    selectedCell: Point | null;
    selectedEntityId: string | null;
    activeTool: EditorTool;
}

export class EditorStateManager {
    private state: EditorState = {
        selectedCell: null,
        selectedEntityId: null,
        activeTool: 'pointer'
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
} 