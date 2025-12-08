# Fix: Saved State Backward Compatibility for Difficulty

## Issue
Existing saved games won't have `difficulty` field. Loading old saves will default to 'realistic', but if player changes difficulty mid-game, old saves might break.

## Solution
1. Add migration logic in `initGame()` (around `game.js:16-50`):

```javascript
if (!window.GameState.difficulty) {
    window.GameState.difficulty = 'realistic'; // Default for old saves
    window.saveState(); // Save the new field
}
```

2. **Prevent difficulty change mid-game**: Require restart to change difficulty
3. Add warning modal: "Changing difficulty requires restarting the game"

