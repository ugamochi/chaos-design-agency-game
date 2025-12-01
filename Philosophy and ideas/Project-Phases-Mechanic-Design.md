# Project Phases Mechanic: Design & Analysis

## Executive Summary

This document analyzes the proposed phase-based project system (Management → Design → Development → Review) with flexible role assignments. It evaluates the mechanic against similar games, identifies strengths and potential issues, and proposes an optimal implementation approach.

---

## 1. Critical Analysis of Your Concept

### ✅ **Strengths of Your Approach**

1. **Realistic Agency Workflow**
   - Mirrors actual agency processes (brief → design → build → QA)
   - Creates natural decision points and bottlenecks
   - Allows for strategic resource allocation

2. **Flexible Specialization**
   - Managers can design/develop when needed (realistic)
   - Art Director can do everything but is time-constrained (perfect metaphor)
   - Prevents "one person does everything" gameplay

3. **Strategic Depth**
   - Forces players to think about phase sequencing
   - Creates interesting tradeoffs (rush vs quality)
   - Adds resource management layer

4. **Narrative Opportunities**
   - "Mike the Designer is stuck in development phase" = story
   - "Art Director had to code because Sarah quit" = drama
   - Phase transitions = natural conversation triggers

### ⚠️ **Potential Issues to Address**

1. **Complexity Creep**
   - Risk of overwhelming players with phase management
   - Need clear visual feedback for current phase
   - Must avoid feeling like "work" instead of "game"

2. **Bottleneck Frustration**
   - If design phase blocks everything, players might feel stuck
   - Need escape valves (rush options, phase skipping with penalties)

3. **Role Confusion**
   - When can managers design? When is it "rushed"?
   - Need clear rules for cross-role work
   - Should show efficiency penalties visually

4. **Phase Sequencing**
   - Can phases overlap? (Design Phase 1 while Dev Phase 2?)
   - Or strictly sequential? (More realistic but slower)
   - This decision affects game pace significantly

---

## 2. Research: How Other Games Handle This

