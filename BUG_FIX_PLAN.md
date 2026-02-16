# Bug Fix Plan - Chaos Design Agency Game

**Analysis Date:** February 16, 2026  
**Total Bugs Identified:** 27 critical and moderate issues

---

## 🔴 CRITICAL PRIORITY (Fix Immediately)

### 1. Hour Deduction Logic Flaw (timer.js)
**Issue:** Workers hitting 0 hours get morale penalty every tick, not just once  
**Location:** `timer.js` → `deductHoursFromTeam()`  
**Fix:**
- Add flag `_hitZeroHoursThisWeek` to prevent repeated penalties
- Only apply morale penalty once when crossing from positive to 0
- Reset flag on weekly reset

**Code Change:**
```javascript
// In deductHoursFromTeam()
if (member.hours <= 0 && !member._hitZeroHoursThisWeek) {
    member._hitZeroHoursThisWeek = true;
    // Apply morale penalty once
}
```

---

### 2. Team Morale Calculation Race Condition (projects.js)
**Issue:** `recalculateTeamMorale()` called multiple times per tick, gradual decay double-counted  
**Location:** `projects.js` → `updateTeamMorale()`  
**Fix:**
- Move `recalculateTeamMorale()` outside the loop
- Apply gradual decay BEFORE other morale changes
- Call `recalculateTeamMorale()` only once at end

**Code Change:**
```javascript
function updateTeamMorale() {
    const tickMultiplier = HOURS_PER_TICK / 8;
    
    // Apply gradual decay first
    GameState.team.forEach(member => {
        if (member.id !== 'player' && member.morale?.current) {
            const gradualDecay = -0.5 * tickMultiplier;
            adjustMemberMorale(member, gradualDecay);
        }
    });
    
    // Then apply other morale changes
    GameState.team.forEach(member => {
        // ... other morale logic
    });
    
    // Recalculate once at end
    recalculateTeamMorale();
}
```

---

### 3. Weekend Choice Modal Timing Bug (timer.js, ui.js)
**Issue:** Day advances to 6 before modal shows, causing confusion  
**Location:** `timer.js` → `tickGameTime()`, `ui.js` → `showWeekendChoiceModal()`  
**Fix:**
- Check for Friday (Day 5) BEFORE advancing day
- Pause timer when modal shows
- Advance to Monday only after choice made

**Code Change:**
```javascript
// In tickGameTime(), before day advance
if (GameState.currentHour >= 18 && GameState.currentDay === 5) {
    // Friday evening - show weekend modal
    pauseTimer();
    showWeekendChoiceModal();
    return; // Don't advance day yet
}
```

---

### 4. Phase Assignment Undefined Behavior (projects.js)
**Issue:** Phases can be "active" with 0 team members, causing stuck projects  
**Location:** `projects.js` → `updatePhaseProgress()`, `getPhaseStatus()`  
**Fix:**
- Validate `phase.teamAssigned` exists and has members
- If phase is active but no team, set status to "ready" instead
- Show warning in UI when active phase has no team

**Code Change:**
```javascript
function getPhaseStatus(project, phaseName) {
    const phase = project.phases[phaseName];
    if (!phase) return 'waiting';
    
    if (phase.progress >= 1.0) return 'complete';
    
    // Check if team is assigned
    const hasTeam = phase.teamAssigned && phase.teamAssigned.length > 0;
    
    if (phase.status === 'active' && !hasTeam) {
        // Active but no team - revert to ready
        phase.status = 'ready';
    }
    
    return phase.status;
}
```

---

### 5. Satisfaction Score Calculation Error (projects.js)
**Issue:** Satisfaction can exceed 100% due to unclamped calculations  
**Location:** `projects.js` → `calculateSatisfactionScores()`  
**Fix:**
- Clamp each factor to 0-1 range
- Clamp final satisfaction to 0-100

**Code Change:**
```javascript
function calculateSatisfactionScores(project) {
    // ... existing calculation
    
    // Clamp each factor
    scores.designQuality = Math.max(0, Math.min(1, scores.designQuality));
    scores.meetingDeadlines = Math.max(0, Math.min(1, scores.meetingDeadlines));
    scores.responsiveness = Math.max(0, Math.min(1, scores.responsiveness));
    scores.stayingInBudget = Math.max(0, Math.min(1, scores.stayingInBudget));
    
    // Calculate weighted satisfaction
    const satisfaction = /* ... weighted sum ... */;
    
    // Clamp final result
    return Math.max(0, Math.min(100, satisfaction));
}
```

---

