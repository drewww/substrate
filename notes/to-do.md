Display
-------

 - test small versions
 - DONE adjust offset so symbols can appear to move between tiles
   - this has proven to be hard. look at if we can just move it faster and "hide" the issues?
   - otherwise we need to do tricky clipping stuff. turn off clipping in some circumstances, and move it over, turn it back on?
   - and we'd need to fix the smearing issue. may need to be a first-order internal capability because it's really jointly rendering two cells at once.
   - another idea: make it move to the right and fade out and fade in on the next cell? just in the last two frames
 - DONE add symbolScaleX and symbolScaleY. Simple, creates more options. 
 - consider skewX and skewY
 - DONE think about "mobile cells."
   - there's a rendering issue with them and redrawing -- gotta be careful with dirtying everything around them properly. 
 - Look into blend modes and decide whether/how we want to do that.
 - test layering multiple canvases
 - DONE border effects? ex. a wall lit from one side but not the other -- this is just bg percentage
   - the inverse of this could be middle-out background fill for like a smoke bomb effect
 - modularize the display code??
 - break up matrix-display.ts into multiple files
 
 - DONE look into tile.x/y -- something is odd here. I think we don't want state there? and the tile can get it from the parent cell if necessary?
   - think more broadly about how tiles and cells interact

 - make a test that moves the viewport with fractional numbers and see if it's smooth

 Optimization Ideas
 ------------------

  - sorting tiles for every render seems expensive and we could just ensure it on insert and update
  - cache rendered symbols somewhere and do copys instead of fillText every time
    - THIS WAS HARD. DPI scaling bullshit. Couldn't get sizes right. 
  -  does our use of graphics contexts cost performance? `.save()` seems to be expensive??
  - DONE add back in "dirty" concept
   - fix ripple though, something about that is not dirtying properly
   - and then figure out mobile cells and how they interact with dirtying -- they have no clip technically but really we just need to have a big bounding box around them that we can dirty.
  - add culling of opaque tiles that are behind other tiles
  
 - consider some way to "bake" a tile -- when you create a tile, ask for it to be rendered out and then get an ID for a pre-rendered tile and future creates can use that id. Then instead of render logic for the tile, we C&P the cached version.

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

 - DONE Add mouse input support. Not sure where it goes. Eventually you want to get entities back for a location. Display knows about the viewport and the tiles, but how to trace backwards? I guess it's just a mapping of screen space to game space and that's all the Display knows. Then the World query systems can get you entities for that location. 

 - Serialize/Deserialize with an entire game object. Like, make a button that saves the game and stops the engine and a button that re-inflates based on the JSON saved. 
 - get some basic movement game logic working -- you can't move into an enemy, can't move into a wall.
 - experiment with increasing speed??
 - experiment with enemies coming towards you (which I guess means implement pathfinding)
 - get FOV built and some visualiation of it (a visible component, probably.)
 - spend some time writing out the different gameplay concepts and think about the minimum capabilities to try it

 - think about data driven inputs for things. like, exposing all the tuning parameters for the game into a CSV or someting for easier editing?

 - Think about hierarchical Tiles in Display. If you wanted to move an entity that was composed of multiple tiles, they'd all need animations. That's bad. We want to have a transform that is inherited by its children during drawing. 
  - One simple test of this is that a multi-part animation (as seen in the animation test case) should be able to be moved WHILE animating. 
  - I'm not acutally positive I need it though? The one multi-part thing I know I need is vision. Let's think about that. one way to model it is abunch of tiles that are children of the entity. Entity moves, tile moves. OK. But ACTUALLY they are proprties of the entities being SEEN. Consider an entity moving towards a wall. If you shift its vision into the wall, it will look weird and need to be dropped. So actually this should be components on a tile -- seen by entity. 
   - If we want to get clever, we can animate that vision in from the direction of the entity moving. Like, "if become seen, figure out where it's from." 
   - soooo don't build this quite yet.
   - RELATED idea. I'm struggling with some of these design considerations because I don't know what I'm trying to support. So maybe at this point I go broad and build the most basic versions of everything and see what we need.


 - LIGHTING
   - DONE add light emitter component
   - more than radial source effects
   - DONE color animations??
   - ???
   - angle of emission
   - width of emission
   - DONE is there a way to handle non-integer source positions? 
    - you could make it appear to work; intensity is a float and you could have it calculate. The integer x,y is the center of that cell, so (x-0.5, y-0.5) is the upper left corner of that cell. And so on. Then we're calculating the distance from there to the center of other cells to calculate their intensity or radius. 
  - DONE add tests for light emitter JSON serialization
  - consider a "don't light source tile" option

 - Make smoke bomb FOV aware.

 - implement walls??
 - DONE make sure lighting doesn't waste time simulating when it's not visible


