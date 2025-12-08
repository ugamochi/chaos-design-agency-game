# Priority Implementation Plan
## MVP Completion & Polish

This document outlines the plan for implementing the 7 priority items identified from comparing MVP prompts to current implementation.

---

## 1. Difficulty Modes (Chill, Realistic, Nightmare)

### Status: Not Implemented
### Priority: High
### Estimated Time: 4-6 hours

### Implementation Steps:

#### 1.1 Add Difficulty Settings to Constants
- [ ] Add `DIFFICULTY_MODES` object to `constants.js`:
  - `CHILL`: Easier starting resources, slower burnout, more forgiving
  - `REALISTIC`: Current default settings
  - `NIGHTMARE`: Harder starting resources, faster burnout, stricter penalties

#### 1.2 Define Difficulty Parameters
- [ ] Starting money multipliers (Chill: +50%, Realistic: 100%, Nightmare: -30%)
- [ ] Starting morale multipliers (Chill: +20%, Realistic: 100%, Nightmare: -20%)
- [ ] Burnout rate multipliers (Chill: 0.7x, Realistic: 1x, Nightmare: 1.5x)
- [ ] Project payment multipliers (Chill: 1.2x, Realistic: 1x, Nightmare: 0.8x)
- [ ] Weekly cost multipliers (Chill: 0.8x, Realistic: 1x, Nightmare: 1.3x)
- [ ] Client satisfaction decay rates (Chill: 0.7x, Realistic: 1x, Nightmare: 1.3x)
- [ ] Team morale decay rates (Chill: 0.7x, Realistic: 1x, Nightmare: 1.3x)

#### 1.3 Add Difficulty Selection UI
- [ ] Create difficulty selection modal (shown on first game start)
- [ ] Add difficulty selector to settings menu
- [ ] Store selected difficulty in localStorage
- [ ] Display current difficulty in settings/header

#### 1.4 Apply Difficulty Modifiers
- [ ] Modify `resetToDefaultState()` to apply difficulty multipliers
- [ ] Update `processMonthlySalaries()` to use difficulty cost multiplier
- [ ] Update `updatePlayerBurnout()` to use difficulty burnout multiplier
- [ ] Update `updateTeamMorale()` to use difficulty morale decay multiplier
- [ ] Update project payment calculations to use difficulty payment multiplier
- [ ] Update client satisfaction calculations to use difficulty decay multiplier

#### 1.5 Testing
- [ ] Test Chill mode: Play 3 weeks, verify easier progression
- [ ] Test Realistic mode: Verify matches current behavior
- [ ] Test Nightmare mode: Play 3 weeks, verify increased difficulty
- [ ] Verify difficulty persists across game saves
- [ ] Test switching difficulty mid-game (if allowed) or require restart

---

## 2. Visual Countdown Timer for Urgent Emails

### Status: Partially Implemented (shows deadline but no countdown)
### Priority: Medium
### Estimated Time: 2-3 hours

### Implementation Steps:

#### 2.1 Track Conversation Start Time
- [ ] Verify `currentConversationStartTime` is set when conversation displays
- [ ] Store deadline hours in conversation metadata

#### 2.2 Create Timer Component
- [ ] Add timer calculation function:
  - Calculate elapsed hours since conversation start
  - Calculate remaining hours until deadline
  - Return formatted time string (e.g., "2h 15m remaining" or "OVERDUE: 1h 30m")
- [ ] Add visual urgency indicators:
  - Green: >75% time remaining
  - Yellow: 25-75% time remaining
  - Orange: <25% time remaining
  - Red: Overdue

#### 2.3 Update UI Display
- [ ] Modify conversation display to show live countdown timer
- [ ] Update timer every 30 seconds (or on each game tick)
- [ ] Add visual pulse animation when <25% time remaining
- [ ] Add warning animation when overdue

#### 2.4 Apply Late Response Penalties
- [ ] Verify `applyConsequences()` checks elapsed time vs deadline
- [ ] Test satisfaction penalty when response is late
- [ ] Add visual feedback when penalty is applied

#### 2.5 Testing
- [ ] Test timer with 4-hour deadline (short)
- [ ] Test timer with 24-hour deadline (long)
- [ ] Test overdue state and penalties
- [ ] Test timer updates correctly during gameplay
- [ ] Test timer persists if conversation is deferred

---

## 3. Complete All 5 Scope Creep Scenario Types

### Status: Partially Implemented (2-3 types found)
### Priority: High
### Estimated Time: 3-4 hours

### Implementation Steps:

#### 3.1 Audit Existing Scope Creep Conversations
- [ ] Review `conversations.json` for all scope creep conversations
- [ ] Categorize existing conversations by type:
  1. Tiny tweak (small, seemingly innocent request)
  2. Stakeholder surprise (new stakeholder adds requirements)
  3. Competitor comparison ("Competitor X has this feature")
  4. Pivot (major direction change mid-project)
  5. Death by a thousand cuts (multiple small requests)

