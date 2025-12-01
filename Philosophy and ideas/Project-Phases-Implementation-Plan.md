# Project Phases Implementation Plan

## Overview
Implement a 4-phase project system (Management → Design → Development → Review) with flexible team assignments, freelancer hiring, and faster-paced projects.

---

## Core Design Principles

1. **Keep It Simple** - Phases should be intuitive, not overwhelming
2. **Make It Fun** - Fast-paced, visible progress, satisfying completions
3. **Anyone Can Help** - No role restrictions, just efficiency differences
4. **Faster Pacing** - Shorter deadlines, quicker projects, more action

---

## Phase System Design

### The 4 Phases

1. **Management** (Planning & Setup)
   - Define scope, requirements, timeline
   - Anyone can work on it
   - Base progress: 0.20 per day (fast!)

2. **Design** (Creative Work)
   - Visual design, mockups, wireframes
   - Anyone can work on it
   - Base progress: 0.15 per day
   - Can start at 60% Management (risky overlap)

3. **Development** (Implementation)
   - Code, build, implement
   - Anyone can work on it
   - Base progress: 0.12 per day
   - Can start at 80% Design (risky overlap)

4. **Review** (QA & Approval)
   - Testing, revisions, client sign-off
   - Anyone can work on it
   - Base progress: 0.10 per day
   - Requires 100% Development (no overlap)

### Efficiency System (Simple!)

**Base Efficiency by Role:**
- **Primary Role Match**: 100% efficiency
  - Manager → Management: 100%
  - Designer → Design: 100%
  - Developer → Development: 100%
  - Manager → Review: 100% (best at client communication)

- **Art Director**: 90% efficiency on ALL phases (versatile but not perfect)

- **Cross-Role Work**: 60% efficiency
  - Manager doing Design: 60%
  - Designer doing Development: 60%
  - Developer doing Management: 60%
  - Anyone doing Review (except Manager): 60%

**Formula:**
```
Daily Progress = Base Progress × Efficiency × Skill Multiplier × Morale Multiplier
```

Where:
- Base Progress: 0.10-0.20 (depends on phase)
- Efficiency: 0.60-1.00 (depends on role match)
- Skill Multiplier: skill / 5 (1-5 scale)
- Morale Multiplier: morale / 100

---

## Faster Pacing Changes

### Current System
- Estimated Hours: `complexity × 25` (25-125 hours)
- Total Weeks: 6-11 weeks
- Progress per day: ~0.05-0.10

### New System (Faster!)
- **Phase-based hours** instead of total hours:
  - Management: `complexity × 3` hours (3-15 hours)
  - Design: `complexity × 4` hours (4-20 hours)
  - Development: `complexity × 5` hours (5-25 hours)
  - Review: `complexity × 3` hours (3-15 hours)
  - **Total: `complexity × 15`** (15-75 hours, down from 25-125!)

- **Shorter timelines:**
  - Small projects (complexity 1-2): 2-3 weeks
  - Medium projects (complexity 3-4): 3-5 weeks
  - Large projects (complexity 5): 4-6 weeks

- **Faster progress:**
  - Base progress per day: 0.10-0.20 (doubled!)
  - Phases complete in 2-5 days each
  - Projects complete in 1-2 weeks typically

---

## Freelancer System

### When to Hire
- Available when any phase is blocked or behind
- Button appears: "Hire Freelancer for [Phase]"
- Costs: `complexity × 200` (one-time payment)
- Works for: 1 phase only, then leaves