### 6. Burnout Calculation Inconsistency (state.js, projects.js)
**Issue:** Comments say 5% per hour but code uses 10%, relief is 60% effective but undocumented  
**Location:** `state.js` → `calculateOvertimeBurnout()`, `projects.js` → `updatePlayerBurnout()`  
**Fix:**
- Standardize burnout rate to 10% per hour (update comments)
- Document relief effectiveness (60% = 0.6x multiplier)
- Add constants for burnout rates

**Code Change:**
```javascript
// In constants.js
BURNOUT_RATE_PER_OVERTIME_HOUR: 0.10, // 10% per hour
BURNOUT_RELIEF_EFFECTIVENESS: 0.60,   // 60% effective

// In calculateOvertimeBurnout()
function calculateOvertimeBurnout(memberId, overtimeHours) {
    const burnoutIncrease = overtimeHours * GameConstants.BURNOUT_RATE_PER_OVERTIME_HOUR * 100;
    adjustBurnout(memberId, burnoutIncrease, 'overtime');
}
```

---

### 7. Conversation Placeholder Replacement Bug (conversations.js)
**Issue:** Placeholders remain unreplaced if `conversationMemberMap` is missing  
**Location:** `conversations.js` → `replaceConsequencePlaceholders()`  
**Fix:**
- Validate `conversationMemberMap` exists before replacement
- Log warning if placeholder can't be replaced
- Fallback to first team member if mapping missing

**Code Change:**
```javascript
function replaceConsequencePlaceholders(consequences, conversationId) {
    const memberId = GameState.conversationMemberMap?.[conversationId];
    
    if (!memberId) {
        console.warn(`No member mapping for conversation ${conversationId}`);
        // Fallback to first non-player team member
        const fallbackMember = GameState.team.find(m => m.id !== 'player');
        if (fallbackMember) {
            memberId = fallbackMember.id;
        } else {
            console.error('No team members available for placeholder replacement');
            return consequences; // Return unchanged
        }
    }
    
    // ... rest of replacement logic
}
```

---

### 8. Phase Progress Calculation Error (projects.js)
**Issue:** Double-scaling with `tickMultiplier` applied to already-scaled `baseProgress`  
**Location:** `projects.js` → `updatePhaseProgress()`  
**Fix:**
- Clarify what `baseProgress` represents (hours per day? per tick?)
- Remove double-scaling or adjust formula
- Document expected progress rate

**Code Change:**
```javascript
function updatePhaseProgress(project, phaseName) {
    const HOURS_PER_TICK = 0.1;
    const HOURS_PER_DAY = 8;
    const tickMultiplier = HOURS_PER_TICK / HOURS_PER_DAY; // 0.0125
    
    // Base progress per tick (not per day)
    const baseProgressPerTick = phaseEfficiency * (HOURS_PER_TICK / totalPhaseHours);
    
    // Apply team efficiency (no additional tick multiplier needed)
    const progressDelta = baseProgressPerTick * totalEfficiency * statusMultiplier;
    
    phase.progress = Math.min(1.0, phase.progress + progressDelta);
}
```

---

## 🟡 HIGH PRIORITY (Fix Soon)

### 9. Conversation Queue Overflow (conversations.js)
**Issue:** Queue can grow unbounded, old conversations resurface  
**Location:** `conversations.js` → `checkForConversations()`  
**Fix:**
- Add max queue size (e.g., 10 conversations)
- Prioritize by urgency when queue is full
- Remove stale conversations older than 2 weeks

---

### 10. Project Data Structure Mismatch (projects.js)
**Issue:** Both `teamAssigned` (legacy) and `phases[].teamAssigned` (new) exist  
**Location:** `projects.js` → `hydrateProject()`, `assignTeamMember()`  
**Fix:**
- Migrate all legacy `teamAssigned` to phase-specific assignments
- Remove legacy field after migration
- Update all code to use phase assignments only

---

### 11. Burnout Threshold Events Not Triggering (state.js)
**Issue:** `checkBurnoutThresholds()` logs but doesn't trigger events  
**Location:** `state.js` → `checkBurnoutThresholds()`  
**Fix:**
- Queue conversation when crossing 60% threshold
- Queue warning conversation at 80% threshold
- Add key moment for burnout milestones

---

### 12. Morale Modifier Initialization Bug (projects.js)
**Issue:** `member.morale.modifiers.overworked` accessed but never initialized  
**Location:** `projects.js` → `updateTeamMorale()`  
**Fix:**
- Initialize morale modifiers in character templates
- Add default values in `hydrateProject()`
- Validate modifiers exist before accessing