#### 3.2 Create Missing Scenario Types
- [ ] **Tiny Tweak**: Create 1-2 conversations
  - Example: "Can we just add a small animation here?"
  - Low initial impact, but can compound
- [ ] **Stakeholder Surprise**: Create 1-2 conversations
  - Example: "The CEO saw the design and wants..."
  - Medium-high impact, timeline pressure
- [ ] **Competitor Comparison**: Create 1-2 conversations
  - Example: "We saw CompetitorX's site and they have..."
  - Medium impact, budget/timeline negotiation
- [ ] **Pivot**: Create 1-2 conversations
  - Example: "We're changing our entire brand direction"
  - High impact, major scope increase
- [ ] **Death by a Thousand Cuts**: Create 1-2 conversations
  - Example: "Just one more thing..." (after multiple requests)
  - Cumulative impact, team stress

#### 3.3 Ensure Proper Distribution
- [ ] Distribute across weeks 1-10
- [ ] Ensure variety in project types
- [ ] Vary urgency levels (low, medium, high, critical)
- [ ] Include different choice consequences for each type

#### 3.4 Add Scope Creep Tracking
- [ ] Add `scopeCreepCount` to project state
- [ ] Track cumulative scope increases
- [ ] Trigger "death by a thousand cuts" after 3+ scope increases
- [ ] Update project risk indicator for high scope creep

#### 3.5 Testing
- [ ] Test each scenario type triggers correctly
- [ ] Verify consequences apply properly
- [ ] Test cumulative scope creep effects
- [ ] Verify all 5 types appear during 12-week playthrough

---

## 4. Comprehensive Balance Testing

### Status: Needs Testing
### Priority: High
### Estimated Time: 6-8 hours (testing + adjustments)

### Implementation Steps:

#### 4.1 Create Balance Test Plan
- [ ] Document current balance values:
  - Starting money: $8,000
  - Starting morale: 75%
  - Weekly costs: $1,500 (payroll + overhead)
  - Monthly salaries: $2,000 per member
  - Project payment ranges
  - Burnout rates
  - Morale decay rates

#### 4.2 Test Starting Resources
- [ ] Play 3 games from start, track:
  - Money at end of Week 1, 4, 8, 12
  - Morale at end of Week 1, 4, 8, 12
  - Average project completion time
  - Average satisfaction scores
- [ ] Verify starting resources allow progression without immediate failure

#### 4.3 Test Project Payments
- [ ] Complete 5 projects at different satisfaction levels:
  - 90%+ satisfaction (perfect delivery)
  - 70-89% satisfaction (good delivery)
  - 50-69% satisfaction (acceptable delivery)
  - <50% satisfaction (poor delivery)
- [ ] Verify payment amounts are balanced:
  - Perfect deliveries should be rewarding
  - Poor deliveries should still cover costs
  - Payments should scale with project budget

#### 4.4 Test Weekly Costs
- [ ] Track costs over 12 weeks:
  - Monthly salaries (weeks 1, 5, 9)
  - Weekly overhead
  - Total weekly average
- [ ] Verify costs are sustainable with 2-3 active projects
- [ ] Test edge case: 1 project, 4 team members (should be tight)

#### 4.5 Test Difficulty Curve
- [ ] Play full 12-week game, track:
  - Week-by-week money changes
  - Week-by-week morale changes
  - Conversation frequency
  - Crisis frequency
- [ ] Verify difficulty increases gradually (not sudden spikes)
- [ ] Verify average player reaches Week 8+
- [ ] Verify expert player can complete victory paths

#### 4.6 Test Victory Paths
- [ ] **Rockstar Path**: 5+ projects, $25k+, 75% avg satisfaction, 70% morale
  - Play 2 games attempting this path
  - Verify it's challenging but achievable
- [ ] **Professional Path**: 3+ projects, $10k+, 60% satisfaction, 50% morale
  - Play 2 games attempting this path
  - Verify it's the "normal" completion
- [ ] **Survivor Path**: 2+ projects, $2k+
  - Play 2 games attempting this path
  - Verify it's achievable even with struggles

#### 4.7 Balance Adjustments
- [ ] Document all balance issues found
- [ ] Create adjustment plan:
  - Increase/decrease starting resources
  - Adjust payment multipliers
  - Adjust cost multipliers
  - Adjust decay rates
- [ ] Implement adjustments
- [ ] Re-test affected systems

#### 4.8 Create Balance Documentation
- [ ] Document final balance values
- [ ] Document testing methodology
- [ ] Document any known balance issues
- [ ] Create balance tuning guide for future adjustments

---

## 5. Complete Team-Specific Conversation Scenarios

### Status: Partially Implemented (some exist, need verification)
### Priority: Medium
### Estimated Time: 2-3 hours

### Implementation Steps:

#### 5.1 Audit Existing Team Conversations
- [ ] Review `conversations.json` for team-specific conversations
- [ ] Verify conversations exist for:
  - Mike (perfectionist) requests extension
  - Sarah (pragmatic) suggests technical compromise
  - Alex (junior) needs help
  - Mike and Alex disagree on approach
  - Team member considering job offer (Pasha exists, verify others)