### Freelancer Stats
- Skill: Random 3-5 (good but unpredictable)
- Efficiency: 100% (they're specialists)
- No morale (they don't care, just work)
- Speed: 1.5x normal (they work fast, but expensive)

### Freelancer Types
- **Management Freelancer**: Project manager consultant
- **Design Freelancer**: Contract designer
- **Development Freelancer**: Contract developer
- **Review Freelancer**: QA consultant

### UI
```
┌─────────────────────────────────────┐
│ Design Phase: [██████░░░░] 60%     │
│ ⚠️ Behind schedule!                 │
│                                     │
│ [Hire Design Freelancer] $800      │
│ └─ Speeds up design by 1.5x        │
└─────────────────────────────────────┘
```

---

## Data Structure Changes

### Project Object (Enhanced)
```javascript
{
  // Existing fields...
  id, name, client, type, budget, etc.
  
  // NEW: Phase system
  phases: {
    management: {
      progress: 0,        // 0-1 (0-100%)
      status: 'active',  // 'waiting' | 'active' | 'complete'
      hoursRequired: 12,  // complexity × 3
      hoursCompleted: 0,
      teamAssigned: [],   // Array of member IDs
      freelancerHired: false
    },
    design: {
      progress: 0,
      status: 'waiting', // Can't start until management >= 0.6
      hoursRequired: 16,  // complexity × 4
      hoursCompleted: 0,
      teamAssigned: [],
      freelancerHired: false
    },
    development: {
      progress: 0,
      status: 'waiting', // Can't start until design >= 0.8
      hoursRequired: 20,  // complexity × 5
      hoursCompleted: 0,
      teamAssigned: [],
      freelancerHired: false
    },
    review: {
      progress: 0,
      status: 'waiting', // Can't start until development >= 1.0
      hoursRequired: 12,  // complexity × 3
      hoursCompleted: 0,
      teamAssigned: [],
      freelancerHired: false
    }
  },
  
  // Legacy fields (for backward compatibility during migration)
  estimatedHours: 60,  // Sum of all phase hours
  hoursCompleted: 0,   // Sum of all phase hoursCompleted
  progress: 0,         // Weighted average of phase progress
  
  // Timeline (shorter!)
  totalWeeks: 4,       // Reduced from 6-11
  weeksRemaining: 4
}
```

### Team Member (Enhanced)
```javascript
{
  // Existing fields...
  id, name, role, skill, morale, etc.
  
  // NEW: Phase assignments (can work on multiple phases of same project)
  phaseAssignments: {
    'proj-001': ['management', 'design'],  // Working on 2 phases
    'proj-002': ['development']
  }
}
```

---

## UI Changes

### Project Card (Enhanced)
```
┌─────────────────────────────────────────────────────┐
│ Project: Neon Meridian Portal                       │
│ Client: Neon Meridian Labs                          │
│ Status: ⚠️ Design Phase (Risky Overlap)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Management: [████████████████████] 100% ✓          │
│ Design:     [████████████░░░░░░░] 65%  ⚠️          │
│ Development: [░░░░░░░░░░░░░░░░░░] 0%   ⏸️          │
│ Review:      [░░░░░░░░░░░░░░░░░░] 0%   ⏸️          │
│                                                     │
│ Assigned:                                          │
│   • Tanue (Designer) - Design: 100% efficiency    │
│   • You (Art Director) - Design: 90% efficiency   │
│                                                     │
│ [Hire Design Freelancer] $800                     │
│                                                     │
│ ⚠️ Development started early (80% design)          │
│    Risk of rework: 40%                             │
└─────────────────────────────────────────────────────┘
```

### Phase Assignment UI
```
┌─────────────────────────────────────┐
│ Assign Team to: Design Phase        │
├─────────────────────────────────────┤
│ Available Team:                     │
│                                     │
│ [✓] Tanue (Designer)                │
│     Efficiency: 100% ⭐             │
│                                     │
│ [ ] You (Art Director)             │
│     Efficiency: 90%                 │
│                                     │
│ [ ] Pasha (Developer)                │
│     Efficiency: 60% ⚠️              │
│                                     │
│ [ ] Sasha (Manager)                  │
│     Efficiency: 60% ⚠️              │
│                                     │
│ [Assign Selected]                  │
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Core Phase System (Day 1-2)
1. ✅ Add `phases` object to project structure
2. ✅ Create phase progress calculation functions
3. ✅ Update project hydration to include phases
4. ✅ Calculate phase hours based on complexity
5. ✅ Implement phase status logic (waiting/active/complete)

### Phase 2: Team Assignment (Day 2-3)
1. ✅ Create efficiency calculation function
2. ✅ Update team assignment to work with phases
3. ✅ Allow multiple phase assignments per project
4. ✅ Show efficiency preview in UI
5. ✅ Update progress calculation to use phases

### Phase 3: UI Updates (Day 3-4)
1. ✅ Update project card to show phase bars
2. ✅ Add phase assignment UI
3. ✅ Show phase status indicators
4. ✅ Add overlap warnings
5. ✅ Update timeline display

### Phase 4: Freelancer System (Day 4-5)
1. ✅ Create freelancer hiring function
2. ✅ Add freelancer to phase progress
3. ✅ Create freelancer UI button
4. ✅ Handle freelancer payment
5. ✅ Add freelancer completion events

### Phase 5: Faster Pacing (Day 5)
1. ✅ Reduce project hours (complexity × 15)
2. ✅ Reduce project weeks (2-6 weeks)
3. ✅ Increase base progress rates
4. ✅ Update project templates
5. ✅ Test balance

### Phase 6: Polish & Testing (Day 6-7)
1. ✅ Test phase transitions
2. ✅ Test overlap mechanics
3. ✅ Test freelancer system
4. ✅ Balance efficiency values
5. ✅ Fix bugs and edge cases

---

## Key Functions to Create/Modify

### New Functions
```javascript
// Phase management
calculatePhaseHours(complexity, phaseType)
updatePhaseProgress(project, phaseName)
getPhaseStatus(project, phaseName)
canStartPhase(project, phaseName)
completePhase(project, phaseName)

// Efficiency
getEfficiencyForPhase(member, phaseName)
calculatePhaseEfficiency(teamMembers, phaseName)

// Freelancer
hireFreelancer(projectId, phaseName)
calculateFreelancerProgress(project, phaseName)
```

### Modified Functions
```javascript
// Update these to work with phases
buildProjectFromTemplate() // Add phases
hydrateProject() // Initialize phases
updateProjects() // Use phase progress
assignTeamMember() // Work with phases
getProjectStatus() // Check phase status
completeProject() // Check all phases complete
```

---

## Testing Checklist

- [ ] Phase progress calculates correctly
- [ ] Efficiency penalties work (cross-role = 60%)
- [ ] Art Director gets 90% on all phases
- [ ] Phase overlap rules work (design at 60% management, dev at 80% design)
- [ ] Review requires 100% development
- [ ] Freelancer speeds up phases correctly
- [ ] Freelancer costs money
- [ ] Projects complete faster (1-2 weeks)
- [ ] UI shows phase bars clearly
- [ ] Phase assignments work
- [ ] Multiple people can work on same phase
- [ ] Project completion checks all phases
- [ ] Backward compatibility (old saves still work)

---

## Balance Targets

### Project Completion Times
- Small (complexity 1): 1-2 weeks
- Medium (complexity 3): 2-3 weeks
- Large (complexity 5): 3-4 weeks

### Phase Durations
- Management: 1-2 days
- Design: 2-3 days
- Development: 2-4 days
- Review: 1-2 days

### Efficiency Impact
- Primary role: 100% (baseline)
- Art Director: 90% (slightly slower but versatile)
- Cross-role: 60% (noticeably slower, creates decisions)

### Freelancer Impact
- Cost: `complexity × 200` (expensive!)
- Speed: 1.5x normal (fast but costly)
- Use case: Emergency situations, bottlenecks

---

## Migration Strategy

### Backward Compatibility
1. Check if project has `phases` object
2. If not, create phases from existing `progress`:
   ```javascript
   if (!project.phases) {
     // Migrate old project to phases
     const totalProgress = project.progress || 0;
     project.phases = {
       management: { progress: Math.min(1, totalProgress * 1.2), ... },
       design: { progress: Math.min(1, totalProgress * 1.1), ... },
       development: { progress: totalProgress, ... },
       review: { progress: Math.max(0, totalProgress - 0.9), ... }
     };
   }
   ```

### Gradual Rollout
1. Start with new projects only
2. Keep old projects working with legacy system
3. Migrate old projects when player interacts with them
4. Eventually remove legacy code

---

## Success Metrics

### Fun Factor
- Projects complete in 1-2 weeks (not 6-11!)
- Phases feel meaningful (not just progress bars)
- Decisions matter (who to assign, when to hire freelancer)
- Visual feedback is clear and satisfying

### Balance
- Players can complete 2-3 projects per week
- Freelancer is useful but not required
- Cross-role work is viable but slower
- Art Director is versatile but time-constrained

### Complexity
- Easy to understand (4 phases, clear rules)
- Not overwhelming (simple efficiency system)
- Strategic depth (overlap decisions, resource allocation)

---

## Notes

- **Keep it simple!** Phases should enhance gameplay, not complicate it
- **Make it fast!** Projects should feel snappy, not drag on
- **Anyone can help!** No artificial restrictions, just efficiency differences
- **Freelancer = emergency button** - expensive but fast when needed

This system should make the game more engaging and faster-paced while maintaining strategic depth.

