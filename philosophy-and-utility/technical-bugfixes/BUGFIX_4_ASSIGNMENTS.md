# BUG 4: Team Assignment System Fix

## Problem
`member.currentAssignment` (single project) conflicts with `project.teamAssigned` (array). Causes wrong hour calculations and UI showing incorrect assignments.

## Evidence
```javascript
// Member can only track ONE project:
member.currentAssignment = "project_1"; 

// But arrays track multiple:
project_1.teamAssigned = ["mike", "sarah"];
project_2.teamAssigned = ["mike"]; // Mike on 2 projects!

// Result: UI shows Mike only on project_1, but hours split between both
```

## Fix Instructions

### Part 1: Update Data Structure (state.js)

Find team member initialization and change:
```javascript
// OLD:
currentAssignment: null,

// NEW:
assignedProjects: [],  // Array of project IDs
hourSplitRatio: 1.0,
hoursPerProject: 40
```

### Part 2: Update assignTeamMember() (projects.js)

Replace the function with:
```javascript
function assignTeamMember(projectId, memberId) {
    const project = GameState.projects.find(p => p.id === projectId);
    const member = GameState.team.find(m => m.id === memberId);
    
    if (!project || !member) return;
    
    // Add to both arrays
    if (!project.teamAssigned.includes(memberId)) {
        project.teamAssigned.push(memberId);
    }
    if (!member.assignedProjects.includes(projectId)) {
        member.assignedProjects.push(projectId);
    }
    
    // Recalculate hour splits
    recalculateHourSplits();
    updateUI();
}
```

### Part 3: Update removeTeamMemberFromProject() (projects.js)

```javascript
function removeTeamMemberFromProject(projectId, memberId) {
    const project = GameState.projects.find(p => p.id === projectId);
    const member = GameState.team.find(m => m.id === memberId);
    
    if (!project || !member) return;
    
    // Remove from both arrays
    project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
    member.assignedProjects = member.assignedProjects.filter(id => id !== projectId);
    
    // Remove from all phase assignments
    if (project.phases) {
        project.phases.forEach(phase => {
            phase.teamAssigned = phase.teamAssigned.filter(id => id !== memberId);
        });
    }
    
    recalculateHourSplits();
    updateUI();
}
```

### Part 4: Add Hour Split Calculator (projects.js)

Add this new function:
```javascript
function recalculateHourSplits() {
    GameState.team.forEach(member => {
        const count = member.assignedProjects.length;
        
        if (count === 0) {
            member.hourSplitRatio = 1.0;
            member.hoursPerProject = member.hours;
        } else {
            member.hourSplitRatio = 1 / count;
            member.hoursPerProject = member.hours * member.hourSplitRatio;
        }
        
        console.log(
            `${member.name}: ${count} projects, ` +
            `${(member.hourSplitRatio * 100).toFixed(0)}% per project, ` +
            `${member.hoursPerProject.toFixed(1)}h each`
        );
    });
}
```

### Part 5: Update UI Display (ui.js)

In team member card rendering:
```javascript
const assignmentList = member.assignedProjects.map(projectId => {
    const project = GameState.projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown';
}).join(', ');

const assignmentText = assignmentList || 'None';
const hourSplitText = member.assignedProjects.length > 0
    ? `${(member.hourSplitRatio * 100).toFixed(0)}% per project`
    : 'Not assigned';

// Add to UI:
// Assigned to: Project A, Project B
// Hour split: 50% per project (20h each)
```

### Part 6: Migration Code (state.js)

Add this to run on game load:
```javascript
function migrateTeamAssignments() {
    GameState.team.forEach(member => {
        if (member.currentAssignment && !member.assignedProjects) {
            member.assignedProjects = [member.currentAssignment];
            delete member.currentAssignment;
        }
        if (!member.assignedProjects) {
            member.assignedProjects = [];
        }
        if (member.hourSplitRatio === undefined) {
            member.hourSplitRatio = 1.0;
            member.hoursPerProject = member.hours;
        }
    });
    recalculateHourSplits();
}
```

## Testing

### Test 1: Single Assignment
1. Assign Mike to Project A
2. Check console: "Mike: 1 projects, 100% per project, 40.0h each"
3. Check UI: "Assigned to: Project A"

### Test 2: Multiple Assignments
1. Assign Mike to Project B (while on A)
2. Check console: "Mike: 2 projects, 50% per project, 20.0h each"
3. Check UI: "Assigned to: Project A, Project B"

### Test 3: Removal
1. Remove Mike from Project A
2. Check console: "Mike: 1 projects, 100% per project, 40.0h each"
3. Check UI: "Assigned to: Project B"

## Files to Modify
- `state.js` - Update member structure, add migration
- `projects.js` - Update assignment functions, add hour calculator
- `ui.js` - Update team card rendering
