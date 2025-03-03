GENERATOR
=========

First concept is an L-system road generator. And then we fill in the gaps with buildings.

Today, the Generator class does not have "steps" to it. So we may want to add something to it so we can step through generation slowly. In the case of the l-system approach, it will be fixed steps probably, and we just hit a button to advance.

So:
 1. Add some way for the generator to have phases.
 1. Make a toy generator that uses that. Picking 

Actually, this is not even a Generator because it doesn't spit out a world.

This is a LayoutGenerator. 


Also -- do we implement a different renderer that doesn't take a World object but takes this MetaWorld object?

What is our actual data structure that we spit out?
    It's a 2d array, HxW, and each cell has a data structure that has, to start, (road, building). Over time it will get a lot more detail to it. 