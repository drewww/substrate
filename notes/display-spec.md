This document describes the functionality of the "runner" display library. This document functions as an english language description of what I intend to build. It may also be a macro prompt to an LLM to build the bones of the system.

Visually, my goal is to mimic the appearance of terminal-style rogue-like games like: rogue, nethack, and games of that lineage. A world that is large, tile-based, and where a tile has a symbol, a foreground color, and aa background color.

Names
-----

We'll call this `matrix-display`.


Initialization
--------------

To create a new display object, pass in the HTMLElement.id in which to instantiate the display, as well as the dimensions (in pixels) of each cell, and the width and height in terms of the count of cells.

Color
-----

Color is presumed throughout to be a CSS-compliant color string, including opacity.

Prefer the 8-digit hex format for colors, e.g. full opacity red is "#FF0000FF".

Graphics Model
--------------

Each cell in the matrix has the following properties (in order from top to bottom layer).

 - [1] overlay (color) [default: #00000000]
 - [0-N] tiles
  - (symbol, fg-color, bg-color, z-index)
 - [1] default background (symbol, fg-color, bg-color)

Overlay and default backgrounds exist for all cells. Other tiles are optional.

The viewport on the cells should be abstracted from the total world dimensions. In other words, the world may be 100 cells wide and tall, but the viewport is located at 20,20 and extends 30 wide and 30 high. There should be methods for updating the viewport.

Whenever a cell updates, it computes in descending z order all the tiles in the cell and generates a final output based on some simple rules. For symbol, fg-color, and bg-color, take the value of the highest z-index that is not null.

So in a basic example lets say we have two tiles:
 - (1) symbol: '@', fg-color: "#ffffffff", bg-color: null
 - (0) symbol: '.', fg-color: "#aaaaaaff", bg-color: "#111111ff"

The output should be: symbol: '@', fg-color: "#ffffffff", bg-color: "#111111ff"


Symbols are rendered in the middle of the cell, and scaled to fill the space. So for example if the tile is 20x20 pixels, the font size should be large enough to roughly fill it with a few pixels of padding all around.

If the size of a cell is less than 10x10 pixels, do not render the symbol at all and just use the background color and overlay.

Update
------

Cells can be updated in a variety of manners. There are three kinds of properties for cells: an overlay, 0-N tiles, and a background.

Each of these properties can be set either: individually (e.g. a single x,y pair set to a specific value), every property set to the same value, rectangles set to the same value, or based on some function that takes an (x,y) value and returns a tile/overlay/background for that value or null to represent not upating that cell.

I don't know how performance works, but my presumption is there will need to be a sophisticated system for only redrawing the parts of the screen that need redrawing.

The most common "redraw" will be moving the viewport, so it is probably prudent to render in the background the entire world and then when changing the viewport just copy a different part to the output buffer. When a single cell, or collection of cells update, only those cells should be redrawn.

Animation
---------

I haven't thought much about how animation will work. Except that there should be a way to do the following sorts of things:
 - animate a list of cells in order, like a laser moving from one point to another where the cells "light up" in order and then fade.
- create a "pulse" where an expanding circle of tiles are "lit up" on the overlay
- power lines in the environment "pulse" as if energy is moving along them periodically
- a symbol or fg/bg color can change periodically on its own


Symbols
-------

The system should support a range of fonts, including a CP437 traditional font as well as a modern "nerdfont" with a range of high resolution symbols. I'm not sure which style I want.


Testing
-------

There should be a robust test environment for explorig the capabilities of the display. It should be easy to trigger any aspect of the system, perhaps using keystrokes or <button>s.

Tests should include:
 - changing every tile to a random color as fast as possible
 - scroll through all the tiles one at a time, updating the background color
 - scroll through all the tiles one at at time, updating the symbol to a new random symbol
 - A variety of overlay animations. Laser lines, ripple effects, fade all tiles, a left-to-right "wipe" effect, and so on.
 - A single "symbol" moving around the screen, starting in the middle and moving up/down/left right randomly each frame.

The test environment should show an estimated frames per second counter. It doesn't need to be rendered in the canvas element; a simple div text field that is updated every frame is sufficient.


Language: Javascript (Typescript)
