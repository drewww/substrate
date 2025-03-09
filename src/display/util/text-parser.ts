export interface ColorMap {
    [key: string]: string;  // Maps single-char aliases to full color values
}

export interface TextSegment {
    text: string;
    color: string;
    backgroundColor?: string;  // Add background color support
}

export class TextParser {
    private static readonly COLOR_PATTERN = /\{([^}]+)\}([^{]*)/g;
    private static readonly HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6,8}$/;  // Support both 6 and 8 char hex

    constructor(private colorMap: ColorMap) {}

    public parse(text: string): TextSegment[] {
        const segments: TextSegment[] = [];
        let lastIndex = 0;
        let currentColor = '#FFFFFF';  // Default foreground
        let currentBg: string | undefined;  // Default background (none)
        const colorStack: Array<{fg: string, bg?: string}> = [];

        text.replace(TextParser.COLOR_PATTERN, (match, color, content, offset) => {
            // Add any text before this color tag
            if (offset > lastIndex) {
                segments.push({
                    text: text.slice(lastIndex, offset),
                    color: currentColor,
                    backgroundColor: currentBg
                });
            }

            if (color === '/') {
                // Pop color from stack
                colorStack.pop();
                const lastColors = colorStack[colorStack.length - 1];
                currentColor = lastColors?.fg || '#FFFFFF';
                currentBg = lastColors?.bg;
            } else {
                // Check for comma-separated colors
                const [fg, bg] = color.split(',').map((c: string) => c.trim());
                const newFg = this.resolveColor(fg);
                const newBg = bg ? this.resolveColor(bg) : undefined;
                
                if (newFg) {
                    currentColor = newFg;
                    currentBg = newBg;
                    colorStack.push({ fg: currentColor, bg: currentBg });
                }
            }

            // Add the colored content
            if (content) {
                segments.push({
                    text: content,
                    color: currentColor,
                    backgroundColor: currentBg
                });
            }

            lastIndex = offset + match.length;
            return match;
        });

        // Add any remaining text
        if (lastIndex < text.length) {
            segments.push({
                text: text.slice(lastIndex),
                color: currentColor,
                backgroundColor: currentBg
            });
        }

        return segments;
    }

    private resolveColor(color: string): string {
        if (!color) return '#FFFFFF';
        
        // If it's a hex color, validate and return it
        if (color.startsWith('#')) {
            return TextParser.HEX_COLOR_PATTERN.test(color) ? color : '#FFFFFF';
        }
        
        // Otherwise look up in color map
        return this.colorMap[color] || '#FFFFFF';
    }
} 