# Implemented: Phase-Specific Assignments

## Overview
Changed from project-level assignments to phase-specific assignments. Workers are now assigned to individual phases (Management, Design, Development, QA) rather than to entire projects.

## Key Rules

### 1. Phase-Specific Assignment
- Workers are assigned to individual phases, not projects
- Each phase has its own `phase.teamAssigned` array
- Workers only contribute to phases they're explicitly assigned to
- Unassigned workers **sit idle** and don't contribute

### 2. Sequential Phase Activation
- Next phase starts at 50% of previous phase
- Only active phases make progress
- Workers assigned to waiting/complete phases don't contribute

### 3. Hour Splitting
- If worker is assigned to **multiple active phases**, their hours split evenly
- Example: Worker on 2 active phases → 50% time to each
- Example: Worker on 1 active phase → 100% time to it
- Idle workers (no active phase assignments) → no hour deduction

### 4. Worker Behavior
- **Assigned to active phase**: Contributes to that phase
- **Assigned to waiting phase**: Sits idle until phase activates
- **Assigned to complete phase**: Sits idle
- **Not assigned anywhere**: Sits idle

## Implementation Details

### Data Structure
```javascript
// Each phase has its own team assignment array
project.phases.management.teamAssigned = ['player', 'worker_1'];
project.phases.design.teamAssigned = ['worker_2', 'worker_3'];
project.phases.development.teamAssigned = ['player', 'worker_2'];
project.phases.review.teamAssigned = ['player'];

// Project-level assignment is now unused
project.teamAssigned = []; // Empty (no longer used)
```

### UI Changes

#### Assignment Modal (`ui.js` lines 1574-1704)
- Shows 4 columns (one per phase)
- Each column displays:
  - Phase name and status badge
  - Progress bar
  - Team member checkboxes
- Each worker appears in all 4 columns
- Checkbox per phase per worker

#### Project Cards (`ui.js` lines 342-476)
- Phase avatars now show `phase.teamAssigned` members
- Warning messages updated: "NO TEAM ON ACTIVE PHASES"
- Avatar display per phase (already implemented)

### Logic Changes

#### Phase Progress (`projects.js` lines 747-815)
**Before:**
```javascript
const assignedMembers = window.GameState.team.filter(m => 
    (project.teamAssigned || []).includes(m.id) && !m.isIll
);
```

**After:**
```javascript
if (!phase.teamAssigned) {
    phase.teamAssigned = [];
}
const assignedMembers = window.GameState.team.filter(m => 
    phase.teamAssigned.includes(m.id) && !m.isIll
);
```

#### Hour Splitting (`projects.js` lines 789-810)
**Before:**
```javascript
// Count total PROJECT assignments
const totalAssignments = (member.assignedProjects || []).length;
const timeFraction = 1 / totalAssignments;
```

**After:**
```javascript
// Count total ACTIVE phase assignments across ALL projects
let totalActivePhaseAssignments = 0;
window.GameState.projects.forEach(proj => {
    ['management', 'design', 'development', 'review'].forEach(phName => {
        const ph = proj.phases[phName];
        if (ph && ph.teamAssigned && ph.teamAssigned.includes(member.id)) {
            const phStatus = window.getPhaseStatus(proj, phName);
            if (phStatus === 'active' || phStatus === 'ready') {
                totalActivePhaseAssignments++;
            }
        }
    });
});
const timeFraction = 1 / totalActivePhaseAssignments;
```

#### Hour Deduction (`timer.js` lines 222-240)
**Before:**
```javascript
const hasAssignment = (member.assignedProjects && member.assignedProjects.length > 0);
```

**After:**
```javascript
let hasActivePhaseAssignment = false;
window.GameState.projects.forEach(proj => {
    ['management', 'design', 'development', 'review'].forEach(phaseName => {
        const phase = proj.phases[phaseName];
        if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
            const phaseStatus = window.getPhaseStatus(proj, phaseName);
            if (phaseStatus === 'active' || phaseStatus === 'ready') {
                hasActivePhaseAssignment = true;
            }
        }
    });
});
```

### CSS Changes (`styles.css` lines 1167-1260)
- `.phases-assignment-grid`: 4-column grid layout
- `.phase-assignment-column`: Individual phase column styling
- `.team-checkbox-list`: Vertical list of team checkboxes
- `.team-member-checkbox-option`: Checkbox + name + efficiency dot
- `.efficiency-dot`: Color-coded efficiency indicator (high/medium/low)

## Example Usage

### Scenario 1: Sequential Work
```
Management: [You, Worker 1] ← Active (20% done)
Design: [Worker 2, Worker 3] ← Waiting (starts at 50% management)
Development: [You, Worker 2] ← Waiting
Review: [You] ← Waiting

Current work:
- You: 100% on Management
- Worker 1: 100% on Management
- Worker 2: Idle (Design not active yet)
- Worker 3: Idle (Design not active yet)
```

### Scenario 2: Overlapping Phases
```
Management: [You] ← Active (90% done)
Design: [Worker 1, Worker 2] ← Active (10% done, started at 50% management)
Development: [Worker 3] ← Waiting
Review: [You] ← Waiting

Current work:
- You: 100% on Management
- Worker 1: 100% on Design
- Worker 2: 100% on Design
- Worker 3: Idle (Development not active)
```

### Scenario 3: Multi-Phase Worker
```
Project A - Design: [Worker 1] ← Active
Project B - Development: [Worker 1] ← Active

Current work:
- Worker 1: 50% time on Project A Design, 50% time on Project B Development
```

## Files Modified
1. `ui.js` - Assignment modal, project cards, warning messages
2. `projects.js` - Phase progress, hour splitting logic
3. `timer.js` - Hour deduction, active phase detection
4. `styles.css` - Assignment modal styling

## Migration Notes
- Old saves with `project.teamAssigned` will work (workers will be idle until reassigned to phases)
- Each phase initializes `teamAssigned = []` if missing
- No data loss or corruption

## Testing Checklist
- [x] Assignment modal shows 4 columns
- [x] Each worker checkbox is phase-specific
- [x] Save assignments updates `phase.teamAssigned`
- [x] Phase progress uses `phase.teamAssigned`
- [x] Hour splitting counts active phases only
- [x] Hour deduction checks active phases
- [x] Idle workers don't have hours deducted
- [x] Warning messages updated
- [ ] Test with multiple workers on multiple phases
- [ ] Test phase progression with sequential phases
- [ ] Test hour splits with overlapping active phases

