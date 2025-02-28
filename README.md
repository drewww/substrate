SUBSTRATE
=========

A home-grown set of tools to support a real-time roguelike for #7drl.

Realistically, we're going to run the game-jam in this repository for easy of mutating the (unstable) core library.


SETUP
-----

1. Clone the repository
1. `npm install`
1. `npm run dev` -- start the development server, running at `http://localhost:3000/` by default.
1. `npm run build` -- build the production version
1. `npm run deploy` -- deploy the latest build to `itch.io` and notify discord. (requires `butler` to be installed, and to have proper tokens on `itch.io`)