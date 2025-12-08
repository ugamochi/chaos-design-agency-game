# Fix: Add scopeCreepCount to Project State (Backward Compatibility)

## Issue
Existing projects don't have `scopeCreepCount` field. Old saved games will break or have undefined values when `handleScopeCreepRequest()` in `projects.js:318-352` tries to access it.

## Solution
Initialize `scopeCreepCount` when loading projects:

```javascript
// In hydrateProject() or when loading state
if (project.scopeCreepCount === undefined) {
    project.scopeCreepCount = 0;
}
```

Or initialize in `handleScopeCreepRequest()`:

```javascript
if (!project.scopeCreepCount) project.scopeCreepCount = 0;
project.scopeCreepCount++;
```

