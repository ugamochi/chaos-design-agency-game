# CURSOR PROMPT: Fix Assignment System - Real Time Physics

## Problem
Workers assigned to multiple projects/phases cause TIME CLONING bug:
- Mike on 4 active phases loses 1 hour but contributes 40 hours of work
- Physically impossible: 1 game hour ≠ 40 game hours of output

## Core Rule
**1 game hour = 1 game hour of work capacity**
- Mike works 1 hour alone = 1 hour of progress
- Mike works 1 hour on 3 projects = 0.33h progress each
- Mike + Sarah work 1 hour = 2 hours combined progress

---

## Fix 1: Remove Auto-Assignment to Phases

### In projects.js - Find updatePhaseProgress function (around line 700)

**DELETE THIS ENTIRE BLOCK:**
```javascript
// Check for phase activation (waiting -> active/ready)
if (previousStatus === 'waiting' && (newStatus === 'active' || newStatus === 'ready')) {
    triggerPhaseActivation(project, phaseName);
    // Auto-assign project team members to newly activated phases
    if (!phase.teamAssigned) {
        phase.teamAssigned = [];
    }
    (project.teamAssigned || []).forEach(memberId => {
        if (!phase.teamAssigned.includes(memberId)) {
            phase.teamAssigned.push(memberId);
        }
    });
}
```

**REPLACE WITH:**
```javascript
// Check for phase activation (waiting -> active/ready)
if (previousStatus === 'waiting' && (newStatus === 'active' || newStatus === 'ready')) {
    triggerPhaseActivation(project, phaseName);
    // No auto-assignment - workers contribute to active phase via project assignment
}
```

---

## Fix 2: Change Hour Splitting Logic

### In projects.js - updatePhaseProgress function (around line 765-780)

**FIND THIS:**
```javascript
// Count total active assignments across ALL projects and phases for this member
const totalAssignments = window.GameState.projects.reduce((count, p) => {
    if (!p.phases || p.status === 'complete') return count;
    const activePhases = ['management', 'design', 'development', 'review'].filter(ph => {
        const phase = p.phases[ph];
        return phase && 
               phase.teamAssigned && 
               phase.teamAssigned.includes(member.id) && 
               phase.status !== 'complete' && 
               phase.status !== 'waiting';
    });
    return count + activePhases.length;
}, 0);
```

**REPLACE WITH:**
```javascript
// Count total PROJECT assignments (not phases)
// Each project counts as ONE assignment regardless of how many phases are active
const totalAssignments = (member.assignedProjects || []).length;
```

---

## Fix 3: Workers Contribute to Active Phase Only

### In projects.js - updatePhaseProgress function (around line 720-735)

**FIND THIS:**
```javascript
// Get team members assigned to this phase
const phaseTeam = phase.teamAssigned || [];
const assignedMembers = window.GameState.team.filter(m => 
    phaseTeam.includes(m.id) && !m.isIll
);
```

**REPLACE WITH:**
```javascript
// Get team members assigned to THIS PROJECT (they work on active phase)
const assignedMembers = window.GameState.team.filter(m => 
    (project.teamAssigned || []).includes(m.id) && !m.isIll
);
```

---

## Fix 4: Update Phase Assignment Functions

### In projects.js - Find assignTeamMemberToPhase function

**DELETE THE ENTIRE FUNCTION** (no longer needed)

### In projects.js - Find removeTeamMemberFromPhase function

**DELETE THE ENTIRE FUNCTION** (no longer needed)

### In projects.js - Find assignTeamMemberToAllPhases function

**DELETE THE ENTIRE FUNCTION** (no longer needed)

---

## Fix 5: Clean Up Exports

### In projects.js - At bottom of file (around line 1400+)

**FIND:**
```javascript
window.assignTeamMemberToPhase = ProjectsModule.assignTeamMemberToPhase;
window.removeTeamMemberFromPhase = ProjectsModule.removeTeamMemberFromPhase;
window.assignTeamMemberToAllPhases = ProjectsModule.assignTeamMemberToAllPhases;
```

**DELETE THOSE THREE LINES** (functions no longer exist)

---

## Fix 6: Update assignTeamMember Function

### In projects.js - Find assignTeamMember function

**REPLACE ENTIRE FUNCTION WITH:**
```javascript
function assignTeamMember(projectId, memberId) {
    const project = GameState.projects.find(p => p.id === projectId);
    const member = GameState.team.find(m => m.id === memberId);
    
    if (!project || !member) return;
    
    // Add to project team
    if (!project.teamAssigned.includes(memberId)) {
        project.teamAssigned.push(memberId);
    }
    
    // Add to member's project list
    if (!member.assignedProjects) {
        member.assignedProjects = [];
    }
    if (!member.assignedProjects.includes(projectId)) {
        member.assignedProjects.push(projectId);
    }
    
    // Recalculate hour splits (based on number of projects, not phases)
    recalculateHourSplits();
    
    console.log(`Assigned ${member.name} to ${project.name}`);
    updateUI();
}
```

---

## Fix 7: Update removeTeamMemberFromProject Function

### In projects.js - Find removeTeamMemberFromProject function

**REPLACE ENTIRE FUNCTION WITH:**
```javascript
function removeTeamMemberFromProject(projectId, memberId) {
    const project = GameState.projects.find(p => p.id === projectId);
    const member = GameState.team.find(m => m.id === memberId);
    
    if (!project || !member) return;
    
    // Remove from project team
    project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
    
    // Remove from member's project list
    if (member.assignedProjects) {
        member.assignedProjects = member.assignedProjects.filter(id => id !== projectId);
    }
    
    // Recalculate hour splits
    recalculateHourSplits();
    
    console.log(`Removed ${member.name} from ${project.name}`);
    updateUI();
}
```

---

## Testing

### Test 1: Single Project Assignment
```
1. Assign Mike to Project A (Management phase active)
2. Wait 1 game hour
3. Expected:
   - Mike: 40h → 39h (loses 1 hour)
   - Project progress: ~1 hour worth (based on Mike's mgmt skill)
```

### Test 2: Multiple Project Assignment
```
1. Assign Mike to Project A, Project B, Project C
2. Wait 1 game hour
3. Expected:
   - Mike: 40h → 39h (loses 1 hour)
   - Each project progress: ~0.33 hour worth
   - Total work output: ~1 hour (not 3 hours!)
```

### Test 3: Team Collaboration
```
1. Assign Mike + Sarah to Project A
2. Wait 1 game hour
3. Expected:
   - Mike: 40h → 39h
   - Sarah: 40h → 39h
   - Project progress: ~2 hours worth (Mike + Sarah combined)
```

### Test 4: Console Logs
```
Watch console for:
✓ "Assigned Mike to Project A"
✓ "Mike: 3 projects, 33% per project, 13.3h each"
✗ No more phase assignment logs
```

---

## What This Fixes

✅ **Time Physics:** 1 game hour = 1 game hour of work
✅ **No Time Cloning:** Mike can't work 40 hours in 1 hour
✅ **Simple Assignment:** Assign to projects, not phases
✅ **Skill-Based:** Workers contribute based on skill in active phase
✅ **Strategic:** Balance focused work vs spreading thin

## Files to Modify
- projects.js (all fixes above)