- DONE REMEMBER TO CHECK ON LIGHT EMITTER COMPONTNET SERIALIZATION

- DONE implement width? can we get a like, 180 degree light source working?
  - DONE fix the "mode" -- probably don't need it at all?
  - DONE factor out the falloff types into a type
- DONE can we animate facing successfully?
- then probably get out ...


DONE  There's still something wrong with chainloops. If there are different depths of loop, or different timings of loops on the same entity, it can get messed up. Not sure what to do about that.


- check on save/load, I think it broke
- think about what a world generation helper might look like
- world prefabs?
- FOV walls? try placing them on all impassable/opaque wall tiles. that might create more realistic lighting.
  - could there be a way to decrease range of sight going through, like, smoke? maybe not useful
- start to get actually serious about what game we're thinking about


NEXT
----
 - pathfinding
 - see if the movement system is fun??
 - add floors to demo game
 - think about multi-segment enemies, that seems important...?
 - implement a door?? not sure I need them?  Could just be passable walls. But something that causes waiting is interesting.
  - implement smashing through glass??
  - think about generation subsystems
  - 
MOVEMENT NEXT
-------------
 - build a prefab saver and loader
 DONE build a penalty when you move into a wall -- visual, kill inertia, and stun
- add the sliding component to simplify the display logic on when to put the tracks behind
 - design a world that tests different movement skills
   - thin gap
   - something moving open and closed periodically
   - walls that require you to be moving in a certain direction
   - speed bumpbs??
   - something that requires high speed (count time??)
   - intersection with complex obstacles
  - maybe including timing tracker when you cross a line??
  - fix the speed visualizer, it's busted

WALL TODOS
----------

 - DONE add wall component
 - DONE add wall tests
 - DONE add wall serialization tests
 - DONE add wall rendering tests

 done add impassability checks (in the game itself)
 done fix bump anim
 done think about lighting walls -- both "should it render" and how to render it


MODULE LIST
-----------
 * Display (v1.0 done)
 * Input (v1.0 done)
 * Game (v1.0)
  * Takes inputs. Updates the world based on them, while enforcing game rules.
  * Owns the core "clock" of the game. Understands time. 
  * Triggers map generation, loading, saving, puts UI on the screen, etc.
 * World (v1.0)
  * The world tracks the state of the game. It tracks all the locations in the world and their state. Players and enemies and items and doors and such. 
  * Changes to the world are made by the game.
  * In a "model view controller" architecture, the world is the model, the game is the controller. 
  * Now the "view" ... it's not exactly the display. It's something that sits between that turns a world state into a display state. Sometimes we put this on entities like "draw()" that knows how to update the display. It could be that we have something that scans across all the world objects and then triggers updates to the display. 
 * Entity (v1.0)
  * Objects in the world. Mostly just collections of state.
  * They are seriealizeable and deseriealizable. 
 * UI?? menus? Compositing displays with other things?
 * World generation helpers??


THINKING
--------

So let's think about the game we want to make. If we are turn-based, it's clear that everything is always in a tile.

I'm curious about real-time. Now one version of real-time is just you can move whenever you want and it has some amount of time cost to do that (maybe decreasing the more you move in that direction). Even if the animation is tweening locations between two states, it's still fundamenteally discrete tile locations. The animation lines up with the move cooldown, basically.

The one thing I'm thinking about that might violate that is jumping. I had the idea that maybe you press space and a direction and you jump.

Let's map out the interaction. One approach might be you hit space to enter jump "mode" and then any direction you press will jump in that direction.


Related question -- if speed becomes a thing, how does that work? One model is you "heat up" and your cooldowns get lower. And it fades as you don't move. That all tracks.

Now to cross that with the jump idea. If you press space and then move, you jump two spaces in that direction. If you move enough times before you press jump 
Now to cross that with the jump idea. If you press space and then move, you jump two spaces in that direction. If you have momentum in a direction and press jump, it will jump you in that direction. Okay.

And does that violate the "you always exist in a space" question? I thiiiink no. You trigger the animation, but put the entity immediately in the new space and start the cooldown. If the cooldowns are timed right, it will work.

If you buffer another move command while in move CD, it can chain the animations so they stay smooth. Maybe "escape" clears the buffer.

What about collision detection? When a move is made, we can compute whether the path and destination are valid. I guess traditional collision detection is to move the object and let the world push back. But we could also do it in advance.