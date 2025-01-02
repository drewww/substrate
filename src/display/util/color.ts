import { Color } from "../types";

export function interpolateColor(start: Color, end: Color, progress: number): Color {
    const fromRGB = {
        r: parseInt(start.slice(1, 3), 16),
        g: parseInt(start.slice(3, 5), 16),
        b: parseInt(start.slice(5, 7), 16),
        a: start.length > 7 ? parseInt(start.slice(7, 9), 16) : undefined
    };
    
    const toRGB = {
        r: parseInt(end.slice(1, 3), 16),
        g: parseInt(end.slice(3, 5), 16),
        b: parseInt(end.slice(5, 7), 16),
        a: end.length > 7 ? parseInt(end.slice(7, 9), 16) : undefined
    };
    
    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * progress);
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * progress);
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * progress);
    
    // Only include alpha in result if both colors have it
    if (fromRGB.a !== undefined && toRGB.a !== undefined) {
        const a = Math.round(fromRGB.a + (toRGB.a - fromRGB.a) * progress);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
    }
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}