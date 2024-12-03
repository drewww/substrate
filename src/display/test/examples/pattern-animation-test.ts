import { BaseTest } from './base-test';
import { TileId } from '../../types';
import { Easing, FillDirection } from '../../display';

export class PatternAnimationTest extends BaseTest {
    private animatedTiles: TileId[] = [];
    
    constructor() {
        super({
            worldWidth: 40,
            worldHeight: 20,
            viewportWidth: 40,
            viewportHeight: 20,
            cellWidth: 12,
            cellHeight: 24,
        });
    }

    getName(): string {
        return "pattern-animation";
    }

    getDescription(): string {
        return "Tests pattern-based animations";
    }

    private createSmokeBomb(x: number, y: number, delay: number = 0): TileId {
        const smokeBomb = this.display.createTile(
            x, y,
            '●',
            '#88888800',
            '#00000000',
            3,
            { noClip: false }
        );

        const startTime = performance.now() + (delay * 1000); // Convert delay to milliseconds

        // Scale animation
        this.display.addValueAnimation(smokeBomb, {
            scaleSymbolX: {
                start: 0.0,
                end: 3.0,
                duration: 0.6,
                easing: Easing.expoInOut,
                loop: false
            },
            scaleSymbolY: {
                start: 0.0,
                end: 3.0,
                duration: 0.6,
                easing: Easing.expoInOut,
                loop: false
            },
            startTime
        });

        // Fade in animation
        this.display.addColorAnimation(smokeBomb, {
            fg: {
                start: '#88888800',
                end: '#888888FF',
                duration: 0.6,
                easing: Easing.quadOut,
                next: {
                    start: '#888888FF',
                    end: '#888888DD',
                    duration: 3.0,
                    easing: Easing.quadOut,

                    next: {
                        start: '#888888DD',
                        end: '#88888800',
                        duration: 3.0,
                        easing: Easing.quadOut,
                    }
                }
            },
            startTime: startTime,
        });

        // this.display.addColorAnimation(smokeBomb, {
        //     fg: {
        //         start: '#888888FF',
        //         end: '#88888800',
        //         duration: 2.0,
        //         easing: Easing.quadOut,
        //     },
        //     startTime: startTime + 2000
        // });

        this.animatedTiles.push(smokeBomb);
        return smokeBomb;
    }