---

### 13. Division by Zero Risks (projects.js)
**Issue:** `totalPhaseHours` could be 0, `projectsCompleted` used as divisor  
**Location:** Multiple locations  
**Fix:**
- Add checks before division operations
- Use default values (e.g., 1) if divisor is 0
- Log warnings when edge cases occur

---

### 14. Null/Undefined Checks Missing
**Issue:** Runtime errors possible from unchecked properties  
**Location:** Throughout codebase  
**Fix:**
- Add optional chaining (`?.`) for nested properties
- Validate data structures before use
- Add defensive programming checks

---

### 15. Character Data Inconsistency (characters.json)
**Issue:** "Pasha" appears twice, "Olya" has no unlock condition  
**Location:** `characters.json`  
**Fix:**
- Remove duplicate Pasha entry (keep one)
- Define unlock condition for Olya or set `startsInTeam: true`
- Validate all characters have required fields

---

## 🟢 MEDIUM PRIORITY (Fix When Possible)

### 16. Hardcoded Values Not Using Constants
**Issue:** Magic numbers throughout codebase  
**Fix:** Move all hardcoded values to `constants.js`

---

### 17. Inconsistent Error Handling
**Issue:** Some functions log, others fail silently  
**Fix:** Add try-catch blocks and consistent error logging

---

### 18. UI State Desynchronization (ui.js)
**Issue:** DOM updates may lag behind state changes  
**Fix:** Add debouncing/throttling for frequent updates

---

### 19. Conversation Response Time Bug (conversations.js)
**Issue:** Response time calculation may be incorrect  
**Fix:** Clarify units (hours vs ticks) and validate calculation

---

### 20. Freelancer Efficiency Bug (projects.js)
**Issue:** Freelancer contribution unpredictable  
**Fix:** Document freelancer mechanics and add cost tracking

---

### 21. Phase Completion Satisfaction Bug (projects.js)
**Issue:** Late projects don't get satisfaction boost  
**Fix:** Award satisfaction for phase completion regardless of timeline

---

### 22. Project Template Complexity Mismatch (projects.json)
**Issue:** Templates define complexity but code recalculates  
**Fix:** Use template values or remove from templates

---

### 23. Infinite Loop Risk (conversations.js)
**Issue:** `checkForConversations()` called every tick, could spam logs  
**Fix:** Add rate limiting or debouncing

---

### 24. Weekend Modal Double Payroll Risk (game.js)
**Issue:** Salaries may be paid twice or missed  
**Fix:** Ensure payroll runs exactly once per week

---

### 25. Player Hours Tracking Confusion (timer.js)
**Issue:** Unclear distinction between available vs worked hours  
**Fix:** Separate tracking for `hoursAvailable` and `hoursWorked`

---

### 26. Burnout System Documentation (GAME_STATE.md)
**Issue:** Comments don't match code  
**Fix:** Update all documentation to match actual implementation

---

### 27. Phase System Documentation (GAME_STATE.md)
**Issue:** Phase mechanics not clearly explained  
**Fix:** Add comprehensive phase system documentation

---

## Implementation Strategy

### Phase 1: Critical Fixes (Week 1)
- Fix bugs #1-8 (hour deduction, morale, weekend modal, phases, satisfaction, burnout, placeholders, progress)
- Test thoroughly after each fix
- Update documentation

### Phase 2: High Priority (Week 2)
- Fix bugs #9-15 (queue, data structure, thresholds, modifiers, division, null checks, character data)
- Add comprehensive error handling
- Validate all data structures

### Phase 3: Medium Priority (Week 3)
- Fix bugs #16-27 (constants, error handling, UI, documentation)
- Refactor hardcoded values
- Update all documentation

### Phase 4: Testing & Validation (Week 4)
- Full playthrough testing
- Edge case testing
- Performance testing
- Documentation review

---

## Testing Checklist

After each fix:
- [ ] Manual playthrough to affected area
- [ ] Check console for errors
- [ ] Verify state persistence (save/load)
- [ ] Test edge cases (0 hours, 0 morale, etc.)
- [ ] Verify UI updates correctly
- [ ] Check performance (no lag)

---

## Notes

- All fixes should maintain backward compatibility with saved games
- Add migration logic for data structure changes
- Document all breaking changes
- Update GAME_STATE.md after each fix
- Consider adding automated tests for critical paths

---

**Priority Legend:**
- 🔴 Critical: Game-breaking, fix immediately
- 🟡 High: Significant impact, fix soon
- 🟢 Medium: Quality of life, fix when possible