#### 5.2 Create Missing Conversations
- [ ] **{Worker} requests extension**:
  - Trigger: {Worker} on project for 5+ days, perfectionist personality
  - Choices: Allow extension (quality boost, timeline delay), Push deadline (morale hit, faster delivery)
- [ ] **{Worker} suggests compromise**:
  - Trigger: {Worker} on project with tight deadline, pragmatic personality
  - Choices: Accept compromise (faster delivery, quality hit), Maintain quality (slower, better work)
- [ ] **{Worker} needs help**:
  - Trigger: {Worker} on project, eager personality, low skill level
  - Choices: Help personally (time cost, learning opportunity), Assign mentor (team time cost), Let them struggle (mistakes, faster learning)
- [ ] **{Worker 1} and {Worker 2} conflict**:
  - Trigger: Both on same project, different approaches
  - Choices: Side with {Worker 1} (quality, morale hit to {Worker 2}), Side with {Worker 1} (speed, morale hit to {Worker 2}), Mediate (time cost, both happy)

#### 5.3 Verify Personality Event Triggers
- [ ] Test `checkTeamEvents()` triggers correctly
- [ ] Verify personality types are correctly identified
- [ ] Test event frequency (should be rare but noticeable)
- [ ] Verify conversations link to correct team members

#### 5.4 Add Team Member Dialogue
- [ ] Ensure each team member has unique dialogue in conversations
- [ ] Add personality-specific flavor text
- [ ] Verify dialogue matches personality traits

#### 5.5 Testing
- [ ] Test each team conversation triggers
- [ ] Verify consequences apply to correct team members
- [ ] Test personality-specific choices
- [ ] Verify all team members have at least 1 unique conversation

---



## 7. Comprehensive Help/Reference Documentation

### Status: Partially Implemented (basic help exists)
### Priority: Medium
### Estimated Time: 3-4 hours

### Implementation Steps:

#### 7.1 Audit Current Help Content
- [ ] Review existing help modal in `index.html`
- [ ] Identify missing information:
  - Detailed system explanations
  - Strategy tips
  - Advanced mechanics
  - Victory path strategies

#### 7.2 Expand Help Content
- [ ] **Resources Section** (expand):
  - Detailed money management
  - Burnout mechanics
  - Morale system deep dive
  - Reputation calculation
- [ ] **Projects Section** (expand):
  - Phase system explanation
  - Progress calculation
  - Deadline management
  - Scope creep handling strategies
- [ ] **Team Management** (expand):
  - Personality types explained
  - Assignment strategies
  - Morale management
  - Burnout prevention
- [ ] **Conversations** (expand):
  - Response time mechanics
  - Consequence system
  - Deferral strategy
  - Choice evaluation tips
- [ ] **Victory Paths** (expand):
  - Detailed requirements
  - Strategy for each path
  - Common pitfalls

#### 7.3 Add Advanced Mechanics Section
- [ ] Hours system explanation
- [ ] Overtime mechanics
- [ ] Illness system
- [ ] Project risk indicators
- [ ] Client personality types
- [ ] Scoring system

#### 7.4 Add Strategy Guide Section
- [ ] Early game strategy (Weeks 1-4)
- [ ] Mid game strategy (Weeks 5-8)
- [ ] Late game strategy (Weeks 9-12)
- [ ] Common mistakes to avoid
- [ ] Pro tips

#### 7.5 Improve Help UI
- [ ] Add table of contents
- [ ] Add search functionality (optional)
- [ ] Add expandable sections
- [ ] Improve visual hierarchy
- [ ] Add quick reference cards

#### 7.6 Add Tooltips
- [ ] Add contextual tooltips to UI elements
- [ ] Add "?" icons with explanations
- [ ] Add hover explanations for complex systems

#### 7.7 Testing
- [ ] Test help content is comprehensive
- [ ] Verify all systems are explained
- [ ] Test help is accessible during gameplay
- [ ] Get feedback from new players

---

## Implementation Order

### Phase 1: Core Functionality (High Priority)
1. **Difficulty Modes** - Foundation for balance
2. **Complete Scope Creep Scenarios** - Core gameplay feature
3. **Balance Testing** - Critical for playability

### Phase 2: Polish & UX (Medium Priority)
4. **Visual Countdown Timer** - Improves urgency feedback
5. **Team-Specific Conversations** - Enhances character system
6. **Comprehensive Help** - Improves onboarding

### Phase 3: Visual Polish (Low Priority)
7. **Enhanced Visual Feedback** - Nice-to-have polish

---

## Testing Checklist

After implementing each item:
- [ ] Feature works as designed
- [ ] No regressions in existing features
- [ ] UI is responsive and accessible
- [ ] Code is clean and well-commented
- [ ] Feature is tested across different game states
- [ ] Edge cases are handled

---

## Notes

- All implementations should maintain backward compatibility with existing saves
- Consider adding feature flags for gradual rollout
- Document any breaking changes
- Update README and game-state.md with new features
- Consider adding changelog for version tracking

