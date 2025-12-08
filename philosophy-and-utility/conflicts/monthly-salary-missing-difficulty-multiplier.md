# Fix: Monthly Salary Calculation Missing Difficulty Multiplier

## Issue
`processMonthlySalaries()` in `game.js:469-508` uses fixed constants:
- `MONTHLY_SALARY_PER_MEMBER: 2000`
- `MONTHLY_OVERHEAD: 1200`
No difficulty multiplier applied.

## Solution
Apply difficulty cost multiplier:

```javascript
const difficulty = window.GameState.difficulty || 'realistic';
const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
const monthlySalary = teamSize * MONTHLY_SALARY_PER_MEMBER * multipliers.cost;
const monthlyOverhead = MONTHLY_OVERHEAD * multipliers.cost;
```

