# Fix: Hardcoded Team Member IDs in checkTeamEvents()

## Issue
Conflict check in `conversations.js:691-695` hardcodes `tanue_designer` and `sasha_junior`. Won't work with randomly generated teams or different team compositions.

## Solution
Make conflict check dynamic:

```javascript
// Find all team members on the same project
const projectAssignments = {};
window.GameState.team.forEach(member => {
    if (member.currentAssignment && member.id !== 'player') {
        if (!projectAssignments[member.currentAssignment]) {
            projectAssignments[member.currentAssignment] = [];
        }
        projectAssignments[member.currentAssignment].push(member);
    }
});

// Check for conflicts on projects with 2+ members
Object.entries(projectAssignments).forEach(([projectId, members]) => {
    if (members.length >= 2 && Math.random() < 0.03) {
        // Trigger conflict between first two members
        triggerTeamEvent(members[0], 'eager_conflict');
    }
});
```

