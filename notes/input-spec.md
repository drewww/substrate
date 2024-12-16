INPUT MANAGER
=============

The goal of this subsystem is to abstract keyboard inputs from game actions. It has the following features:
 - Inputs to actions are mapped in a configuration file
 - The input manager understands modes, which can change the input mapping
 - Inputs are automatically validated, so the same input cannot map to multiple actions within the same mode
 - Inputs can be mapped to actions in multiple modes, so a single input can do different things in different contexts
 - Inputs for a given action can be listed, so the UI can show a player what keys they can use to perform an action
 - Users can select different input profiles, which can change the input mapping at runtime

 CONFIGURATION FILE
 ------------------

The configuration file should be very simple. I don't THINK it needs to be JSON. 

Configuration files are organized by modes, with optional maps for that mode. So for example we will have a keypad mode where movement is mapped to the keypad, and a `wasd` mode where movement is mapped to the wasd keys. Both of these maps will have a `move-up` action, but they will be different keys triggering it. This should be specified with a header row that looks like `mode: game` followed by `map: keypad` or `map: wasd`. To make it flexible, have each of those strings be on a separate line. Then to end the metadata, have a line that is just `---` (any number of dashes > 2 is fine).


Each row could be a comma-seprated list of input strings (that comply with `event.key` values), tab, then a comma-seprated list of action strings that key triggers, then a tab, and then a comma-seprated list of action parameters to include. This is intended to support something like:

    w,ArrowUp   move    up
    s,ArrowDown move    down
    a,ArrowLeft move    left
    d,ArrowRight move    right

The last column is option, and is a parameter that gets passed in with the action. This simplifies action handler code, because it doesn't have to decorate the action with extra parameters.

Actions can have multiple parameters. I'm not sure if we'll need this, but we should be able to handle it. Comma delimited strings only. 

Hot reloading of configuration files should be supported.

Programmatic configuration at runtime is not supported.

Configuration rows with invalid action names should be ignored, and an error logged. If keys and actions are duplicated, it should create a list of warnings across the whole file that can be accessed in the API but loading should continue.

Configuration errors should be stored and accessible via the API.

Action names are case-insensitive and must be a continuous string of letters and dashes (no other symbols). A configuration row with an invalid action name should be ignored, and an error logged.

There are reserved key names:
    - `pass` -- trigger the named action, and add a parameter to pass through the key name. 

MODIFIERS
---------

Modifiers (shift, ctrl, alt, meta) are supported. 

A modifier can be a valid key name in a map. For example:

    ctrl    crouch

Would map the ctrl key to the crouch action.

Modifiers can also be a key name followed by a `+` and then a modifier name. For example:

    ctrl+c    crouch

Would map the ctrl key to the crouch action, but only when both ctrl and c are pressed down at the same time. In this case, the `down` event only triggers when the second key in a pair is pressed, and the `up` event triggers when either key is released.

Modifiers are also always passed as a parameter along with the action in an object that contains all modifiers as booleans, e.g. `{ctrl:true, shift:false, alt:false, meta:false}`.

If both `ctrl+c` and `ctrl` are mapped, fire both actions as appropriate. `ctrl` fires when The ctrl key is pressed down and then up. If `c` is pressed second, fire `ctrl+c`'s mapped action when `c` is pressed. 


MODES
-----

The basic idea is that a key means different "actions" in different contexts. So on the main menu, "enter" might mean "start-game" and it might mean "select" in an in-game menu. So the API needs to have a way to select a mode from a list of modes, and the configuration file needs to be organized around modes. 

No cleanup necessary for modes.

One mode is active at a time.


CALLBACKS
---------

Callbacks are functions that get called when an action is triggered. By default, a callback gets any action triggered, including all its parameters. 

It gets called with the event type pre-pended, i.e. `down.move-up` and `up.move-up`.

We will also create a "repeat" callback that can optionally be called while a key is held down. Repeat is configurable at the input manager configuration level. Repeat is global for all actions, to start. Default to 8 repeats per second. 

Callbacks can optionally be limited to a specific mode.

If a callback returns "true" consider that to stop propagation of that event to other listeners.

When registering a callback, set an "order" integer. Callbacks are called in order from lowest to highest. This enables stop propagation. Callbacks with the same value are not guaranteed to be called in any particular order.



MAPS
----

Only one map is active at a time. Maps are defined by string identifiers. If, for a given mode, that map does not exist then use the default map for that mode. Default maps are specified with a default identifier in the map name, i.e.:

    map: wasd default

When switching maps, let prior key states continue to be processed. So, fire a `up.move-up` when switching from `wasd` to `keypad` if the key was down in `wasd`.

If two maps are listed as default, the last one wins. Print a configuration warning. If no map is listed as default, the first map is used.


FULL CONFIG STRUCTURE
---------------------

mode: game
==========
map: wasd default
---
w,ArrowUp   move    up
s,ArrowDown move    down
a,ArrowLeft move    left
d,ArrowRight move    right

map: hjkl
---
h,ArrowLeft move    left
j,ArrowDown move    down
k,ArrowUp   move    up
l,ArrowRight move    right

mode: menu
==========
map: default
---
enter,ArrowDown start-game




API NOTES
---------

In no particular order, thoughts:
 * Need a way to register a callback for when an action is triggered.
 * Need a way to change the mode.
 * Need to load a configuration file.
 * Need to be able to list the actions for a given mode.
 * Need to be able to list the actions for a given key in a given mode.
 * Needs a validation check to report keys that are mapped to multiple actions within a mode.

OPEN QUESTIONS
--------------

1. Should we allow for multiple inputs to map to the same action? That could be useful for creating custom combos.
1. Should we allow for multiple actions to map to the same input? That could be useful for games that need to map different actions to the same input for different modes.
1. How do we handle the different key events? Down, Up, Press. (A: I think we just pre-fix it? So `down.move-up` would mean the action key for move up was pressed down.)
1. Internally, we want often have common methods for similar events. Like "move" where up/down/left/right are variations but the same method handles them all. Do we push that into the input manager? When we config we COULD say "move" as the action and then have a parameter like "move.up". Then in the action handler, we break upt he string -- it's got up/down as the first part, the action name as the second, and then the rest is parameters. 
1. Mouse??



RAMBLINGS ON MODES
------------------

One approach would be to only issue `.key` strings. But then whoever RECEIVES the input has to figure out which method to call. And remapping gets embedded deep in the code.

What I imagine is that Game (or some up-stream scene manager) registers for keys. Then there's a bit switch that maps actions to methods to call. 

Let's think about this. So in the scene manager versus game comparison ... Do we deregister the scene manager? Or does it stay registered but since the actions aren't interested to it, it just ignores them?

Well there are cases where an action like "move-up" could be relevant in both places. Like a menu versus move the character in-game. I could name those as two separate actions. Is there value in sharing a name?? 

Related issue. Lets say we have a screen with actual text input. We need to accept any key and just hand it through cleanly. I guess that's like a mode, and then a special action that passes through? And knows not to issue OTHER actions those keys might represent. But not EVERY key, since there needs to be some way out. Though that could just be the consumer needs to know to process an individual key and then back out of the mode.

Are modes hierarchical? For instance if we enter "ability-direction-select" mode as in original runner, do we want other keys to still have their original meaning? First approximation -- NO. We can copy the mappings into that mode if we want. 
