# CURSOR PROMPT: Fix Assignment System

## Problem
`member.currentAssignment` (single) conflicts with `project.teamAssigned` (array). Wrong hour splits.

## Fix

### 1. In state.js - Update Structure
**REPLACE:**
```javascript
currentAssignment: null,
```
**WITH:**
```javascript
assignedProjects: [],  // Array of project IDs
hourSplitRatio: 1.0,
hoursPerProject: 40
```

### 2. In projects.js - Add Hour Calculator
**ADD THIS FUNCTION:**
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
    });
}
```

### 3. In projects.js - Fix assignTeamMember
**REPLACE ENTIRE FUNCTION:**
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
    
    recalculateHourSplits();
    updateUI();
}
```

### 4. In projects.js - Fix removeTeamMemberFromProject
**REPLACE ENTIRE FUNCTION:**
```javascript
function removeTeamMemberFromProject(projectId, memberId) {
    const project = GameState.projects.find(p => p.id === projectId);
    const member = GameState.team.find(m => m.id === memberId);
    if (!project || !member) return;
    
    // Remove from both arrays
    project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
    member.assignedProjects = member.assignedProjects.filter(id => id !== projectId);
    
    // Remove from all phases
    if (project.phases) {
        project.phases.forEach(phase => {
            phase.teamAssigned = phase.teamAssigned.filter(id => id !== memberId);
        });
    }
    
    recalculateHourSplits();
    updateUI();
}
```

### 5. In projects.js - Fix Progress Calculation
**FIND** where hours are used for progress calculation

**CHANGE FROM:**
```javascript
const hoursToSpend = member.hours;
```
**TO:**
```javascript
const hoursToSpend = member.hoursPerProject; // Use split hours
```

### 6. In ui.js - Update Display
**IN** team member card rendering, **ADD:**
```javascript
const assignments = member.assignedProjects.map(id => {
    const project = GameState.projects.find(p => p.id === id);
    return project ? project.name : 'Unknown';
}).join(', ') || 'None';

// Display: "Assigned to: Project A, Project B"
// Display: "50% per project (20h each)"
```

## Test
- Assign Mike to Project A → shows 100%, 40h
- Assign Mike to Project B → shows 50%, 20h each
- Remove from Project A → shows 100%, 40h

## Files
- state.js (change currentAssignment to assignedProjects array)
- projects.js (add recalculateHourSplits, update assign/remove functions)
- ui.js (show all assignments)
