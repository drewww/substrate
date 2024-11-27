export interface ColorMap {
    [key: string]: string;  // Maps single-char aliases to full color values
}

export interface TextSegment {
    text: string;
    color: string;
}

export class TextParser {
    private static readonly COLOR_PATTERN = /\{([^}]+)\}([^{]*)/g;
    private static readonly HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

    constructor(private colorMap: ColorMap) {}

    public parse(text: string): TextSegment[] {
        const segments: TextSegment[] = [];
        let lastIndex = 0;
        let currentColor = '#FFFFFF';  // Default color
        const colorStack: string[] = [];

        text.replace(TextParser.COLOR_PATTERN, (match, color, content, offset) => {
            // Add any text before this color tag
            if (offset > lastIndex) {
                segments.push({
                    text: text.slice(lastIndex, offset),
                    color: currentColor
                });
            }

            if (color === '/') {
                // Pop color from stack
                colorStack.pop();
                currentColor = colorStack[colorStack.length - 1] || '#FFFFFF';
            } else {
                // Determine color from alias or hex
                const newColor = this.resolveColor(color);
                if (newColor) {
                    currentColor = newColor;
                    colorStack.push(currentColor);
                }
            }

            // Add the colored content
            if (content) {
                segments.push({
                    text: content,
                    color: currentColor
                });
            }

            lastIndex = offset + match.length;
            return match;
        });

        // Add any remaining text
        if (lastIndex < text.length) {
            segments.push({
                text: text.slice(lastIndex),
                color: currentColor
            });
        }

        return segments;
    }

    private resolveColor(color: string): string {
        // If it's a hex color, validate and return it
        if (color.startsWith('#')) {
            return TextParser.HEX_COLOR_PATTERN.test(color) ? color : '#FFFFFF';
        }
        
        // Otherwise look up in color map
        return this.colorMap[color] || '#FFFFFF';
    }
} 