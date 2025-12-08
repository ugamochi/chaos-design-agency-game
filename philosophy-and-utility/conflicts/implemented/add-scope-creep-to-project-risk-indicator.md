# Fix: Add Scope Creep to Project Risk Indicator

## Issue
Risk indicator in `projects.js:237-260` (`updateProjectRisk`) tracks satisfaction, timeline, budget. Need to add scope creep risk without breaking existing logic.

## Solution
Add scope creep to risk calculation:

```javascript
function updateProjectRisk(project) {
    const risk = project.risk || {};
    
    // Existing risk calculations...
    
    // Add scope creep risk
    const scopeCreepCount = project.scopeCreepCount || 0;
    if (scopeCreepCount >= 3) {
        risk.scopeCreep = 'high';
    } else if (scopeCreepCount >= 2) {
        risk.scopeCreep = 'medium';
    } else if (scopeCreepCount >= 1) {
        risk.scopeCreep = 'low';
    } else {
        risk.scopeCreep = 'none';
    }
    
    project.risk = risk;
}
```

