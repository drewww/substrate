WORLD GENERATION
----------------

First problem to solve is how to generate static worlds. We'll tackle the more complex problem of procedural generation later. Sometimes this is called "prefabs."

Properties of a good prefab system:
 - The output should be flat text.
 - We expect output is generated in Google Sheets, and then exported as a CSV. (consider: can we drop the seperators?)
    - Should we consider JSON? We could have 
 - I should be able to load a prefab from a file
 - I should be able to save a prefab to a file

 Tiles are represented by a single character, i.e. '#' representse a wall, '.' represents a floor, etc.

 In a prefab output we also want to have definitions for these symbols that map them to system internals. For example a statement like:

A wall is composed of:
 - SymbolComponent
    - symbol: '#'
    - foregroundColor: 'gray'
    - backgroundColor: 'gray'
    - zIndex: 1
    - alwaysRenderIfExplored: true
 - OpaqueComponent
 - ImpassableComponent
 - WallComponent (COME BACK TO THIS ITS TRICKY)
 - MetadataComponent -- something we can latch onto for, say, identifying places to optionally spawn an enemy.

 #,{type: 'symbol', char: '#', foreground: 'gray', background: 'gray', zIndex: 1, alwaysRenderIfExplored: true}, {type: 'opaque'}

 


Thought -- it's useful to mirror the internal data models as closely as possible, so if I add a property to a component, it's automatically available for being set in the prefab. That implies that JSON representations versus index-based representations are useful. 

WALLS -- the problem with walls is they exist only on the N and W sides of a tile. And they have their own metadata -- [render, opaque, impassable]. So we need six booleans to fully describe the walls on a tile.

 - DECIDED: Represent walls as modifier characters -- "-" means a NORTH wall, "|" means a WEST wall.
 - NEXT PROBLEM: how to represent the wall tuples. because a wall can be invisible but impassable, visible and opaque, and so on.

- | -> default wall, [true, true, true]
~ { -> glass wall, [true, false, true]
^ ! -> invisible wall, [false, false, true]


Question?
 - Is it better to make it editable in a spreadsheet? It's easier to do bulk editing in that context. And then output as flat text, either comma separated or not comma separated.
 - In runner v1 we had a notion of trigger tiles, and dialog we displayed when you walked over them.



EXAMPLE DEFINITON FILE
#   [{type: 'symbol', char: '#', foreground: '#888888FF', background: '#666666FF', zIndex: 1}, {type: 'opacity', isOpaque: true}]
.   [{type: 'symbol', char: '.', foreground: '#333333FF', background: '#000000FF', zIndex: 1}, {type: 'opacity', isOpaque: false}]
@   [{type: 'symbol', char: '@', foreground: '#FFD700FF', background: '#000000FF', zIndex: 5}, {type: 'player'}, {type: 'impassable'}, {type: 'vision', radius: 30}]

EXAMPLE LEVEL FILE
#,#,#,#,#,#,#,#,#,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,@,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,.,.,.,.,.,.,.,.,#,
#,#,#,#,#,#,#,#,#,#,
