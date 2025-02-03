export interface PaletteData {
    version: string;
    entities: Array<{
        id: string;
        position: { x: number; y: number };
        components: Array<{
            type: string;
            [key: string]: any;  // Allow for various component properties
        }>;
    }>;
}