export class RuntimeRenderer extends GameRenderer {
    public displayGameOver(): void {
        const worldSize = this.world.getSize();
        const wipeDelay = 50; // ms between each row
        const wipeAlpha = 'AA';
        
        // Create wipe effect from top to bottom
        for (let y = 0; y < worldSize.y; y++) {
            setTimeout(() => {
                for (let x = 0; x < worldSize.x; x++) {
                    this.display.createTile(
                        x,
                        y,
                        ' ',
                        '#000000FF',
                        `#000000${wipeAlpha}`,
                        2000, // Very high z-index to cover everything
                    );
                }
            }, y * wipeDelay);
        }

        // After wipe completes, show game over text
        setTimeout(() => {
            const centerX = Math.floor(worldSize.x / 2) - 4; // "GAME OVER" is 9 chars
            const centerY = Math.floor(worldSize.y / 2);

            // Create black background behind text
            for (let x = centerX - 1; x <= centerX + 9; x++) {
                this.display.createTile(
                    x,
                    centerY,
                    ' ',
                    '#FFFFFF',
                    '#000000FF',
                    2001
                );
            }

            // Create the text
            const gameOverTileIds = this.display.createString(
                centerX,
                centerY,
                "GAME OVER",
                2002, // Above the background
                '#FF0000FF', // Red text
                '#000000FF'  // Black background
            );

            // Optional: Add some simple "fade in" animation to the text
            for (const tileId of gameOverTileIds) {
                this.display.updateTile(tileId, {
                    fg: '#00000000'
                });

                this.display.addColorAnimation(tileId, {
                    fg: {
                        start: '#00000000',
                        end: '#FF0000FF',
                        duration: 1.0,
                        easing: Easing.quadOut,
                        loop: false
                    }
                });
            }
        }, (worldSize.y * wipeDelay) + 100); // Start after wipe + small delay
    }
} 