# Conflict Analysis: Priority Implementation Plan
## Potential Conflicts with Existing Systems

This document identifies conflicts between the planned features and existing game systems, along with suggested solutions.

---

## 1. Difficulty Modes - Conflicts & Solutions

### 🔴 Conflict 1.1: Hardcoded Default Values in `resetToDefaultState()`
**Location:** `state.js:80-114`

**Issue:** 
- `resetToDefaultState()` hardcodes starting values:
  - `money: 8000` (line 84)
  - `teamMorale: 75` (line 85)
  - `highestMorale: 75` and `lowestMorale: 75` (lines 103-104)
- These values don't account for difficulty multipliers

**Solution:**
- Add `difficulty` field to `GameState` (default: 'realistic')
- Create `getDifficultyMultipliers(difficulty)` function in `constants.js`
- Modify `resetToDefaultState()` to:
  ```javascript
  const difficulty = GameState.difficulty || 'realistic';
  const multipliers = getDifficultyMultipliers(difficulty);
  GameState.money = Math.round(8000 * multipliers.startingMoney);
  GameState.teamMorale = Math.round(75 * multipliers.startingMorale);
  ```
- Load difficulty from localStorage or default to 'realistic'

---

### 🔴 Conflict 1.2: Saved State Backward Compatibility
**Location:** `game.js:16-50`

**Issue:**
- Existing saved games won't have `difficulty` field
- Loading old saves will default to 'realistic' (which is correct)
- But if player changes difficulty mid-game, old saves might break

**Solution:**
- Add migration logic in `initGame()`:
  ```javascript
  if (!window.GameState.difficulty) {
      window.GameState.difficulty = 'realistic'; // Default for old saves
      window.saveState(); // Save the new field
  }
  ```
- **Prevent difficulty change mid-game**: Require restart to change difficulty
- Add warning modal: "Changing difficulty requires restarting the game"

---

### 🟡 Conflict 1.3: Project Payment Calculation Doesn't Account for Difficulty
**Location:** `projects.js:1223-1226`

**Issue:**
- `completeProject()` calculates payment as: `budget * satisfactionMultiplier`
- No difficulty multiplier applied

**Solution:**
- Modify payment calculation:
  ```javascript
  const difficulty = window.GameState.difficulty || 'realistic';
  const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
  const payment = Math.round(budget * satisfactionMultiplier * multipliers.payment);
  ```

---

### 🟡 Conflict 1.4: Monthly Salary Calculation Doesn't Account for Difficulty
**Location:** `game.js:469-508`

**Issue:**
- `processMonthlySalaries()` uses fixed constants:
  - `MONTHLY_SALARY_PER_MEMBER: 2000`
  - `MONTHLY_OVERHEAD: 1200`
- No difficulty multiplier applied

**Solution:**
- Apply difficulty cost multiplier:
  ```javascript
  const difficulty = window.GameState.difficulty || 'realistic';
  const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
  const monthlySalary = teamSize * MONTHLY_SALARY_PER_MEMBER * multipliers.cost;
  const monthlyOverhead = MONTHLY_OVERHEAD * multipliers.cost;
  ```

---

### 🟡 Conflict 1.5: Burnout/Morale Decay Functions Need Difficulty Awareness
**Location:** `projects.js:70-231` (updatePlayerBurnout, updateTeamMorale)

**Issue:**
- Burnout and morale decay rates are hardcoded
- Difficulty multipliers need to be applied

**Solution:**
- Pass difficulty multiplier to decay functions:
  ```javascript
  const difficulty = window.GameState.difficulty || 'realistic';
  const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
  const burnoutRate = baseBurnoutRate * multipliers.burnout;
  const moraleDecay = baseMoraleDecay * multipliers.moraleDecay;
  ```

---

### 🟢 Conflict 1.6: Tutorial System May Need Difficulty-Aware Tips
**Location:** `tutorial.js`

**Issue:**
- Tutorial tips might reference specific values that change with difficulty
- Low priority - tips are general enough

