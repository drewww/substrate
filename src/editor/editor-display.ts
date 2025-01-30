import { Display } from '../display/display';
import { DisplayOptions } from '../display/types';
import { Point } from '../types';

export class EditorDisplay {
    private display: Display;

    constructor(options: DisplayOptions) {
        this.display = new Display({
            ...options,
        });
    }

    public getDisplay(): Display {
        return this.display;
    }

    public highlightCell(point: Point | null): void {
        // TODO: Implement cell highlighting
    }

    public getCellAtPixel(x: number, y: number): Point | null {
        // return this.display.getTilePosition(x, y);
        return null;
    }
} 