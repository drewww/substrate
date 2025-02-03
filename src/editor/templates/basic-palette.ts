export default {
{
    "version": "1.0",
    "entities": [
      {
        "id": "wall_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": "#",
            "foreground": "#666666",
            "background": "#FFFFFF",
            "zIndex": 100,
            "alwaysRenderIfExplored": true
          },
          {
            "type": "opacity"
          },
          {
            "type": "impassable"
          }
        ]
      },
      {
        "id": "floor_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": ".",
            "foreground": "#FFFFFF",
            "background": "#000000",
            "zIndex": 100,
            "alwaysRenderIfExplored": true          }
        ]
      },
      {
        "id": "player_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": "@",
            "foreground": "#FFFF00FF",
            "background": "#00000000",
            "zIndex": 100
          },
          {
            "type": "opacity"
          },
          {
            "type": "impassable"
          },
          {
            "type": "vision",
            "radius": 30
          },
          {
            "type": "player"
          },
          {
            "type": "inertia",
            "direction": 4,
            "magnitude": 0
          },
          {
            "type": "cooldown",
            "cooldowns": {
              "move": {
                "base": 4,
                "current": 4,
                "ready": false
              }
            }
          }
        ]
      },
      {
        "id": "enemy_follower_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": "F",
            "foreground": "#FF0000",
            "background": "#000000",
            "zIndex": 100
          },
          {
            "type": "opacity"
          },
          {
            "type": "impassable"
          },
          {
            "type": "vision",
            "radius": 10
          },
          {
            "type": "enemy_ai",
            "aiType": "follower",
            "speed": 4,
            "range": 10
          },
          {
            "type": "cooldown",
            "cooldowns": {
              "move": {
                "base": 4,
                "current": 4,
                "ready": false
              }
            }
          }
        ]
      },
      {
        "id": "vehicle_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": "E",
            "foreground": "#0000FF",
            "background": "#000000",
            "zIndex": 100
          },
          {
            "type": "facing",
            "direction": 1
          },
          {
            "type": "opacity"
          },
          {
            "type": "impassable"
          },
          {
            "type": "followable"
          },
          {
            "type": "cooldown",
            "cooldowns": {
              "move": {
                "base": 4,
                "current": 4,
                "ready": false
              }
            }
          }
        ]
      },
      {
        "id": "follower_template",
        "position": { "x": 0, "y": 0 },
        "components": [
          {
            "type": "symbol",
            "char": " ",
            "foreground": "#000000FF",
            "background": "#441111FF",
            "zIndex": 100
          },
          {
            "type": "opacity"
          },
          {
            "type": "impassable"
          },
          {
            "type": "follower"
          },
          {
            "type": "followable"
          }
        ]
      }
    ]
  }
}