INERTIA
-------

I want to try a movement system where the character has inertia.

The model is this:
 - if the character moves twice in the same direction, they gain +1 inertia
 - if the character moves in a direction opposite to their inertia, they lose 1 inertia and stay still
 - if the character moves perpendicular to their inertia, or they do not move, they lose 1 inertia and move one space per initia level in the diretion of their inertia
 - the player has a move cooldown that starts at once per second, and decreases by 200ms per inertia level
 - max inertia is 4, which at which point move cooldowns would be 200ms
 - player inputs are buffered; they move when their move CD is complete, but the most recent directional input while it's counting down is stored and then executed when the cooldown is complete.
 - player input happens first, then the inertia slide is applied
 - if intertia movement is blocked, the player stops and inertia is set to 0 (eventually we will add damage or stun when this happens)



 Bits to build
 -------------

  - Inertia indicator. 
  - Inertial movement system
  - a component for tracking current inertia level
  - adding movecooldown component to player
  - change how the default world is generated
    - add impassable walls to the edges of the map
    - internal space is totally open
    - add number tiles on the floor to help show distance, i.e. 1-9, spaced out ~5 tiles apart. then reset the numbers to 0. They're passable, just a visual indicator.
      - these should count out from the center of the map, with normal visibility. 
    - add some random obstacles to the map
    - reduce to 1 enemy
 - buffered input, with a visual indication of buffered input