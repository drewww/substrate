Display
-------

 - test small versions
 - Look into blend modes and decide whether/how we want to do that.
 - adjust offset so symbols can appear to move between tiles
 - test layering multiple canvases
 - border effects? ex. a wall lit from one side but not the other
   - the inverse of this could be middle-out background fill for like a smoke bomb effect
 - modularize the display code??
 - break up matrix-display.ts into multiple files
 

 - DONE Add a "tile group" concept?
 - DONE Add "move tile" operation that maintains state on the tile
 - DONE Add some sort of animation capability 
    - a callback on tiles that updates its symbol or color
    - symbol updates could be like a flapping bird, a flickering light, etc.
    - one key capability: a background that can "fill up" to show when it's going to move next.
        - This is probably a background option changing, % height, % width, etc.
    - also, lower down in the case of like breaking down a door.
    - consider something for smoke dissipating?
 - DONE Add string rendering
    - consider different sizing? for not following the cell grid at all??
 - DONE delete buffer canvas, not sure why we're triple buffered right now. seems not to be used for anything.
 - DONE Refactor overlays to use the same logic as any other cell. 
