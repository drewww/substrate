SOUND SYSTEM
============

We want to be able to play sounds in the game. The sorts of scenarios I'm thinking about are:
 - play a sound when turbo is engaged
    - play a sound when the player tries to engage turbo but is too slow
 - play a sound when turbo disengages
 - play a sound on stun
 - play a sound on crash
 - play a sound when turning
 - adjust engine sound based on speed
 - play a sound every player activity tick
 - play a sound when an enemy fires (use spatial audio??)
 - play a sound while an enemy is locking on to the player (looped beeps)
 - cars honking horns if they're blocked by the player or a bot? but not a car??
 - play a sound when the player uses equipment

Capabilities:
 - load sounds
 - trigger sounds (very responsively)
 - spatial audio, adjusting some volume by distance
 - play sounds with consistent timing, i.e. on the beat
 - loop sounds until told to stop

Overall Architecture
--------------------

I'm not sure how sounds should trigger. I guess it's like renderer?? It observes the world and reacts to entities being created, updated, and destroyed.

Or action handlers could call it directly? It will be a LOT of components to route through. Cases like a car honking because it's blocked ... we add "honking" to the car entity and then consume it in the sound system? 


FAQ
---
 - We will react to speed change with component modification events.
 - For now, a single hard coded falloff function.
 - Yes, sound should occlude by walls. Treat it like light, use the same FOV system.
 - I'd like to get a global beat going, and quantize sounds to that. But if that's hard, maybe we don't need it. And not everything will land on the beat.