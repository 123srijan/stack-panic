# 🏗️ Stack Panic!

A fast, cheerful, and addictive browser stacking arcade game. Slide, trim, and stack blocks to touch the stars!

![Stack Panic Arcade](https://img.shields.io/badge/Stack%20Panic-Playable%20Arcade-indigo?style=for-the-badge)

---

## 🎮 How to Play

1. **Choose Your Difficulty:**
   - **🌱 Easy:** Wider starting blocks (230px), slower speeds, laser alignment guides, and rapid width recovery.
   - **⚡ Medium:** Classic arcade balance (200px), standard speed progression, and 4px perfect tolerance.
   - **🔥 Hard:** Narrow blocks (170px), rapid acceleration, and razor-sharp 2.5px tolerances.
2. **Drop the Block:** Tap the screen, click your mouse, or hit <kbd>Space</kbd> / <kbd>Enter</kbd> to drop the moving block onto the tower.
3. **Precision Matters:** Any portion of the block that overhangs the tower is instantly chopped off, making the next block narrower!
4. **Perfect Landings:** Align blocks precisely to snap into place, rack up **PERFECT COMBO** streaks, and climb the pitch scale.
5. **Width Recovery:** Hit consecutive perfect streaks to restore lost block width!
6. **Game Over:** Miss the tower completely or slice it down to a micro-sliver and the round ends.

---

## ✨ Features

- **Game Service (`gameService.js`):** Centralized game service managing difficulty profiles, parameters, tolerances, high score persistence per difficulty, and career statistics.
- **Difficulty Selector & HUD Badging:** Real-time difficulty switcher on the header and game-over modal, with dynamic theme coloring and HUD badge display.
- **Laser Alignment Guide (Easy Mode):** Dotted emerald laser projection lines help beginners align moving blocks with the underlying tower.
- **Instant Replay:** Rounds start immediately without loading screens or countdowns. One-click "Play Again" (<kbd>Space</kbd> shortcut).
- **Daily Challenge:** A unique seeded game mode using the **Mulberry32 PRNG** seeded with today's date (`YYYY-MM-DD`). Every player worldwide gets the exact same sequence of block colors, speeds, and spawn directions for that day.
- **Challenge a Friend:** Integrated with the **Web Share API** (with automatic fallback to clipboard copy) to share your score, difficulty, streak, and playful verdict with friends.
- **Procedural Sound Engine:** Crisp, responsive sound synthesized in real-time via the **Web Audio API** — zero external audio assets required, guaranteed offline functionality.
  - Melodic ascending pentatonic chime chords on streaks
  - Punchy acrylic snap on drops
  - Swift whoosh and crumble on trims
  - Mute toggle with <kbd>M</kbd> shortcut and `localStorage` persistence.
- **Playful Verdicts & Dynamic Labels:** Real-time animated drop rating labels (`PERFECT! 🎯`, `EXCELLENT! ✨`, `GREAT! 🎯`, `CLOSE CALL! ⚠️`) and rank badges based on height.
- **Zero Backend Required:** All high scores per difficulty and career stats are stored safely in browser `localStorage`.
- **Responsive & Accessible:**
  - Optimized for mobile touchscreens (`touch-action: none` prevents accidental page scrolls or pull-to-refresh).
  - Centered arcade frame on desktop monitors.
  - High-contrast visible focus rings for keyboard navigation.
  - Full support for `prefers-reduced-motion`.

---

## 🕹️ Controls

| Control | Action |
| :--- | :--- |
| **Tap / Click** | Drop block / Select button |
| <kbd>Space</kbd> or <kbd>Enter</kbd> | Drop block / Play Again |
| <kbd>R</kbd> | Restart round immediately |
| <kbd>M</kbd> | Toggle sound on/off |
| <kbd>Esc</kbd> | Close help / stats modal |

---

## 🚀 How to Run

Simply open `index.html` in any modern web browser (Chrome, Edge, Safari, Firefox):

```bash
# Option 1: Open directly in your browser
# Double-click index.html or open via command line:
start index.html

# Option 2: Serve via Python local server
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

---

## 📂 Project Structure

```
stack-panic/
├── index.html        # Semantic HTML5 markup, HUD, and accessible modal overlays
├── styles.css        # Vibrant arcade styling, responsive layout, animations & focus states
├── gameService.js    # Centralized Game Service: difficulty configs, parameters & persistence
├── game.js           # Core game engine, physics, Web Audio synthesizer, PRNG, and touch handlers
├── test_game.py      # Automated element & class binding test suite
├── verify_logic.py   # PRNG seed determinism, difficulty profile & trimming unit tests
└── README.md         # Game documentation & guide
```