**Solution:**
- Keep tutorial tips generic (don't mention specific dollar amounts)
- Or add difficulty-aware tips: "Starting with $X (varies by difficulty)"

---

## 2. Visual Countdown Timer - Conflicts & Solutions

### 🔴 Conflict 2.1: Timer Update Frequency vs Real-Time Game Timer
**Location:** `timer.js:28-35` (ticks every 100ms), `ui.js:718` (conversation display)

**Issue:**
- Real-time timer ticks every 0.1 seconds (100ms)
- Countdown timer needs to update more frequently for smooth UI (every 1-2 seconds)
- Two different update cycles could conflict

**Solution:**
- Create separate UI update interval for countdown timer:
  ```javascript
  let countdownTimer = null;
  function updateCountdownTimer() {
      if (window.currentConversation && window.currentConversationStartTime) {
          // Calculate and update countdown display
          // Update every 1-2 seconds (not every 100ms)
      }
  }
  // Start when conversation displays, stop when resolved
  ```
- Use `setInterval(updateCountdownTimer, 1000)` for 1-second updates
- Clear interval when conversation resolves

---

### 🔴 Conflict 2.2: Conversation Start Time Cleared on Resolution
**Location:** `conversations.js:32-35`

**Issue:**
- `currentConversationStartTime` is cleared when conversation resolves
- If conversation is deferred, start time is lost
- Countdown timer won't work for deferred conversations

**Solution:**
- Store start time in conversation metadata or deferred conversation entry:
  ```javascript
  function deferConversation(conversationId) {
      window.GameState.deferredConversations[conversationId] = {
          week: window.GameState.currentWeek,
          day: window.GameState.currentDay,
          startTime: window.currentConversationStartTime || Date.now() // Store start time
      };
  }
  ```
- When restoring deferred conversation, restore start time:
  ```javascript
  if (deferredEntry.startTime) {
      window.currentConversationStartTime = deferredEntry.startTime;
  }
  ```

---

### 🟡 Conflict 2.3: Real-Time Timer Pauses During Conversations
**Location:** `timer.js:38-46`

**Issue:**
- Timer pauses when conversation is active
- Countdown timer should continue counting even when game timer is paused
- Need to track "real time" vs "game time" for countdown

**Solution:**
- Use real-world time (Date.now()) for countdown, not game time:
  ```javascript
  function calculateTimeRemaining(conversation) {
      const startTime = window.currentConversationStartTime || Date.now();
      const deadlineHours = conversation.responseDeadlineHours;
      const elapsedRealMs = Date.now() - startTime;
      const elapsedHours = elapsedRealMs / (1000 * 60 * 60); // Convert to hours
      const remaining = deadlineHours - elapsedHours;
      return remaining;
  }
  ```
- This way countdown works even when game timer is paused

---

### 🟡 Conflict 2.4: Existing Response Deadline Penalty Logic
**Location:** `conversations.js:20-28`

**Issue:**
- Penalty already applied when conversation resolves
- Uses `elapsedHours` which is calculated from game time
- Visual countdown uses real time - might mismatch

**Solution:**
- Align penalty calculation with countdown timer:
  - Use same time source (real time) for both
  - Or document that countdown is approximate (game time)
  - **Recommendation**: Use real time for countdown, keep game time for penalties (more forgiving)

---

## 3. Scope Creep Tracking - Conflicts & Solutions

### 🔴 Conflict 3.1: Adding `scopeCreepCount` to Project State
**Location:** `projects.js:318-352` (handleScopeCreepRequest)

**Issue:**
- Existing projects don't have `scopeCreepCount` field
- Old saved games will break or have undefined values

**Solution:**
- Initialize `scopeCreepCount` when loading projects:
  ```javascript
  // In hydrateProject() or when loading state
  if (project.scopeCreepCount === undefined) {
      project.scopeCreepCount = 0;
  }
  ```
- Or initialize in `handleScopeCreepRequest()`:
  ```javascript
  if (!project.scopeCreepCount) project.scopeCreepCount = 0;
  project.scopeCreepCount++;
  ```

---

### 🟡 Conflict 3.2: Existing `scopeCreepHandled` Stat vs Per-Project Tracking
**Location:** `projects.js:329`, `state.js:27`

**Issue:**
- `gameStats.scopeCreepHandled` tracks total across all projects
- New `scopeCreepCount` tracks per-project
- Both serve different purposes but need to stay in sync

**Solution:**
- Keep both:
  - `scopeCreepCount` per project (for "death by a thousand cuts" trigger)
  - `scopeCreepHandled` in stats (for scoring/end game)
- Increment both when scope creep occurs:
  ```javascript
  project.scopeCreepCount = (project.scopeCreepCount || 0) + 1;
  window.GameState.gameStats.scopeCreepHandled++;
  ```

---

### 🟡 Conflict 3.3: Project Risk Indicator Integration
**Location:** `projects.js:237-260` (updateProjectRisk)

**Issue:**
- Risk indicator already tracks: satisfaction, timeline, budget
- Need to add scope creep risk without breaking existing logic

**Solution:**
- Add scope creep to risk calculation:
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

---

### 🟡 Conflict 3.4: "Death by a Thousand Cuts" Trigger Logic
**Location:** `conversations.js` (conditional conversation checking)

**Issue:**
- Need to check if project has 3+ scope increases
- Must integrate with existing conditional conversation system
- Should only trigger once per project

**Solution:**
- Add conditional check in `checkConditionalConversations()`:
  ```javascript
  // Check for "death by a thousand cuts"
  window.GameState.projects.forEach(project => {
      if (project.scopeCreepCount >= 3 && 
          !project.deathByThousandCutsTriggered &&
          project.status !== 'complete') {
          queueConversation('death_by_thousand_cuts_' + project.id);
          project.deathByThousandCutsTriggered = true;
      }
  });
  ```
- Add `deathByThousandCutsTriggered` flag to prevent repeat triggers

---

## 4. Team-Specific Conversations - Conflicts & Solutions

### 🔴 Conflict 4.1: Hardcoded Conversation IDs in `triggerTeamEvent()`
**Location:** `conversations.js:642-667`

**Issue:**
- `eventMap` has hardcoded conversation IDs:
  - `perfectionist_polish: 'tanue_extension_request'` (hardcoded to Tanue)
  - `pragmatic_scope: 'pasha_scope_suggestion'` (hardcoded to Pasha)
  - `eager_help: 'sasha_needs_help'` (hardcoded to Sasha)
- New team members won't have conversations
- Generic conversations needed

**Solution:**
- Make conversation IDs dynamic:
  ```javascript
  const eventMap = {
      low_morale: `team_low_morale_${member.id}`,
      high_morale: `team_high_morale_${member.id}`,
      perfectionist_polish: `team_extension_request_${member.id}`, // Dynamic
      pragmatic_scope: `team_scope_suggestion_${member.id}`, // Dynamic
      eager_help: `team_needs_help_${member.id}`, // Dynamic
      eager_conflict: 'team_conflict', // Generic
      eager_brilliant: `team_brilliant_idea_${member.id}` // Dynamic
  };
  ```
- Create generic conversation templates that use `{Worker}` placeholder
- Replace placeholders when displaying conversation

---

### 🔴 Conflict 4.2: Hardcoded Team Member IDs in `checkTeamEvents()`
**Location:** `conversations.js:691-695`

**Issue:**
- Conflict check hardcodes `tanue_designer` and `sasha_junior`:
  ```javascript
  const tanue = window.getTeamMemberById('tanue_designer');
  const sasha = window.getTeamMemberById('sasha_junior');
  ```
- Won't work with randomly generated teams
- Won't work with different team compositions

**Solution:**
- Make conflict check dynamic:
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

---

### 🟡 Conflict 4.3: Personality Type Matching
**Location:** `conversations.js:674-688`

**Issue:**
- Event triggers check for specific personality types:
  - `perfectionist`, `pragmatic`, `eager`
- Need to verify all team members have correct personality types
- Random team generation might create mismatches

**Solution:**
- Verify personality types in `characters.json` match expected types
- Add validation when loading team members:
  ```javascript
  if (!member.personality || !member.personality.type) {
      console.warn(`Team member ${member.id} missing personality type`);
      member.personality = { type: 'standard' }; // Default
  }
  ```
- Document required personality types in plan

---

### 🟡 Conflict 4.4: Event Frequency May Conflict with Existing Triggers
**Location:** `conversations.js:669-696`

**Issue:**
- `checkTeamEvents()` has random chance triggers (0.03-0.08)
- Called every game tick (0.1 hours)
- Might trigger too frequently or conflict with other conversation triggers

**Solution:**
- Add cooldown per team member:
  ```javascript
  if (!member._lastTeamEventTime) member._lastTeamEventTime = 0;
  const hoursSinceLastEvent = (window.GameState.currentHour - member._lastTeamEventTime);
  if (hoursSinceLastEvent < 24) return; // 24-hour cooldown
  ```
- Or reduce frequency: `Math.random() < 0.01` (1% chance per check)
- Document expected frequency in plan

---

## 5. Balance Testing - Conflicts & Solutions

### 🟡 Conflict 5.1: Balance Adjustments vs Difficulty Modes
**Location:** All balance-related code

**Issue:**
- If balance adjustments are made, they might conflict with difficulty multipliers
- Need to test balance for each difficulty mode separately
- Adjustments might make one difficulty too easy/hard

**Solution:**
- **Test each difficulty mode independently**
- Document balance values for each difficulty
- If adjustments needed, apply them to base values, not difficulty multipliers
- Create separate balance test plans for each difficulty

---

### 🟡 Conflict 5.2: Balance Testing Requires Full Playthroughs
**Location:** Testing process

**Issue:**
- Balance testing requires multiple 12-week playthroughs
- Time-consuming
- May need automated testing or save states at key points

**Solution:**
- Create test save states at Week 1, 4, 8, 12
- Use developer console commands to fast-forward time
- Document test scenarios and expected outcomes
- Consider adding "test mode" that speeds up time

---

## 6. Help Documentation - Conflicts & Solutions

### 🟢 Conflict 6.1: New Features Need Documentation
**Location:** `index.html:160-220` (help modal)

**Issue:**
- New features (difficulty modes, scope creep types, etc.) need to be documented
- Help content is static HTML - needs manual updates

**Solution:**
- Update help modal content after each feature implementation
- Add sections for:
  - Difficulty modes explanation
  - Scope creep types and strategies
  - Team personality system
  - Response time mechanics
- Keep help content in separate file or function for easier maintenance

---

## 7. Cross-Feature Conflicts

### 🔴 Conflict 7.1: Difficulty Modes + Balance Testing
**Issue:**
- Balance testing might reveal issues that require difficulty mode adjustments
- Circular dependency: need difficulty modes to test balance, need balance to tune difficulty

**Solution:**
- **Implement difficulty modes first** (Phase 1)
- **Then do balance testing** with all difficulty modes
- Adjust difficulty multipliers based on test results
- Iterate if needed

---

### 🟡 Conflict 7.2: Scope Creep Tracking + Team Conversations
**Issue:**
- Team conversations might trigger scope creep
- Need to ensure scope creep count increments correctly
- Team stress from scope creep might trigger team conversations

**Solution:**
- Ensure `handleScopeCreepRequest()` is called from team conversation consequences
- Add team stress tracking to scope creep handling
- Document interaction between systems

---

### 🟡 Conflict 7.3: Countdown Timer + Deferred Conversations
**Issue:**
- Deferred conversations need to preserve countdown timer state
- Timer should continue counting even when deferred

**Solution:**
- Store start time in deferred conversation entry (see Conflict 2.2)
- Restore timer when conversation is restored
- Display remaining time when conversation is shown again

---

## Implementation Order Recommendations

Based on conflicts, recommended order:

1. **Difficulty Modes** (foundation, affects everything)
2. **Scope Creep Tracking** (adds state, needs to be in place early)
3. **Team Conversations** (depends on personality system, but independent)
4. **Countdown Timer** (UI enhancement, less critical)
5. **Balance Testing** (requires all systems in place)
6. **Help Documentation** (final polish)

---

## Migration Strategy

For backward compatibility:

1. **Version the save state:**
   ```javascript
   GameState.saveVersion = 2; // Increment when adding new fields
   ```

2. **Migration function:**
   ```javascript
   function migrateSaveState(parsedState) {
       if (!parsedState.saveVersion || parsedState.saveVersion < 2) {
           // Add new fields with defaults
           if (!parsedState.difficulty) parsedState.difficulty = 'realistic';
           if (!parsedState.projects) parsedState.projects = [];
           parsedState.projects.forEach(p => {
               if (p.scopeCreepCount === undefined) p.scopeCreepCount = 0;
           });
           parsedState.saveVersion = 2;
       }
       return parsedState;
   }
   ```

3. **Apply migration in `initGame()`:**
   ```javascript
   const migrated = migrateSaveState(parsed);
   Object.assign(window.GameState, migrated);
   ```

---

## Testing Checklist for Conflicts

After implementing each feature:
- [ ] Old save games load correctly
- [ ] New save games include all new fields
- [ ] No undefined/null errors in console
- [ ] All systems work together (not just individually)
- [ ] UI updates correctly with new data
- [ ] Performance not degraded




