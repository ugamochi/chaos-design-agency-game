# Fix: Scope Creep Tracking + Team Conversations Integration

## Issue
Team conversations might trigger scope creep. Need to ensure scope creep count increments correctly. Team stress from scope creep might trigger team conversations.

## Solution
1. Ensure `handleScopeCreepRequest()` is called from team conversation consequences
2. Add team stress tracking to scope creep handling:

```javascript
// When scope creep occurs, increase team stress
project.scopeCreepCount = (project.scopeCreepCount || 0) + 1;
// Trigger team stress event if needed
if (project.scopeCreepCount >= 2) {
    // Increase team stress for members on this project
}
```

3. Document interaction between systems

