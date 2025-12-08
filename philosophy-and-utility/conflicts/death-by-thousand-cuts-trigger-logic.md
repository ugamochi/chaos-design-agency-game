# Fix: "Death by a Thousand Cuts" Trigger Logic

## Issue
Need to check if project has 3+ scope increases and trigger conversation. Must integrate with existing conditional conversation system in `conversations.js`. Should only trigger once per project.

## Solution
Add conditional check in `checkConditionalConversations()`:

```javascript
// Check for "death by a thousand cuts"
window.GameState.projects.forEach(project => {
    if (project.scopeCreepCount >= 3 && 
        !project.deathByThousandCutsTriggered &&
        project.status !== 'complete') {
        queueConversation('death_by_thousand_cuts_' + project.id);
        project.deathByThousandCutsTriggered = true;
    }
});
```

Add `deathByThousandCutsTriggered` flag to prevent repeat triggers. Initialize it when loading projects:

```javascript
if (project.deathByThousandCutsTriggered === undefined) {
    project.deathByThousandCutsTriggered = false;
}
```