    private createSmokeBombPattern(centerX: number, centerY: number): void {
        // Create center smoke bomb
        this.createSmokeBomb(centerX, centerY);

        // Create surrounding smoke bombs with delay
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip center tile
                
                // Calculate distance from center for delay
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delay = 0.6 + (distance * 0.1); // Base delay + distance-based offset
                
                this.createSmokeBomb(centerX + dx, centerY + dy, delay);
            }
        }
    }

    private createFireEffect(x: number, y: number): void {
        // Base ember/coal layer
        const emberTile = this.display.createTile(x, y, '●', '#FF3300AA', '#000000FF', 2);
        
        // Main fire body
        const fireTile = this.display.createTile(x, y, '♦', '#FF9900DD', '#00000000', 3, { noClip: true });
        
        // Flickering flame top
        const flameTile = this.display.createTile(x, y, '▲', '#FFFF00AA', '#00000000', 4, { noClip: true });

        // Ember color animation (pulsing red/orange)
        this.display.addColorAnimation(emberTile, {
            fg: {
                start: '#FF3300AA',
                end: '#FF6600AA',
                duration: 0.8,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true,
                offset: 0.2
            }
        });

        // Main fire color animation
        this.display.addColorAnimation(fireTile, {
            fg: {
                start: '#FF9900DD',
                end: '#FF6600DD',
                duration: 0.4,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            }
        });

        // Flame top color animation
        this.display.addColorAnimation(flameTile, {
            fg: {
                start: '#FFFF00AA',
                end: '#FFCC00AA',
                duration: 0.3,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true,
                offset: 0.1
            }
        });

        // Subtle ember position animation
        this.display.addValueAnimation(emberTile, {
            offsetSymbolY: {
                start: 0,
                end: 0.1,
                duration: 1.2,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            }
        });

        // More active fire body movement
        this.display.addValueAnimation(fireTile, {
            offsetSymbolX: {
                start: -0.1,
                end: 0.1,
                duration: 0.3,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            offsetSymbolY: {
                start: -0.1,
                end: 0.1,
                duration: 0.4,
                reverse: true,
                easing: Easing.quadInOut,
                loop: true,
                offset: 0.2
            }
        });

        // Quick, erratic flame top movement
        this.display.addValueAnimation(flameTile, {
            offsetSymbolX: {
                start: -0.15,
                end: 0.15,
                duration: 0.2,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            offsetSymbolY: {
                start: -0.2,
                end: 0,
                duration: 0.3,
                reverse: true,
                easing: Easing.quadOut,
                loop: true
            }
        });

        this.animatedTiles.push(emberTile, fireTile, flameTile);
    }

    private createLaserRow(y: number, loop: boolean = true, start: number = 0.49, end: number = 0.45): void {
        const length = 11; // Length of the row
        const laserRed = '#FF0000FF'; // Bright laser red

        for (let x = 1; x < length; x++) {
            // Background tile
            const bgTile = this.display.createTile(x, y, ' ', laserRed, laserRed, 1);

            // Top overlay tile
            const topTile = this.display.createTile(x, y, ' ', '#00000000', '#000000FF', 2, {
                bgPercent: start,
                fillDirection: FillDirection.TOP
            });

            // Bottom overlay tile
            const bottomTile = this.display.createTile(x, y, ' ', '#00000000', '#000000FF', 3, {
                bgPercent: start,
                fillDirection: FillDirection.BOTTOM
            });

            // Animate the top and bottom tiles
            const offset = x * -0.1; // Offset for wave effect

            this.display.addValueAnimation(topTile, {
                bgPercent: {
                    start: start,
                    end: end,
                    duration: 0.2,
                    reverse: true,
                    easing: Easing.sineInOut,
                    loop: loop,
                    offset: offset
                }
            });

            this.display.addValueAnimation(bottomTile, {
                bgPercent: {
                    start: start,
                    end: end,
                    duration: 0.2,
                    reverse: true,
                    easing: Easing.sineInOut,
                    loop: loop,
                    offset: offset
                }
            });

            this.animatedTiles.push(bgTile, topTile, bottomTile);
        }
    }

    protected run(): void {

        this.display.setBackground(' ', '#000000FF', '#000000FF');
        // Pattern 1: Binary counter
        const binarySymbols = ['0', '1'];
        const binaryId = this.display.createTile(5, 5, '0', '#00FF00FF', '#000000FF', 1);
        this.display.addSymbolAnimation(binaryId, binarySymbols, 2.0);
        this.animatedTiles.push(binaryId);

        // Pattern 2: Clock animation
        const clockSymbols = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
        const clockId = this.display.createTile(10, 5, '🕐', '#FFFFFFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(clockId, clockSymbols, 12.0);
        this.animatedTiles.push(clockId);

        // Pattern 3: Wave pattern
        const waveSymbols = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];
        const waveId = this.display.createTile(15, 5, ' ', '#0088FFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(waveId, waveSymbols, 1.0, 0, true, true);
        this.animatedTiles.push(waveId);

        // Color animation 1: Pulsing red background
        const pulsingId = this.display.createTile(5, 10, '♥', '#FFFFFFFF', '#FF000088', 1);
        this.display.addColorAnimation(pulsingId, {
            bg: {
                start: '#FF000088',
                end: '#FF0000FF',
                duration: 2.0,
                reverse: true,
                offset: 0,
                loop: true
            }
        });
        this.animatedTiles.push(pulsingId);

        // Color animation 2: Rainbow text
        const rainbowId = this.display.createTile(10, 10, '★', '#FF0000FF', '#000000FF', 1);
        this.display.addColorAnimation(rainbowId, {
            fg: {
                start: '#FF0000FF',
                end: '#00FF00FF',
                duration: 3.0,
                reverse: true,
                offset: 0,
                loop: true
            }
        });
        this.animatedTiles.push(rainbowId);

        // Color animation 3: Combined fg/bg with offset
        for (let i = 0; i < 5; i++) {
            const waveTileId = this.display.createTile(15 + i, 10, '◆', '#FFFFFFFF', '#0000FFFF', 1);
            this.display.addColorAnimation(waveTileId, {
                fg: {
                    start: '#FFFFFFFF',
                    end: '#00FFFFFF',
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.2,
                    loop: true
                },
                bg: {
                    start: '#0000FFFF',
                    end: '#000000FF',
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.2,
                    loop: true
                }
            });
            this.animatedTiles.push(waveTileId);
        }

        // Color animation 4: Wide wave with shared start time
        const sharedStartTime = performance.now();
        for (let i = 0; i < this.display.getWorldWidth(); i++) {
            const wideTileId = this.display.createTile(i, 15, '▀', '#FFFFFFFF', '#000000FF', 1);
            this.display.addColorAnimation(wideTileId, {
                fg: {
                    start: '#FF0000FF',
                    end: '#0000FFFF',
                    duration: 2.0,
                    reverse: true,
                    offset: i * 0.02,  // Smaller offset for smoother wave
                    loop: true
                },
                startTime: sharedStartTime
            });
            this.animatedTiles.push(wideTileId);
        }

        // Background fill animation
        const fillId = this.display.createTile(25, 5, 'X', '#FFFFFFFF', '#FF0000FF', 1);
        this.display.addValueAnimation(fillId, {
            bgPercent: {
                start: 0,
                end: 1,
                duration: 2.0,
                reverse: true,
                offset: 0,
                loop: true
            }
        });
        this.animatedTiles.push(fillId);

        setTimeout(() => {
            this.display.stopTileAnimations(fillId);
        }, 4000);

        // Background fill wave animation (x = 25, y = 10)
        const sharedFillStartTime = performance.now();
        for (let i = 0; i < 10; i++) {
            const waveFillId = this.display.createTile(25 + i, 10, 'S', '#FFFFFFFF', '#0088FFFF', 1);
            this.display.addValueAnimation(waveFillId, {
                bgPercent: {
                    start: 0,
                    end: 1,
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.15,
                    easing: Easing.bounceOut,  // Changed to bounceOut for dramatic bounce effect
                    loop: true
                },
                startTime: sharedFillStartTime
            });
            this.animatedTiles.push(waveFillId);
        }

        // Vertical stacked progress bar (x = 35, y = 2-6)
        const barHeight = 5;
        const fillDuration = 2.0;
        const startTime = performance.now();

        // Custom easing that creates distinct phases for each tile
        const stackedFillEasing = (t: number, phase: number): number => {
            // Each tile gets a 1/barHeight portion of the total animation
            const phaseLength = 1 / barHeight;
            const phaseStart = phase * phaseLength;
            const phaseEnd = phaseStart + phaseLength;
            
            if (t < phaseStart) return 0;  // Before this tile's phase
            if (t > phaseEnd) return 1;    // After this tile's phase
            
            // Linear interpolation within the phase
            return (t - phaseStart) / phaseLength;
        };

        for (let i = 0; i < barHeight; i++) {
            const tileId = this.display.createTile(35, 6 - i, ' ', '#FFFFFFFF', '#00FF00FF', 1);
            this.display.addValueAnimation(tileId, {
                bgPercent: {
                    start: 0,
                    end: 1,
                    duration: fillDuration,
                    reverse: true,
                    offset: 0,
                    easing: (t) => stackedFillEasing(t, i),
                    loop: true
                },
                startTime: startTime
            });
            this.animatedTiles.push(tileId);
        }

        // ASCII spinner with easing (x = 35, y = 8)
        const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        const spinnerId = this.display.createTile(35, 8, spinnerFrames[0], '#00FF00FF', '#000000FF', 1);
        this.display.addSymbolAnimation(spinnerId, spinnerFrames, 1.0);
        // Add pulsing color with sine easing
        this.display.addColorAnimation(spinnerId, {
            fg: {
                start: '#00FF00FF',
                end: '#00FF0044',
                duration: 2.0,
                reverse: true,
                offset: 0.25,  // Quarter phase offset for smooth sine wave
                loop: true
            }
        });
        this.animatedTiles.push(spinnerId);

        // Multi-character progress bar (x = 2-12, y = 18)
        const progressChars = ['[          ]', '[=         ]', '[==        ]', '[===       ]',
                              '[====      ]', '[=====     ]', '[======    ]', '[=======   ]',
                              '[========  ]', '[========= ]', '[==========]'];
        for (let i = 0; i < progressChars[0].length; i++) {
            const charId = this.display.createTile(2 + i, 18, progressChars[0][i], '#00FF00FF', '#000000FF', 1);
            this.display.addSymbolAnimation(charId, progressChars.map(frame => frame[i]), 2.0, 0, true, true);
            this.animatedTiles.push(charId);
        }

        // Rainbow wave with cubic easing (x = 15-25, y = 18)
        const waveWidth = 10;
        const colors = ['#FF0000FF', '#FF7F00FF', '#FFFF00FF', '#00FF00FF', '#0000FFFF', '#4B0082FF', '#8F00FFFF'];
        for (let i = 0; i < waveWidth; i++) {
            const waveTileId = this.display.createTile(15 + i, 18, ' ', '#000000FF', colors[0], 1);
            // Cubic easing function: t³
            const offset = Math.pow(i / waveWidth, 3);
            this.display.addColorAnimation(waveTileId, {
                bg: {
                    start: colors[0],
                    end: colors[colors.length - 1],
                    duration: 3.0,
                    reverse: true,
                    offset,
                    loop: true
                }
            });
            this.animatedTiles.push(waveTileId);
        }

        // Matrix-style falling characters (x = 38, y = 2-7)
        const matrixChars = '日月火水木金土'.split('');
        for (let y = 2; y < 8; y++) {
            const charId = this.display.createTile(38, y, matrixChars[0], '#00FF00FF', '#000000FF', 1);
            this.display.addSymbolAnimation(charId, matrixChars, 0.5);
            this.display.addColorAnimation(charId, {
                fg: {
                    start: '#00FF00FF',
                    end: '#00FF0044',
                    duration: 1.0,
                    reverse: true,
                    offset: y * 0.15,  // Cascade effect
                    loop: true
                }
            });
            this.animatedTiles.push(charId);
        }

        // Bouncing dot with quadratic easing (x = 28-32, y = 18)
        const bounceWidth = 5;
        for (let i = 0; i < bounceWidth; i++) {
            const bounceId = this.display.createTile(28 + i, 18, '•', '#FFFFFFFF', '#000000FF', 1);
            // Quadratic easing: t²
            const offset = Math.pow(i / bounceWidth, 2);
            this.display.addColorAnimation(bounceId, {
                fg: {
                    start: '#FFFFFFFF',
                    end: '#FFFFFF44',
                    duration: 1.5,
                    reverse: true,
                    offset,
                    loop: true
                }
            });
            this.animatedTiles.push(bounceId);
        }

        // Sine wave easing background fill (x = 25, y = 11)
        const sineWaveStartTime = performance.now();
        for (let i = 0; i < 10; i++) {
            const sineFillId = this.display.createTile(25 + i, 11, 'S', '#FFFFFFFF', '#0088FFFF', 1);
            this.display.addValueAnimation(sineFillId, {
                bgPercent: {
                    start: 0,
                    end: 1,
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.1,
                    easing: Easing.sineInOut,  // Kept sineInOut for smooth wave motion
                    loop: true
                },
                startTime: sineWaveStartTime
            });
            this.animatedTiles.push(sineFillId);
        }

        // Exponential ease background fill (x = 25, y = 12)
        const expoWaveStartTime = performance.now();
        for (let i = 0; i < 10; i++) {
            const expoFillId = this.display.createTile(25 + i, 12, 'S', '#FFFFFFFF', '#0088FFFF', 1);
            this.display.addValueAnimation(expoFillId, {
                bgPercent: {
                    start: 0,
                    end: 1,
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.1,
                    easing: Easing.expoInOut,  // Changed to expoInOut for dramatic acceleration/deceleration
                    loop: true
                },
                startTime: expoWaveStartTime
            });
            this.animatedTiles.push(expoFillId);
        }

        // Moving animated tile test
        const movingTileStartTime = performance.now();
        const movingTileId = this.display.createTile(2, 2, '◆', '#FF0000FF', '#000000FF', 1);

        // Add rainbow color animation
        this.display.addColorAnimation(movingTileId, {
            fg: {
                start: '#FF0000FF',
                end: '#0000FFFF',
                duration: 2.0,
                reverse: true,
                offset: 0,
                loop: true
            },
            startTime: movingTileStartTime
        });
        this.animatedTiles.push(movingTileId);

        // Set up movement interval
        let currentX = 2;
        let currentY = 2;
        const moveInterval = setInterval(() => {
            currentX = (currentX + 1) % 10 + 2;  // Move between x=2 and x=12
            this.display.moveTile(movingTileId, currentX, currentY);
        }, 500);

        // Clean up interval when test is cleaned up
        const originalCleanup = this.cleanup.bind(this);
        this.cleanup = () => {
            clearInterval(moveInterval);
            originalCleanup();
        };

        // Symbol offset animations (x = 25-35, y = 14)
        const bounceId = this.display.createTile(25, 14, '●', '#FF0000FF', '#000000FF', 1);
        this.display.addValueAnimation(bounceId, {
            offsetSymbolY: {
                start: -0.15,
                end: 0.15,
                duration: 1.0,
                reverse: true,
                easing: Easing.bounceOut,
                loop: true
            }
        });
        this.animatedTiles.push(bounceId);

        // Shaking/vibrating effect
        const shakeId = this.display.createTile(28, 14, '⚡', '#FFFF00FF', '#000000FF', 1);
        this.display.addValueAnimation(shakeId, {
            offsetSymbolX: {
                start: -0.06,
                end: 0.06,
                duration: 0.1,
                reverse: true,
                loop: true
            },
            offsetSymbolY: {
                start: -0.06,
                end: 0.06,
                duration: 0.1,
                reverse: true,
                offset: 0.05,
                loop: true
            }
        });
        this.animatedTiles.push(shakeId);

        // Circular motion
        const circleId = this.display.createTile(31, 14, '◆', '#00FF00FF', '#000000FF', 1);
        const circleStartTime = performance.now();
        this.display.addValueAnimation(circleId, {
            offsetSymbolX: {
                start: -0.09,
                end: 0.09,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            offsetSymbolY: {
                start: -0.09,
                end: 0.09,
                duration: 2.0,
                reverse: true,
                offset: 0.25,
                easing: Easing.sineInOut,
                loop: true 
            },
            startTime: circleStartTime
        });
        this.animatedTiles.push(circleId);

        // Wave motion
        for (let i = 0; i < 5; i++) {
            const waveId = this.display.createTile(34 + i, 14, '~', '#0088FFFF', '#000000FF', 1);
            this.display.addValueAnimation(waveId, {
                offsetSymbolY: {
                    start: -0.09,
                    end: 0.09,
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.2,
                    easing: Easing.sineInOut,
                    loop: true
                }
            });
            this.animatedTiles.push(waveId);
        }

        // Paired offset test - exit and entry animations
        const offsetStartTime = performance.now();

        // Exit animation
        const exitTileId = this.display.createTile(10, 1, '@', '#FFFFFFFF', '#000000FF', 1);
        this.display.addValueAnimation(exitTileId, {
            offsetSymbolX: {
                start: 0,
                end: 0.5,
                duration: 0.2,
                reverse: true,
                easing: Easing.linear,
                loop: true
            },
            startTime: offsetStartTime
        });
        this.animatedTiles.push(exitTileId);

        // Entry animation
        const entryTileId = this.display.createTile(11, 1, '@', '#FFFFFFFF', '#000000FF', 1);
        this.display.addValueAnimation(entryTileId, {
            offsetSymbolX: {
                start: -1.55,
                end: 0,
                duration: 0.2,
                reverse: true,
                easing: Easing.linear,
                loop: true
            },
            startTime: offsetStartTime
        });
        this.animatedTiles.push(entryTileId);

        // Scale animation examples (x = 25-35, y = 16)
        const pulseId = this.display.createTile(25, 16, '♦', '#FF0000FF', '#000000FF', 1);
        this.display.addValueAnimation(pulseId, {
            scaleSymbolX: {
                start: 0.8,
                end: 1.2,
                duration: 0.5,
                reverse: true,
                easing: Easing.quadInOut,
                loop: true
            },
            scaleSymbolY: {
                start: 0.8,
                end: 1.2,
                duration: 0.5,
                reverse: true,
                easing: Easing.quadInOut,
                loop: true
            }
        });
        this.animatedTiles.push(pulseId);

        // Vertical stretch
        const stretchId = this.display.createTile(28, 16, '█', '#00FF00FF', '#000000FF', 1);
        this.display.addValueAnimation(stretchId, {
            scaleSymbolY: {
                start: 0.5,
                end: 1.5,
                duration: 1.0,
                reverse: true,
                easing: Easing.bounceOut,
                loop: true
            }
        });
        this.animatedTiles.push(stretchId);

        // Smashing animation
        const smashId = this.display.createTile(31, 16, '@', '#FFFFFFFF', '#000000FF', 1);
        const smashStartTime = performance.now();
        this.display.addValueAnimation(smashId, {
            offsetSymbolX: {
                start: 0,
                end: 0.38,  // Closer to wall (was 0.4)
                duration: 0.8,
                easing: Easing.expoIn,
                reverse: true,
                loop: true
            },
            scaleSymbolX: {
                start: 1.0,
                end: 0.5,   // Less squished (was 0.05)
                duration: 0.8,
                easing: Easing.expoIn,
                reverse: true,
                loop: true
            },
            startTime: smashStartTime
        });
        this.animatedTiles.push(smashId);

        // Spinning card effect
        const spinId = this.display.createTile(34, 16, '♠', '#FFFFFFFF', '#000000FF', 1);
        this.display.addValueAnimation(spinId, {
            scaleSymbolX: {
                start: 1.0,
                end: 0.1,
                duration: 1.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            }
        });
        this.animatedTiles.push(spinId);

        // Drop-in effect
        const dropInId = this.display.createTile(25, 17, '●', '#FFFFFF00', '#000000FF', 1);
        this.display.addValueAnimation(dropInId, {
            scaleSymbolX: {
                start: 3.0,  // Starts larger
                end: 1.0,
                duration: 0.8,
                easing: Easing.bounceOut,
                loop: true
            },
            scaleSymbolY: {
                start: 3.0,  // Starts larger
                end: 1.0,
                duration: 0.8,
                easing: Easing.bounceOut,
                loop: true
            }
        });
        this.display.addColorAnimation(dropInId, {
            fg: {
                start: '#FFFFFF00',  // Starts transparent
                end: '#FFFFFFFF',
                duration: 0.8  // Matches the drop duration
            }
        });
        this.animatedTiles.push(dropInId);

        // Pop and fade out
        const popId = this.display.createTile(28, 17, '★', '#FF0000FF', '#000000FF', 1);
        this.display.addValueAnimation(popId, {
            scaleSymbolX: {
                start: 1.0,
                end: 4.0,
                duration: 0.5,
                easing: Easing.quadOut,
                loop: false
            },
            scaleSymbolY: {
                start: 1.0,
                end: 4.0,
                duration: 0.5,
                easing: Easing.quadOut,
                loop: false
            }
        });
        this.display.addColorAnimation(popId, {
            fg: {
                start: '#FF0000FF',
                end: '#FF000000',
                duration: 0.5,
                easing: Easing.quadOut,
                loop: false
            }
        });
        this.animatedTiles.push(popId);

        // Shrink and vanish
        const vanishId = this.display.createTile(31, 17, '◆', '#00FF00FF', '#000000FF', 1);
        this.display.addValueAnimation(vanishId, {
            scaleSymbolX: {
                start: 1.0,
                end: 0.1,
                duration: 0.6,
                easing: Easing.quadIn,
                loop: false
            },
            scaleSymbolY: {
                start: 1.0,
                end: 0.1,
                duration: 0.6,
                easing: Easing.quadIn,
                loop: false
            }
        });
        this.display.addColorAnimation(vanishId, {
            fg: {
                start: '#00FF00FF',
                end: '#00FF0000',
                duration: 0.6,
                easing: Easing.quadIn,
                loop: false
            }
        });
        this.animatedTiles.push(vanishId);

        // Add door animation
        const doorStartTime = performance.now();
        const doorLeft = this.display.createTile(
            2, 3,           // Position left door panel
            '',             // Right-half block
            '#888888FF',     // Gray color
            '#444444FF',     // Darker background
            2,              // zIndex
            {
                bgPercent: 0.5,
                fillDirection: FillDirection.RIGHT  // Fill from left to right
            }
        );

        const doorRight = this.display.createTile(
            2, 3,          // Position right door panel
            '',            // Left-half block
            '#888888FF',    // Match left door
            '#444444FF',
            2,
            {
                bgPercent: 0.5,
                fillDirection: FillDirection.LEFT  // Fill from right to left
            }
        );

        const doorBehind = this.display.createTile(2, 3, '', '#000000FF', '#000000FF', 1);

        // Add value animations for both door panels
        this.display.addValueAnimation(doorLeft, {
            bgPercent: {
                start: 0.5,      // Start half open
                end: 0.05,       // Almost closed
                duration: 2.0,    // 2 seconds per cycle
                reverse: true,    // Bounce back and forth
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doorStartTime
        });

        this.display.addValueAnimation(doorRight, {
            bgPercent: {
                start: 0.5,
                end: 0.05,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doorStartTime
        });

        this.animatedTiles.push(doorLeft, doorRight);




           // Add door animation
           const doubleDoorStartTime = performance.now();
           const doubleDoorLeft = this.display.createTile(
               4, 3,           // Position left door panel
               '',             // Right-half block
               '#888888FF',     // Gray color
               '#444444FF',     // Darker background
               3,              // zIndex
               {
                   bgPercent: 0.5,
                   fillDirection: FillDirection.RIGHT  // Fill from left to right
               }
           );
   
           const doubleDoorRight = this.display.createTile(
               4, 3,          // Position right door panel
               '',            // Left-half block
               '#888888FF',    // Match left door
               '#444444FF',
               3,
               {
                   bgPercent: 0.5,
                   fillDirection: FillDirection.LEFT  // Fill from right to left
               }
           );

           const doubleDoorTop = this.display.createTile(4, 3, '', '#666666FF', '#333333FF', 2, {
            bgPercent: 0.5,
            fillDirection: FillDirection.TOP  // Fill from top to bottom
           });
           const doubleDoorBottom = this.display.createTile(4, 3, '', '#666666FF', '#333333FF', 2, {
            bgPercent: 0.5,
            fillDirection: FillDirection.BOTTOM  // Fill from bottom to top
           });
   
           const doubleDoorBehind = this.display.createTile(4, 3, '', '#000000FF', '#000000FF', 1);

           this.display.addValueAnimation(doubleDoorLeft, {
            bgPercent: {
                start: 0.5,
                end: 0.05,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doubleDoorStartTime
           });

           this.display.addValueAnimation(doubleDoorRight, {
            bgPercent: {
                start: 0.5,
                end: 0.05,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doubleDoorStartTime
           });  

           this.display.addValueAnimation(doubleDoorTop, {
            bgPercent: {
                start: 0.5,
                end: 0.05,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doubleDoorStartTime + 450  // Add 250ms (0.25 seconds) delay
           });      

           this.display.addValueAnimation(doubleDoorBottom, {
            bgPercent: {
                start: 0.5,
                end: 0.05,
                duration: 2.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            },
            startTime: doubleDoorStartTime + 450  // Add 250ms (0.25 seconds) delay
           });      

           this.animatedTiles.push(doubleDoorLeft, doubleDoorRight, doubleDoorTop, doubleDoorBottom);


        // Replace the single smoke bomb with the pattern
        this.createSmokeBombPattern(10, 7);

        // Create fire effect
        this.createFireEffect(15, 11);

        // Create laser row
        this.createLaserRow(12, false);

        this.createLaserRow(13, true);

        this.createLaserRow(14, true, 0.50, 0.40);

        this.createLaserRow(16, false, 0.50, 0.30);

        // Continuous rotation
        const spinnerTile = this.display.createTile(37, 16, '↑', '#FFFF00FF', '#000000FF', 1);
        this.display.addValueAnimation(spinnerTile, {
            rotation: {
                start: 0,
                end: Math.PI * 2,  // Full rotation
                duration: 2.0,
                loop: true,
                easing: Easing.linear
            }
        });
        this.animatedTiles.push(spinnerTile);

        // Pendulum rotation
        const pendulumTile = this.display.createTile(36, 17, '⚊', '#FF00FFFF', '#000000FF', 1);
        this.display.addValueAnimation(pendulumTile, {
            rotation: {
                start: -Math.PI / 4,  // -45 degrees
                end: Math.PI / 4,     // +45 degrees
                duration: 1.5,
                reverse: true,
                loop: true,
                easing: Easing.sineInOut
            }
        });
        this.animatedTiles.push(pendulumTile);

        // Combined rotation and scale effect
        const pulsarTile = this.display.createTile(37, 18, '✦', '#00FFFFFF', '#000000FF', 1);
        this.display.addValueAnimation(pulsarTile, {
            rotation: {
                start: 0,
                end: Math.PI * 2,
                duration: 3.0,
                loop: true,
                easing: Easing.linear
            },
            scaleSymbolX: {
                start: 0.5,
                end: 1.5,
                duration: 1.5,
                reverse: true,
                loop: true,
                easing: Easing.sineInOut
            },
            scaleSymbolY: {
                start: 0.5,
                end: 1.5,
                duration: 1.5,
                reverse: true,
                loop: true,
                easing: Easing.sineInOut
            }
        });
        this.animatedTiles.push(pulsarTile);
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 