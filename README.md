---
title: NGN5 Game Engine v5.0
emoji: "\U0001F3AE"
colorFrom: "#00ff00"
colorTo: "#0000ff"
sdk: static
pinned: false
---

# NGN5 — Next Gen Game Engine v5.0

> **Universal Engine | Unified Input | Every Game Shares One System**

## What's New in v5.0

- **Unified Input System** — Every game maps Enter/Start to pause, ESC to back, Shift+ESC to settings
- **Gamepad Support** — Standard mapping across all games (auto-detected)
- **Touch Controls** — Virtual buttons + swipe gestures for mobile
- **Universal Pause Menu** — Resume / Settings / Quit — consistent across every game
- **Settings Overlay** — Master volume, SFX, music, screen shake, particles, FPS counter
- **Achievements & Rewards** — Persistent coins, XP, leveling across all games
- **Procedural Audio** — 50+ sound effects, 14 music genres — zero external files
- **Base Game Class** — Every game extends `NGN5.createGame(config)` with guaranteed lifecycle

## Standard Controls (ALL Games)

| Action | Keyboard | Gamepad | Touch |
|--------|----------|---------|-------|
| Move | WASD / Arrows | Left Stick | Swipe |
| Fire / Action | Space / Click | A | Tap |
| Pause | Enter / P | Start | — |
| Back / Menu | Escape | B / Back | — |
| Settings | Shift+ESC | — | — |
| Weapon 1/2/3 | 1 / 2 / 3 | — | — |

## Architecture

Every NGN5 game:
1. Loads `engine.js` (the full engine — one file)
2. Calls `NGN5.createGame(config)` with game-specific callbacks
3. Gets pause, settings, input, audio, achievements for free

```javascript
const game = NGN5.createGame({
  id: 'my-game',
  title: 'My Game',
  onInit() { /* setup */ },
  onUpdate(dt) { /* game logic */ },
  onRender() { /* drawing */ },
  onStart() { /* called when game starts */ },
  onQuit() { /* called when returning to menu */ }
});
game.init();
game.start();
```

## License

Proprietary — All rights reserved. © 2025 sbidesigns