### **Game Dev Tycoon** (Similar Genre)
- **Approach**: Simple "Research → Design → Development → Marketing" phases
- **Mechanics**: 
  - Phases are sequential (can't start dev until design done)
  - Team members have specialties but can do other tasks
  - Efficiency penalties for wrong role (50% slower)
- **What Works**: Simple, clear, doesn't overwhelm
- **What Doesn't**: Too rigid, no overlap, feels artificial

### **Software Inc.** (Business Sim)
- **Approach**: Tasks have phases, but team members work on multiple projects
- **Mechanics**:
  - Phases can overlap (design next feature while dev current)
  - Specialists work faster but generalists more flexible
  - Can assign anyone to any task with efficiency loss
- **What Works**: Realistic, flexible, strategic depth
- **What Doesn't**: Can get complex, hard to track

### **Two Point Hospital** (Management Sim)
- **Approach**: Rooms have "states" (waiting → diagnosis → treatment)
- **Mechanics**:
  - Staff can work in multiple room types (with training)
  - Specialists are faster but expensive
  - Can rush with penalties
- **What Works**: Visual clarity, clear tradeoffs
- **What Doesn't**: Less applicable to creative work

### **Papers, Please** (Decision-Heavy)
- **Approach**: Single task, but multiple "phases" of decision-making
- **Mechanics**:
  - Each day has phases (morning prep → processing → evening review)
  - Can't skip phases, but can optimize within them
- **What Works**: Creates rhythm, decision points
- **What Doesn't**: Too linear for multi-project agency

---

## 3. Recommended Implementation Approach

### **Option A: Sequential Phases with Overlap** (RECOMMENDED)

**Structure:**
```
Project Timeline:
┌─────────────────────────────────────────────┐
│ Management Phase: [████████░░] 80%          │
│ Design Phase:    [████░░░░░░] 40% (can start at 60% management)
│ Development:     [░░░░░░░░░░] 0% (waits for design)
│ Review:          [░░░░░░░░░░] 0% (waits for dev)
└─────────────────────────────────────────────┘
```

**Mechanics:**
- **Management Phase** (0-100%): Planning, requirements, client alignment
  - Can start **Design** at 60% management (risky but faster)
  - Can start **Development** at 80% design (risky but faster)
  - **Review** requires 100% development
  
- **Phase Requirements:**
  - Management: Needs Manager OR Art Director
  - Design: Needs Designer OR Art Director (Manager can help at 50% efficiency)
  - Development: Needs Developer OR Art Director (Designer can help at 40% efficiency)
  - Review: Needs Manager OR Art Director (anyone can review at 60% efficiency)

- **Efficiency Multipliers:**
  - Primary role: 100% efficiency
  - Art Director: 90% efficiency (can do anything well)
  - Cross-role (Manager doing Design): 50% efficiency
  - Cross-role (Designer doing Dev): 40% efficiency
  - Cross-role (anyone doing Review): 60% efficiency

**Why This Works:**
- ✅ Realistic (agencies do overlap phases)
- ✅ Strategic (rush vs quality tradeoff)
- ✅ Flexible (can use wrong people if desperate)
- ✅ Clear visual feedback
- ✅ Creates interesting decisions

---

### **Option B: Strict Sequential Phases**

**Structure:**
```
Project must complete phases in order:
Management [██████████] 100% → 
Design [██████████] 100% → 
Development [██████████] 100% → 
Review [██████████] 100%
```

**Mechanics:**
- Each phase must reach 100% before next starts
- No overlap allowed
- Simpler but less flexible

**Why This Might Not Work:**
- ❌ Too rigid (doesn't match real agencies)
- ❌ Slower gameplay
- ❌ Less strategic depth
- ❌ Can create frustrating bottlenecks

---

### **Option C: Parallel Phase Tracks**

**Structure:**
```
Management: [████████░░] 80%
Design:    [██████░░░░] 60% (parallel)
Development: [░░░░░░░░] 0% (waits)
Review: [░░░░░░░░] 0% (waits)
```

**Mechanics:**
- Multiple phases can run simultaneously
- Each phase has independent progress
- More complex but very realistic

**Why This Might Be Too Complex:**
- ⚠️ Harder to track visually
- ⚠️ More UI complexity
- ⚠️ Risk of overwhelming players
- ⚠️ But most realistic to actual agency work

---

## 4. Detailed Recommended System (Option A Enhanced)

### **Phase Definitions**

#### **Phase 1: Management (Planning & Setup)**
- **Purpose**: Define scope, requirements, timeline, budget
- **Required Skills**: Management, Communication
- **Who Can Do It**:
  - Manager: 100% efficiency
  - Art Director: 90% efficiency
  - Designer: 30% efficiency (can help but not ideal)
  - Developer: 20% efficiency (very inefficient)
- **Progress Factors**:
  - Base: Manager skill × 0.15 per day
  - Client responsiveness affects speed
  - Scope changes slow progress
- **Can Trigger**: Client conversations, scope creep requests

#### **Phase 2: Design (Creative Development)**
- **Purpose**: Visual design, UX, wireframes, mockups
- **Required Skills**: Design, Creativity
- **Who Can Do It**:
  - Designer: 100% efficiency
  - Art Director: 90% efficiency
  - Manager: 50% efficiency (can design but slower)
  - Developer: 30% efficiency (can do basic design)
- **Progress Factors**:
  - Base: Designer skill × 0.12 per day
  - Client feedback cycles slow progress
  - Can start at 60% Management (risky: might need changes)
- **Can Trigger**: Design review conversations, client feedback

#### **Phase 3: Development (Implementation)**
- **Purpose**: Code, build, implement design
- **Required Skills**: Development, Technical
- **Who Can Do It**:
  - Developer: 100% efficiency
  - Art Director: 85% efficiency (can code but not as fast)
  - Designer: 40% efficiency (can do basic frontend)
  - Manager: 25% efficiency (very inefficient)
- **Progress Factors**:
  - Base: Developer skill × 0.10 per day
  - Design completeness affects speed (incomplete design = slower)
  - Can start at 80% Design (risky: might need design changes)
- **Can Trigger**: Technical blockers, bug reports

#### **Phase 4: Review (QA & Client Approval)**
- **Purpose**: Testing, revisions, client sign-off
- **Required Skills**: Attention to detail, Communication
- **Who Can Do It**:
  - Manager: 100% efficiency (best at client communication)
  - Art Director: 90% efficiency
  - Designer: 60% efficiency (can review design quality)
  - Developer: 60% efficiency (can review technical quality)
- **Progress Factors**:
  - Base: Reviewer skill × 0.08 per day
  - Requires 100% Development
  - Client satisfaction affects speed
- **Can Trigger**: Revision requests, final approval conversations

---

### **Phase Overlap Rules**

1. **Design can start at 60% Management**
   - Risk: 30% chance of needing management changes
   - Benefit: Saves 2-3 days
   - Visual: Show "RISKY OVERLAP" warning

2. **Development can start at 80% Design**
   - Risk: 40% chance of needing design changes (rework)
   - Benefit: Saves 3-4 days
   - Visual: Show "RISKY OVERLAP" warning

3. **Review requires 100% Development**
   - No overlap allowed (too risky)
   - But can prepare review materials during dev

---

### **Efficiency Penalties for Cross-Role Work**

| Worker → Task | Manager | Designer | Developer | Art Director |
|---------------|---------|----------|-----------|--------------|
| Management    | 100%    | 30%      | 20%       | 90%          |
| Design        | 50%     | 100%     | 30%       | 90%          |
| Development   | 25%     | 40%      | 100%      | 85%          |
| Review        | 100%    | 60%      | 60%       | 90%          |

**Visual Feedback:**
- Show efficiency % on team assignment UI
- Color code: Green (100%), Yellow (50-90%), Red (<50%)
- Tooltip: "Manager doing Design: 50% efficiency (2x slower)"

---

### **Phase Progress Calculation**

```javascript
// Pseudo-code for phase progress
function updatePhaseProgress(project, phase) {
  const assignedMembers = getAssignedMembers(project, phase);
  
  let totalEfficiency = 0;
  assignedMembers.forEach(member => {
    const roleEfficiency = getEfficiencyForRole(member, phase);
    const skillMultiplier = member.skill / 5; // 1-5 skill scale
    const moraleMultiplier = member.morale.current / 100;
    
    totalEfficiency += roleEfficiency * skillMultiplier * moraleMultiplier;
  });
  
  // Base progress per day
  const baseProgress = getBaseProgressForPhase(phase); // 0.08-0.15 depending on phase
  const dailyProgress = baseProgress * totalEfficiency;
  
  // Apply phase-specific modifiers
  if (phase === 'design' && project.managementProgress < 1.0) {
    dailyProgress *= 0.7; // Slower if management incomplete
  }
  
  if (phase === 'development' && project.designProgress < 0.8) {
    dailyProgress *= 0.6; // Much slower if design incomplete
  }
  
  project[phase + 'Progress'] = Math.min(1.0, 
    project[phase + 'Progress'] + dailyProgress
  );
}
```

---

## 5. UI/UX Considerations

### **Visual Phase Display**

```
┌─────────────────────────────────────────────────────┐
│ Project: Neon Meridian Portal Refresh              │
│ Client: Neon Meridian Labs                          │
│ Status: ⚠️ Design Phase (Risky Overlap)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Management: [████████████████████] 100% ✓          │
│ Design:     [████████████░░░░░░░] 65%  ⚠️          │
│ Development: [░░░░░░░░░░░░░░░░░░] 0%   ⏸️          │
│ Review:      [░░░░░░░░░░░░░░░░░░] 0%   ⏸️          │
│                                                     │
│ Assigned to Design:                                │
│   • Tanue (Designer) - 100% efficiency             │
│   • You (Art Director) - 90% efficiency            │
│                                                     │
│ ⚠️ Warning: Development started early (80% design)  │
│    Risk of rework: 40%                             │
└─────────────────────────────────────────────────────┘
```

### **Phase Transition Indicators**

- **Green checkmark**: Phase complete, safe to proceed
- **Yellow warning**: Phase incomplete but next phase started (risky)
- **Red stop**: Phase blocked, cannot proceed
- **Blue info**: Phase ready but waiting for previous phase

---

## 6. Integration with Existing Systems

### **How This Fits Current Game**

1. **Project Structure** (projects.js)
   - Add `phases` object to project:
   ```javascript
   project.phases = {
     management: { progress: 0, status: 'active' },
     design: { progress: 0, status: 'waiting' },
     development: { progress: 0, status: 'waiting' },
     review: { progress: 0, status: 'waiting' }
   }
   ```

2. **Team Assignment** (projects.js)
   - Modify `assignTeamMember()` to specify phase
   - Show efficiency preview before assignment
   - Allow assigning same person to multiple phases (with time split)

3. **Progress Calculation** (projects.js)
   - Replace single `progress` with phase-based progress
   - Overall project progress = weighted average of phases
   - Project complete when Review phase = 100%

4. **Conversations** (conversations.js)
   - Phase transitions trigger conversations
   - "Design phase complete, ready for development?"
   - "Management wants to start design early - risky but faster"

5. **Client Satisfaction** (projects.js)
   - Each phase completion affects satisfaction
   - Rushed phases (overlap) reduce satisfaction
   - Perfect phase completion increases satisfaction

---

## 7. Gameplay Impact Analysis

### **Strategic Decisions Created**

1. **Rush vs Quality**
   - Start design at 60% management? (Faster but risky)
   - Start development at 80% design? (Faster but might rework)
   - Decision depends on: timeline pressure, client personality, team capacity

2. **Resource Allocation**
   - Put Art Director on management? (Fast but wastes their versatility)
   - Put Manager on design? (Slow but frees up Designer)
   - Decision depends on: phase bottlenecks, team availability

3. **Phase Prioritization**
   - Which project's design phase gets the Designer?
   - Should Art Director help with management or jump to design?
   - Decision depends on: deadlines, client satisfaction, project value

### **Narrative Opportunities**

1. **Phase-Specific Conversations**
   - Management: "Client wants to add feature X during planning"
   - Design: "Designer stuck, needs Art Director input"
   - Development: "Developer found design issue, needs redesign"
   - Review: "Client wants last-minute changes before launch"

2. **Crisis Events**
   - "Design phase blocked - client won't approve requirements"
   - "Development phase stuck - design incomplete"
   - "Review phase delayed - critical bugs found"

3. **Team Dynamics**
   - "Manager doing design work - morale penalty (feels out of role)"
   - "Art Director spread across 3 phases - burnout risk"
   - "Designer wants to help with development - skill growth opportunity"

---

## 8. Implementation Complexity Assessment

### **Low Complexity (MVP)**
- ✅ Basic phase structure (4 phases, sequential)
- ✅ Simple progress bars
- ✅ Role efficiency table (hardcoded)
- ✅ Phase completion triggers next phase

**Time Estimate**: 2-3 days

### **Medium Complexity (Recommended)**
- ✅ Phase overlap rules
- ✅ Dynamic efficiency calculation
- ✅ Visual phase indicators
- ✅ Phase-specific conversations
- ✅ Risk warnings for overlaps

**Time Estimate**: 5-7 days

### **High Complexity (Full System)**
- ✅ Parallel phase tracks
- ✅ Phase dependencies (design affects dev speed)
- ✅ Dynamic phase requirements per project type
- ✅ Phase-specific skill growth
- ✅ Advanced UI with phase timeline

**Time Estimate**: 10-14 days

---

## 9. Recommendations

### **✅ DO Implement**

1. **Sequential phases with controlled overlap** (Option A)
   - Best balance of realism and gameplay
   - Creates interesting decisions
   - Not too complex

2. **Clear efficiency penalties for cross-role work**
   - Makes specialization meaningful
   - Creates resource scarcity
   - Visual feedback is crucial

3. **Phase-specific conversations and events**
   - Adds narrative depth
   - Makes phases feel different
   - Creates memorable moments

4. **Visual phase progress indicators**
   - Players need to see phase status at a glance
   - Color coding and icons help
   - Show risks clearly

### **⚠️ CONSIDER CAREFULLY**

1. **Phase overlap rules**
   - Start simple (no overlap)
   - Add overlap as enhancement if needed
   - Test thoroughly - can be frustrating if too risky

2. **Art Director versatility**
   - 90% efficiency is strong but not overpowered
   - Time constraint (can't be everywhere) balances it
   - Consider burnout penalty for multi-phase work

3. **Phase completion requirements**
   - 100% required? Or 80% with penalties?
   - Test both approaches
   - 100% feels more "gamey" but clearer

### **❌ AVOID**

1. **Too many phases** (keep it to 4)
   - More phases = more complexity
   - Current 4 phases cover agency work well

2. **Hidden efficiency calculations**
   - Players need to see why someone is slow
   - Transparency creates better decisions

3. **Rigid phase locking**
   - No overlap at all feels artificial
   - Some flexibility makes it more fun

---

## 10. Next Steps

### **Phase 1: Prototype (Week 1)**
1. Add phase structure to project objects
2. Create basic phase progress calculation
3. Update UI to show phase bars
4. Test with 1 project, 4 phases, sequential only

### **Phase 2: Enhance (Week 2)**
1. Add efficiency system for cross-role work
2. Implement phase overlap rules
3. Add phase-specific conversations
4. Test with multiple projects

### **Phase 3: Polish (Week 3)**
1. Refine visual indicators
2. Balance efficiency penalties
3. Add phase transition animations/feedback
4. Playtest and iterate

---

## 11. Conclusion

Your phase-based approach is **solid and well-thought-out**. The key is:

1. **Keep it simple initially** - Start with sequential phases
2. **Add flexibility gradually** - Overlap rules can come later
3. **Make tradeoffs visible** - Players need to see why decisions matter
4. **Balance realism with fun** - Some gamey elements are okay

The recommended system (Option A with enhancements) provides:
- ✅ Strategic depth without overwhelming complexity
- ✅ Realistic agency workflow
- ✅ Interesting resource allocation decisions
- ✅ Narrative opportunities
- ✅ Clear visual feedback

**This mechanic will significantly enhance the game's strategic depth while maintaining the chaotic, decision-heavy feel that makes it unique.**

---

## Appendix: Example Phase Flow

### **Normal Flow (No Overlap)**
```
Day 1-5:   Management [████████████████████] 100%
Day 6-12:  Design    [████████████████████] 100%
Day 13-20: Development [████████████████████] 100%
Day 21-23: Review    [████████████████████] 100%
Total: 23 days
```

### **Rushed Flow (With Overlap)**
```
Day 1-3:   Management [████████████] 60% → Start Design
Day 4-8:   Management [████████████████████] 100% ✓
           Design     [████████████████████] 100% ✓ (started early)
Day 9-15:  Development [████████████████████] 100% ✓ (started at 80% design)
Day 16-18: Review    [████████████████████] 100%
Total: 18 days (5 days saved, but 30% risk of rework)
```

### **Crisis Flow (Wrong People Assigned)**
```
Day 1-10:  Management [████████████████████] 100% (Manager doing it)
Day 11-25: Design     [████████████████████] 100% (Manager doing design at 50% efficiency = 2x slower)
Day 26-35: Development [████████████████████] 100% (Designer doing dev at 40% efficiency = 2.5x slower)
Day 36-40: Review     [████████████████████] 100%
Total: 40 days (almost 2x slower due to wrong roles)
```

This creates clear strategic choices: **Speed vs Quality vs Resource Efficiency**.

