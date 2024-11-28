Display
-------

 - test small versions
 - adjust offset so symbols can appear to move between tiles
   - this has proven to be hard. look at if we can just move it faster and "hide" the issues?
   - otherwise we need to do tricky clipping stuff. turn off clipping in some circumstances, and move it over, turn it back on?
   - and we'd need to fix the smearing issue. may need to be a first-order internal capability because it's really jointly rendering two cells at once.
   - another idea: make it move to the right and fade out and fade in on the next cell? just in the last two frames
 - add symbolScaleX and symbolScaleY. Simple, creates more options. 
 - Look into blend modes and decide whether/how we want to do that.
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
