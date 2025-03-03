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


Okay now for the L-system itself.

TRUE L-systems operate on strings, and then have something that represents those strings.

So we might have an axiom that is...

this is hard. in the classic examples you have a single "pointer" that moves around. The fractal examples are clear.

If we had a "seed" that is "O" and has some implied base location.

then 

wRasd as directions

constants:
    [ push
    ] pop
    + turn right 90
    - turn left 90

commands:
    F push forward one space, make a road

seed:
    O origin

O -> [F]+[F]+[F]+[F]

F -> FF

 later add chances that it splits, makes other strange shapes, and so on. 
 we can have F's that go forward but cannot spawn

and then subsequently there's a rationalization pass that identifies intersections and such.

Now the question is whether it's simpler to express this in code than being fancy with l-systems.
