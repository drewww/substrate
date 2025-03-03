import { beforeEach, describe, expect, it } from 'vitest';
import { StagedLayoutGenerator } from './staged-layout-generator';

describe('StagedLayoutGenerator', () => {
    let generator: StagedLayoutGenerator;

    beforeEach(() => {
        generator = new StagedLayoutGenerator(10, 10);
    });

    describe('wouldCreateRoadBlock', () => {
        it('should detect a 2x2 block of roads', () => {
            // Create a 2x2 block of roads
            generator['placeRoad'](1, 1, 'trunk');
            generator['placeRoad'](1, 2, 'trunk');
            generator['placeRoad'](2, 1, 'trunk');
            
            // Placing a road at (2,2) would complete the 2x2 block
            expect(generator['wouldCreateRoadBlock'](2, 2)).toBe(true);
        });

        it('should not detect a block when there is a building', () => {
            // Create a 2x2 block with one building
            generator['placeRoad'](1, 1, 'trunk');
            generator['placeRoad'](1, 2, 'trunk');
            generator['placeRoad'](2, 1, 'trunk');
            
            // Log the layout before checking
            console.log('\nLayout before check:');
            for (let y = 0; y < 4; y++) {
                let row = '';
                for (let x = 0; x < 4; x++) {
                    const cell = generator['layout'][y][x];
                    row += cell.type === 'road' ? 'R' : '.';
                }
                console.log(row);
            }
            
            // Placing a road at (2,2) would not create a 2x2 block
            expect(generator['wouldCreateRoadBlock'](2, 2)).toBe(false);
        });

        it('should handle edge cases correctly', () => {
            // Create roads along the edge
            generator['placeRoad'](0, 0, 'trunk');
            generator['placeRoad'](0, 1, 'trunk');
            generator['placeRoad'](1, 0, 'trunk');
            
            // Placing a road at (1,1) would create a 2x2 block
            expect(generator['wouldCreateRoadBlock'](1, 1)).toBe(true);
        });

        it('should detect blocks in different orientations', () => {
            // Create a vertical 2x2 block
            generator['placeRoad'](1, 1, 'trunk');
            generator['placeRoad'](1, 2, 'trunk');
            generator['placeRoad'](2, 1, 'trunk');
            
            // Placing a road at (2,2) would create a 2x2 block
            expect(generator['wouldCreateRoadBlock'](2, 2)).toBe(true);

            // Create a horizontal 2x2 block
            generator['placeRoad'](4, 1, 'trunk');
            generator['placeRoad'](5, 1, 'trunk');
            generator['placeRoad'](4, 2, 'trunk');
            
            // Placing a road at (5,2) would create a 2x2 block
            expect(generator['wouldCreateRoadBlock'](5, 2)).toBe(true);
        });

        it('should handle out of bounds positions', () => {
            // Create roads near the edge
            generator['placeRoad'](8, 8, 'trunk');
            generator['placeRoad'](8, 9, 'trunk');
            generator['placeRoad'](9, 8, 'trunk');
            
            // Placing a road at (9,9) would create a 2x2 block
            expect(generator['wouldCreateRoadBlock'](9, 9)).toBe(true);
            
            // Placing a road at (10,10) should not create a block (out of bounds)
            expect(generator['wouldCreateRoadBlock'](10, 10)).toBe(false);
        });
    });
}); 