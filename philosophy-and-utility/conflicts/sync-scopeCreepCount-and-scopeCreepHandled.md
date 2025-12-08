# Fix: Sync scopeCreepCount and scopeCreepHandled Stats

## Issue
`gameStats.scopeCreepHandled` in `state.js:27` tracks total across all projects, while new `scopeCreepCount` tracks per-project. Both serve different purposes but need to stay in sync.

## Solution
Keep both and increment both when scope creep occurs:

```javascript
// In handleScopeCreepRequest() around projects.js:329
project.scopeCreepCount = (project.scopeCreepCount || 0) + 1;
window.GameState.gameStats.scopeCreepHandled++;
```

- `scopeCreepCount` per project (for "death by a thousand cuts" trigger)
- `scopeCreepHandled` in stats (for scoring/end game)

