# Fix: Burnout/Morale Decay Functions Need Difficulty Awareness

## Issue
Burnout and morale decay rates in `projects.js:70-231` (`updatePlayerBurnout`, `updateTeamMorale`) are hardcoded. Difficulty multipliers need to be applied.

## Solution
Pass difficulty multiplier to decay functions:

```javascript
const difficulty = window.GameState.difficulty || 'realistic';
const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
const burnoutRate = baseBurnoutRate * multipliers.burnout;
const moraleDecay = baseMoraleDecay * multipliers.moraleDecay;
```

Apply these multipliers in `updatePlayerBurnout()` and `updateTeamMorale()` functions.

