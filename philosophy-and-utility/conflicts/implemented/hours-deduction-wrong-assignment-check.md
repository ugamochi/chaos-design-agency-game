# Fix: Hours Deduction Uses Wrong Assignment Property

## Issue
`deductHoursFromTeam()` in `timer.js:222-228` checks `member.currentAssignment` to determine if a worker should have hours deducted. However, the assignment system has been migrated to use `member.assignedProjects` array instead. This means:

- Workers assigned to projects via `assignedProjects` array don't have hours deducted
- Only the player (who always has hours deducted) and workers with legacy `currentAssignment` property lose hours
- This causes workers to never run out of hours, breaking the game balance

## Location
`timer.js:216-228` - `deductHoursFromTeam()` function

## Current Code
```javascript
// Only deduct if member is working (has assignment or is player)
const hasAssignment = member.currentAssignment !== null && member.currentAssignment !== undefined;
const isPlayer = member.id === 'player';

if (!hasAssignment && !isPlayer) {
    return; // Not working, don't deduct
}
```

## Solution
Update the check to use `assignedProjects` array:

```javascript
// Only deduct if member is working (has assignment or is player)
const hasAssignment = (member.assignedProjects && member.assignedProjects.length > 0) || 
                      (member.currentAssignment !== null && member.currentAssignment !== undefined);
const isPlayer = member.id === 'player';

if (!hasAssignment && !isPlayer) {
    return; // Not working, don't deduct
}
```

This maintains backward compatibility with `currentAssignment` while supporting the new `assignedProjects` system.

## Testing
1. Assign a worker to a project (not the player)
2. Start the timer
3. **Expected**: Worker's hours should decrease at 1 hour per second
4. **Current bug**: Worker's hours don't decrease

