Walls
-----

I'd like to add in "walls" as a property of tiles in the game. This allows for more diversity in creating spaces, because we can radically compress a space by adding walls "between" cells rather than being limited to filling an entire cell with an entity to separate two spaces. 

This has a number of components:
 - We need some way to represent walls as entities. 
 - We need to be able to render walls.
 - When calculating FOV, we need to take walls into account.
 - When considering movement, we need to take walls into account.

Walls can be:
 - passable or impassable
 - opaque or transparent
 - they can have a fg color (but not background color)
 - they cannot accept animations(? I think, not sure why we'd want them to? I guess their color is animateable?)
 - they cannot have a light emitter?

This makes them a subset of entities, but with some additional constraints. One option is to make them their own components. For example, WallComponent with a set of boolean flags for north, south, east, west, as well as passability and opacity. 

Tricky question: how to handle "duplicate" walls? For instance, if we have a wall on the north side of a tile, and a wall on the south side of a tile, do we draw two walls? Or do we draw one wall? 

https://www.redblobgames.com/grids/edges/ <-- this is a good reference for how to handle edges between tiles.

It suggests either storing only N and W walls for a given tile. Or keeping a separate array in the World object that just handles walls, with dedicated coordinate system that refers to walls in an exclusive manner. The thing with the separate array is that it undermines the Entity system by injecting another sort of thing into the data model. Also, consider that most tiles will NOT have walls, so we'd be storing a lot of empty space in the array. 

We could do this with the N and W style only. It gets a little annoying because let's say in the world generation, you want to create a wall on the south side of a given tile. You need to instead add a North wall to one tile down. Similarly if you want to ask "is there a wall to the south" you have to check a different tile's entity. But I suppose we can fix this in the World API with helper methods around walls. It's stored canonically in exactly one place, but we can do lookups and setting of walls in a wall that's easier to use.

Answers to questions:
 - Walls do not connect visually to each other in a special way; they are rendered as lines on the edges between tiles. They should visually connect, but not in a special way. Just draw up to the edge of the tile.
 - Appearance is the same no matter which wall it is. (Renderer subclasses could overload this, I suppose.)
 - Walls overlay tile backgrounds. 
 - Walls do not cast shadows. (Although a shadow system IS interesting, and could be implemented later. For example a half-height "wall" that can be jumped over could cast a shadow and let some light through.)
 - Walls exist on the edge of a tile, not within it. So walls don't intersect WITHIN a tile, they could meet at the edges.
 - Walls at first will have only one height -- full. We may later add half-height walls that can be jumped over. 
 - Walls do not have thickness, they are always effectively infinitely thin between the cells.
 - Walls cannot have two-sided-ness. At least for now; later a one-way transparency is conceivable. But not a v1 feature.
 - Walls do not have health.
 - Walls can be destroyed; functionally this is just removing the component or unsetting one of the flags on the component.
 - Entities do not at first have any interaction with walls. The one feature I have in mind is that an entity moving fast enough can break certain walls.
 - Walls that are impassable block pathfinding. But not all walls must be impassable.


 Future ideas:
    - Walls can have a color to them, and light passing through them can be tinted.
    - Bulk destruction for AOE effects.
    - Batch rendering of walls in the renderer. 
    - Walls can have a vertical height property which informs if they can be jumped over, and how light propagates.
    - Walls can limit how far visibility extends through them, e.g. they can be translucent and stop rays from propgagting as far as they might otherwise. 