RENDERER
--------

We have so many open questions with renderer. Right now it's so simple. It just adds tiles when an entity is added, and removes them when an entity is removed. Plus a single one-size-fits-all animation for movement.

When we start to add more complex components that influence its appearance, we don't have a model for this at all.

But frankly I don't have a clue what I NEED it to be capable of. The most basic thing is to mirror what I had before -- a SymbolComponent that is manipualted by the game to select how it looks. We had no more complex display than that. So I don't know how much more I need. 

I guess I had ... smoke bomb. Which needed to animate in (on create) and animate out (on remove) and idly animate while present. That seems fine. Let's try to do that. 