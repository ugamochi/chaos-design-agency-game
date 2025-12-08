# Fix: Hardcoded Default Values in resetToDefaultState()

## Issue
`resetToDefaultState()` in `state.js:80-114` hardcodes starting values that don't account for difficulty multipliers:
- `money: 8000` (line 84)
- `teamMorale: 75` (line 85)
- `highestMorale: 75` and `lowestMorale: 75` (lines 103-104)

## Solution
1. Add `difficulty` field to `GameState` (default: 'realistic')
2. Create `getDifficultyMultipliers(difficulty)` function in `constants.js`
3. Modify `resetToDefaultState()` to use multipliers:

```javascript
const difficulty = GameState.difficulty || 'realistic';
const multipliers = getDifficultyMultipliers(difficulty);
GameState.money = Math.round(8000 * multipliers.startingMoney);
GameState.teamMorale = Math.round(75 * multipliers.startingMorale);
GameState.highestMorale = GameState.teamMorale;
GameState.lowestMorale = GameState.teamMorale;
```

4. Load difficulty from localStorage or default to 'realistic'

