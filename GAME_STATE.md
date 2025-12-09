# Game State Documentation

Complete reference for all game state objects, properties, and their interactions in Agency Chaos Simulator.

---

## Core State Object: `GameState`

**Location:** `state.js`

The main game state container that persists across sessions via localStorage.

```javascript
GameState = {
    currentWeek: number,        // 1-12 (game ends at week 12)
    currentDay: number,          // 1-7 (resets to 1 each week)
    currentHour: number,         // 0-23 (hour of day, starts at 9 AM, resets to 9 on new week)
    money: number,              // Starting: 8000
    teamMorale: number,         // 0-100, calculated average of team members
    projects: Project[],        // Array of active/completed projects
    team: TeamMember[],         // Array of team members (including player)
    conversationQueue: string[], // Array of conversation IDs waiting to display
    conversationHistory: HistoryEntry[], // Completed conversations/events log
    resolvedConversations: string[], // Conversation IDs that have been handled
    deferredConversations: {},  // { conversationId: { week, day } } - conversations deferred to later
    shownConversationsToday: string[], // Conversation IDs shown today (prevents repeats except allowed ones)
    conversationMemberMap: {},  // { conversationId: memberId } - Maps dynamic conversation IDs to team members
    portfolio: {
        completedProjects: number,
        totalEarnings: number
    },
    keyMoments: KeyMoment[],    // Array of significant game events
    gameStats: {                 // Performance tracking for scoring
        projectsCompleted: number,
        projectsFailed: number,
        scopeCreepHandled: number,
        teamMemberQuits: number,
        deadlinesMissed: number,
        perfectDeliveries: number,
        totalSatisfactionPoints: number,
        highestMorale: number,
        lowestMorale: number
    },
    gamePhase: string,          // "tutorial" | "early" | "mid" | "late"
    gameOver: boolean,          // true when game has ended
    victoryPath: string | null  // "rockstar" | "professional" | "survivor" | "struggled" | "failed" | null
}
```

---

## Game Constants (`GameConstants`)

**Location:** `constants.js`

Centralized configuration constants used throughout the game. All code should reference these constants rather than hardcoded values.

### Key Constants

**Time & Hours:**
- `HOURS_PER_WEEK: 40` - Weekly hour capacity for team members
- `BASE_HOURS_PER_DAY: 8` - Daily hour capacity
- `HOURS_PER_TICK: 0.1` - Hours advanced per timer tick (real-time mode)
- `WORK_DAY_START: 9` - Work day start hour (9 AM)
- `WORK_DAY_END: 18` - Work day end hour (6 PM)

**Burnout Thresholds:**
- `BURNOUT_MAX: 100` - Maximum burnout level
- `BURNOUT_WARNING_THRESHOLD: 80` - Triggers warning key moment
- `BURNOUT_CHOICE_BLOCK_THRESHOLD: 60` - Blocks some conversation choices
- `BURNOUT_MODERATE_THRESHOLD: 40` - UI color change threshold
- `BURNOUT_HIGH_THRESHOLD: 50` - Affects team morale penalty
- `BURNOUT_POOR_DECISION_THRESHOLD: 90` - Higher chance of poor decisions

**Morale Thresholds:**
- `LOW_MORALE_THRESHOLD: 25` - Triggers low morale event
- `HIGH_MORALE_THRESHOLD: 85` - Triggers high morale event
- `QUIT_MORALE_THRESHOLD: 5` - Team member quits
- `BURNOUT_MORALE_THRESHOLD: 10` - Used in failure condition checks

**Economics (weekly payroll):**
- `HOURLY_RATES`: { Manager: €50, Designer: €25, Developer: €30, Default: €25 }
- `MIN_WEEKLY_PAY: €100` - Minimum per worker per week
- `PLAYER_WEEKLY_SALARY: €1000` (if funds available)
- `WEEKLY_OVERHEAD: €300`
- `BANKRUPTCY_THRESHOLD: -5000` - Game over threshold

**Project Management:**
- `DAYS_ON_ASSIGNMENT_OVERWORKED: 10` - Days before overwork penalty applies

**Victory Paths:** See `VICTORY_THRESHOLDS` object for detailed requirements

**Score Multipliers:** See `SCORE_MULTIPLIERS` object for scoring calculations

All constants have fallback defaults in code (e.g., `constants.HOURS_PER_WEEK || 40`) to ensure backward compatibility.

---

## Team Member Structure

**Location:** `characters.json` (templates), `GameState.team` (runtime instances)

### Template Structure (characters.json)
```javascript
{
    id: string,                  // Unique identifier (e.g., "mike_designer")
    name: string,               // Display name
    role: string,               // Job title (e.g., "Designer", "Developer")
    skill: number,               // 1-5 (affects work quality/speed)
    personality: {
        type: string,           // "perfectionist", "pragmatic", "eager"
        traits: string[],       // Array of trait identifiers
        quirks: string[]        // Character-specific behaviors
    },
    morale: {
        current: number,        // 0-100 (runtime, initialized from template)
        min: number,            // Usually 0
        max: number,            // Usually 100
        modifiers: {             // Morale change values for events
            overworked: number,
            praised: number,
            criticized: number
        }
    },
    dialogue: {                 // Context-specific dialogue options
        happy: string[],
        neutral: string[],
        stressed: string[],
        burned_out: string[]
    }
}
```

### Runtime Instance (GameState.team)
Team members in `GameState.team` include all template properties plus:
```javascript
{
    // ... all template properties ...
    currentAssignment: string | null,  // LEGACY: Project ID if assigned (deprecated, use phase assignments)
    assignedProjects: string[],        // LEGACY: Array of project IDs (deprecated, use phase assignments)
    daysOnAssignment: number,          // Days spent on current project (legacy tracking)
    lowMoraleTriggered: boolean,       // Flag to prevent duplicate low morale events
    highMoraleTriggered: boolean,      // Flag to prevent duplicate high morale events
    hours: number,                     // Available work hours (0-40 weekly, can go negative for player overtime)
    hoursWorkedThisWeek: number,       // Hours worked this week (for tracking)
    overtimeWarningShown: boolean,     // Player-only: Flag to prevent repeated overtime warnings
    outOfHoursWarningShown: boolean,   // Worker-only: Flag to prevent repeated exhaustion warnings
    isIll: boolean,                    // True if team member is sick (loses 8 hours)
    hasQuit: boolean,                  // True if team member has quit
    burnout: number                    // Player-only: burnout level (0-100)
}
```

**Note:** Team members are now assigned to **specific project phases**, not projects directly. See Phase-Specific Assignments section below.

### Special Team Member: Player
- `id: "player"` (hardcoded)
- Can be assigned to multiple projects simultaneously (with reduced efficiency: 0.6x per project)
- Not included in team morale calculations
- Has `burnout` property (0-100) that affects decision-making
- High burnout (≥60%) can block certain conversation choices
- Burnout ≥80% triggers warning key moment
- Can call in sick to reduce burnout (via `callInSick()` function)

---

## Project Structure

**Location:** `projects.json` (templates), `GameState.projects` (runtime instances)

### Template Structure (projects.json)
```javascript
{
    id: string,                  // Unique identifier (e.g., "techcorp_web")
    name: string,                // Project name
    client: string,              // Client name
    type: string,                // Project type (e.g., "website", "branding")
    budget: number,              // Total project budget
    totalWeeks: number,          // Original timeline in weeks
    complexity: number,          // 1-5 (affects progress speed)
    description: string,         // Project description
    requiredSkills: string[],     // Array of skill types needed
    baseClientSatisfaction: number, // 0-1 (starting satisfaction level)
    clientProfile: ClientProfile  // See Client Profile section below
}
```

### Runtime Instance (GameState.projects)
Projects in `GameState.projects` include all template properties plus:
```javascript
{
    // ... all template properties ...
    progress: number,            // 0-1 (0 = 0%, 1 = 100%) - Overall project progress
    status: string,              // "ok" | "warning" | "crisis" | "complete"
    teamAssigned: string[],      // LEGACY: Array of team member IDs (deprecated, use phase.teamAssigned)
    satisfaction: number,        // 0-100 (client satisfaction percentage)
    originalScope: number,        // Initial complexity value
    currentScope: number,         // Current scope (can increase with scope creep)
    scopeCreepLevel: number,     // currentScope - originalScope
    scopeCreepCount: number,      // Number of scope creep requests handled (for risk calculation)
    scopeHistory: any[],          // Array tracking scope changes
    lastResponseHours: number,   // Hours since last client response
    budgetStatus: number,         // 0-1 (1 = on budget, <1 = over budget)
    satisfactionTrend: number[], // Historical satisfaction values
    risk: {                       // Calculated risk indicators
        scope: string,            // "low" | "medium" | "high"
        scopeCreep: string,       // "none" | "low" | "medium" | "high" (based on scopeCreepCount)
        satisfaction: string,     // "low" | "medium" | "high"
        timeline: string,         // "low" | "medium" | "high"
        scopeLabel: string,       // Human-readable scope status
        timelineLabel: string,    // Human-readable timeline status
        satisfactionLabel: string // Human-readable satisfaction status
    },
    weeksRemaining: number,      // Calculated remaining weeks (can go negative if overdue)
    phases: {                     // Phase-specific structure (NEW)
        management: Phase,
        design: Phase,
        development: Phase,
        review: Phase
    }
}
```

### Phase Structure
Each phase in `project.phases` has the following structure:
```javascript
{
    progress: number,            // 0-1 (0 = 0%, 1 = 100%) - Phase-specific progress
    status: string,              // "waiting" | "ready" | "active" | "complete"
    teamAssigned: string[],      // Array of team member IDs assigned to THIS phase
    freelancerHired: boolean      // True if a freelancer was hired for this phase
}
```

**Phase Status Rules:**
- **"waiting"**: Phase hasn't started yet (previous phase not at 50%)
- **"ready"**: Previous phase reached 50%, phase can start
- **"active"**: Phase is currently in progress
- **"complete"**: Phase reached 100% progress

**Phase Activation:**
- Next phase becomes "ready" when previous phase reaches 50% progress
- Phases progress sequentially (no simultaneous phases)
- Workers must be explicitly assigned to phases via "Assign to Phases" modal

### Project Status Calculation
Status is determined by `getProjectStatus(projectId)`:
- **"complete"**: `progress >= 1.0`
- **"crisis"**: `weeksRemaining < 0` OR `satisfaction < 30`
- **"warning"**: `weeksRemaining < 2` AND `progress < 0.7`
- **"ok"**: All other active projects

---

## Client Profile Structure

**Location:** `projects.json` (per project), `DEFAULT_CLIENT_PROFILE` in `state.js`

```javascript
{
    name: string,                // Client contact name
    title: string,              // Client job title
    company: string,             // Company name
    personality: string,        // Personality type identifier
    traits: {
        decisionSpeed: string,   // "fast" | "medium" | "slow"
        budgetReality: string,  // "reasonable" | "unrealistic" | "flexible"
        scopeDiscipline: string, // "strong" | "medium" | "weak"
        communicationStyle: string, // "direct" | "passive_aggressive" | "friendly"
        respectForProcess: string   // "high" | "medium" | "low"
    },
    satisfactionFactors: {      // Weights for satisfaction calculation (must sum to ~1.0)
        designQuality: number,   // 0-1 weight
        meetingDeadlines: number, // 0-1 weight
        responsiveness: number,  // 0-1 weight
        stayingInBudget: number   // 0-1 weight
    }
}
```

### Satisfaction Calculation
Client satisfaction is calculated via `updateProjectSatisfaction(project)`:

1. **Design Quality**: `(avgSkill / 5) * (avgMorale / 100)` (capped at 1.0)
2. **Meeting Deadlines**: `0.5 + (progress - expectedProgress)` (capped 0-1)
   - `expectedProgress = 1 - (weeksRemaining / totalWeeks)`
3. **Responsiveness**: `4 / lastResponseHours` (capped 0-1, max 1.0 if <= 4 hours)
4. **Staying In Budget**: `budgetStatus` (0-1)

Final satisfaction = weighted sum of all four factors, normalized to 0-100.

---

## Conversation System

**Location:** `conversations.json` (templates), `conversations.js` (runtime logic)

### Conversation Template Structure
```javascript
{
    id: string,                  // Unique identifier
    week: number,                // Trigger week (0 = never auto-trigger)
    day: number,                 // Trigger day (0 = never auto-trigger)
    urgency: string,             // "low" | "medium" | "high" | "critical"
    from: string,                // Sender name
    subject: string,             // Conversation subject line
    body: string,                // HTML message content
    linkedProjectId: string,     // Optional: associated project ID
    responseDeadlineHours: number, // Optional: hours to respond before penalty
    choices: [
        {
            id: string,          // Unique choice identifier
            text: string,        // Choice button text
            flavorText: string,  // Feedback message after selection
            consequences: {      // See Consequences section below
                money: number,
                teamMorale: number | object | array,
                projectProgress: { projectId: string, delta: number },
                clientSatisfaction: { projectId: string, delta: number },
                scopeChange: object | array,
                spawnConversations: string[]
            }
        }
    ]
}
```

### Conversation Runtime State
```javascript
// Global variables in conversations.js
currentConversation: Conversation | null,  // Currently displayed conversation
selectedChoiceId: string | null,            // Selected choice ID (before submit)
currentConversationStartTime: number | null, // Timestamp when conversation opened
currentConversationMeta: {                  // Metadata for response timing
    linkedProjectId: string,
    responseDeadlineHours: number
}
```

### Conversation Queue System
- **Auto-triggered**: Conversations with matching `week` and `day` values
- **Queued**: Conversations added via `queueConversation(conversationId)`
- **Deferred**: Conversations postponed via "Remind me later" button
- **Resolved**: Conversation IDs added to `GameState.resolvedConversations` to prevent re-triggering
- **Shown Today**: Conversation IDs added to `GameState.shownConversationsToday` to prevent repeats within the same day

### Dynamic Conversation System
**Location:** `conversations.js` → `triggerTeamEvent()`, `replaceHardcodedNames()`

**Dynamic Conversation IDs:**
- Team events use dynamic IDs based on member ID: `team_extension_request_${member.id}`
- Fallback system: dynamic ID → generic template ID → legacy hardcoded ID
- Example: `team_extension_request_mike_designer` → `team_extension_request` → `team_extension_request_tanue`

**Name Replacement:**
- `GameState.conversationMemberMap` stores mapping of conversation ID to member ID
- `replaceHardcodedNames()` replaces placeholders and hardcoded names:
  - `{Worker}` → member name
  - `{WorkerRole}` → member role
  - Hardcoded names (e.g., "Tanue", "Pasha", "Sasha") → actual member name
  - Pattern matching for "from" field: `Tanue (Designer)` → `${member.name} (${member.role})`
- Uses regex escaping to handle special characters correctly
- Prevents double replacements with if-else logic

**Dynamic Team Conflict Checks:**
- `checkTeamEvents()` dynamically finds team members on same project
- Groups members by project using `member.assignedProjects` or `member.currentAssignment`
- Triggers `eager_conflict` if 2+ members on same project (3% chance per check)

### Message Repeat Prevention
**Location:** `conversations.js`

To prevent message spam, conversations are tracked per day:
- When a conversation is displayed, its ID is added to `shownConversationsToday`
- `getCurrentConversations()` filters out conversations already shown today
- **Exception**: Certain conversations can repeat (lunch breaks, going home, exercise reminders):
  - `lunch_break_reminder`
  - `bedtime_reminder`
  - `exercise_reminder`
- `shownConversationsToday` is reset to `[]` when the day advances (both in `timer.js` and `game.js`)
- This ensures each unique conversation appears only once per day, except for routine break/home actions

---

## Consequences System

**Location:** `conversations.js` → `applyConsequences()`

Consequences are applied when a conversation choice is submitted. All consequence types:

### Money
```javascript
consequences.money: number  // Direct addition/subtraction from GameState.money
```

### Team Morale
```javascript
// Single number: applies to all team members
consequences.teamMorale: number

// Object: target specific member(s)
consequences.teamMorale: {
    delta: number,              // Morale change amount
    memberId: string            // Single member ID
}
// OR
consequences.teamMorale: {
    delta: number,
    memberIds: string[]          // Multiple member IDs
}

// Array: multiple morale changes
consequences.teamMorale: [
    number,                      // Global change
    { delta: number, memberId: string },  // Specific member
    { delta: number, memberIds: string[] } // Multiple members
]
```

### Project Progress
```javascript
consequences.projectProgress: {
    projectId: string,           // Target project ID
    delta: number               // Progress change (0 to 1, typically 0.01-0.2)
}
```

**Important Notes:**
- Negative progress deltas are no longer used (removed for logical consistency)
- Progress changes are **not applied to completed projects** (`status === 'complete'`)
- Progress is clamped to 0-1 range

### Client Satisfaction
```javascript
consequences.clientSatisfaction: {
    projectId: string,          // Target project ID
    delta: number               // Satisfaction change (-100 to 100, typically -20 to +20)
}
```

### Scope Change (Scope Creep)
```javascript
// Single scope change
consequences.scopeChange: {
    projectId: string,
    delta: number,               // Scope/complexity change
    timelineWeeks: number,       // Optional: extend timeline
    budgetDelta: number,         // Optional: budget adjustment
    teamStress: number           // Optional: morale hit to assigned team
}

// Multiple scope changes
consequences.scopeChange: [
    { projectId: string, delta: number, ... },
    { projectId: string, delta: number, ... }
]
```

### Spawn Follow-up Conversations
```javascript
consequences.spawnConversations: string[]  // Array of conversation IDs to queue
```

### Player Burnout
```javascript
consequences.playerBurnout: number  // Direct change to player burnout (-100 to +100, clamped to 0-100)
```

### Player Hours
```javascript
consequences.playerHours: number  // Direct change to player available hours (-8 to +8, clamped to 0-8)
```

---

## History Entry Structure

**Location:** `GameState.conversationHistory`

```javascript
{
    title: string,               // Event title
    message: string,             // Event description
    type: string,                // "success" | "warning" | "info" | "error"
    timestamp: string             // Display timestamp (e.g., "Week 3, Day 5")
}
```

---

## Key Moment Structure

**Location:** `GameState.keyMoments`

Significant events tracked throughout the game for end-game timeline display.

```javascript
{
    week: number,               // Week when event occurred
    day: number,                // Day when event occurred
    title: string,              // Event title
    description: string,        // Event description
    type: string                // "success" | "crisis" | "failure" | "milestone" | "victory"
}
```

**Key Moments Auto-Tracked:**
- Game phase milestones (Weeks 3, 5, 10)
- Perfect project deliveries (90%+ satisfaction, on time)
- Project completions with high satisfaction (80%+)
- Project crises and failures
- Team member quits
- Low cash warnings (< $1,000)
- Game completion

**Function:** `recordKeyMoment(title, description, type)`

---

## Global Data Arrays

**Location:** `state.js` (initialized from JSON files)

```javascript
AllConversations: Conversation[]     // All conversation templates
AllTeamMembers: TeamMember[]           // All team member templates
AllProjectTemplates: ProjectTemplate[] // All project templates
```

---

## State Mutations & Interactions

### Daily Advance Flow (`advanceDay()`)
1. Check if game is over or conversation active (early return if true)
2. If real-time timer available: manually advance by 8 hours via `advanceTimeByHours()` and return
3. Otherwise (fallback mode): Increment `currentDay` (resets to 1 at day 8, increments `currentWeek`)
4. Advance clock (`advanceClock()`) - advances time by 2-4 hours randomly
5. If new week: reset `currentHour` to 9 AM, update game phase, trigger scripted events
6. Check for game end (`currentWeek > 12`) → triggers victory
7. **Reset shown conversations** - `shownConversationsToday = []` (allows conversations to appear again next day)
8. Purge expired deferred conversations
9. **Reset hours** - If new week: `resetWeeklyHours()` (sets to `HOURS_PER_WEEK`), else `resetDailyHours()` (resets daily flags)
10. **Check for illness** (`checkForIllness()`) - Random chance team members get sick, losing 8 hours
11. Update projects (`updateProjects()`) - Team members spend hours on assigned projects
12. **Update player burnout** (`updatePlayerBurnout()`) - Calculates daily burnout changes based on workload
13. Update team morale (`updateTeamMorale()`)
14. Display updated state
15. Check for team events (`checkTeamEvents()`)
16. Check failure conditions (`checkFailureConditions()`)
17. Check for conditional conversations (`checkConditionalConversations()`) - Respects shown today filter
18. Check for conversations (`checkForConversations()`) - Marks conversations as shown
18. Check for contextual tips (`checkForContextualTips()`)
19. If day 7: check team pulse, show week summary, generate weekly client feedback
20. **Weekly Payroll:** Process weekly salaries (`processWeeklySalaries`) at week transition (Day 7 → 1)
21. Check project deadlines (`checkProjectDeadlines()`)
22. Update game stats (`updateGameStats()`)
23. Save to localStorage

### Team Morale Updates (`updateTeamMorale()`)
- **Location:** `projects.js`
- **Implementation:** Uses `for...of` loop to iterate through team members (not `forEach`)
- Applied daily to each team member (except player)
- **Overwork penalty**: `-5` morale if `daysOnAssignment > DAYS_ON_ASSIGNMENT_OVERWORKED` (default 10)
- **Player burnout penalty**: If player burnout > `BURNOUT_HIGH_THRESHOLD` (default 50), team morale decreases by `(burnout - threshold) / 10`
- **Unassigned penalty**: `-2` morale if member has no active phase assignment and is not ill
- **Gradual decay**: `-0.5 * tickMultiplier` applied per tick to all members with morale
- **Low morale trigger**: `< 25%` triggers `low_morale` event (once per threshold, resets at ≥30%)
- **High morale trigger**: `> 85%` triggers `high_morale` event (once per threshold, resets at ≤80%)
- Recalculates `GameState.teamMorale` as average of all team members
- **Special members**: Members with `characteristics.doesNotLoseMorale` skip morale changes but still track days on assignment

### Project Progress Updates (`updateProjects()`)
**Location:** `projects.js` → `updatePhaseProgress()`

For each active project, progress is calculated **per phase**:

**Phase-Specific Progress:**
- Only phases with status "active" or "ready" can progress
- Phases progress sequentially (next phase starts at 50% of previous)
- Each phase tracks its own `progress` (0-1)

**Team Contribution:**
- Only members assigned to `phase.teamAssigned` contribute to that phase
- Members with `hours <= 0` contribute 0 efficiency (workers stop, player can continue)
- Sick members (`isIll = true`) are skipped
- Hours are split across all active phase assignments for each worker
  - Example: Worker on 2 active phases = 50% hours per phase
  - Example: Worker on 1 active phase = 100% hours to that phase

**Progress Calculation:**
- Base progress rates vary by phase type (management: 2.0, design: 1.5, development: 1.0, review: 1.8)
- Efficiency = `(skill / 5) * (morale / 100) * phaseEfficiency`
- Time fraction = `1 / totalActivePhaseAssignments` (splits hours across assignments)
- Status multipliers:
  - `crisis`: 0x (no progress)
  - `warning`: 0.5x
  - `ok`: 1.0x
- Player burnout penalty: If player burnout > 50%, progress reduced by `(burnout - 50) / 10`%
- Random variation: ±10%

**Phase Activation:**
- Next phase becomes "ready" when previous phase reaches 50% progress
- Phases must be explicitly assigned via "Assign to Phases" modal
- No auto-assignment - workers sit idle if unassigned

**Project Completion:**
- Overall project `progress` calculated from phase progress
- Decrement `weeksRemaining` by `1/7` per day
- If `progress >= 1.0`: trigger `completeProject()`
- **Note:** Progress cannot go negative. Completed projects (`status === 'complete'`) are protected from progress changes.

### Project Completion (`completeProject(projectId)`)
1. Set project status to `"complete"`
2. Calculate payment: `budget * (satisfaction / 100)`
3. Add payment to `GameState.money`
4. Update portfolio counters
5. Unassign all team members from all phases (clear `phase.teamAssigned` arrays)
6. Reset `daysOnAssignment` to 0
7. Boost team member morale by `+5` (for members who worked on the project)
8. Add completion event to `conversationHistory`

### Scope Creep Handling (`handleScopeCreepRequest(change)`)
- Updates `currentScope` and `scopeCreepLevel`
- Increments `scopeCreepCount` (used for risk calculation)
- Optionally extends `totalWeeks` and `weeksRemaining`
- Optionally adjusts `budget` and `GameState.money`
- Optionally applies morale penalty to assigned team (members assigned to any phase)
- Recalculates project satisfaction and risk
- Updates `risk.scopeCreep` based on `scopeCreepCount`:
  - `scopeCreepCount >= 3`: "high"
  - `scopeCreepCount >= 2`: "medium"
  - `scopeCreepCount >= 1`: "low"
  - `scopeCreepCount === 0`: "none"

### Clock System
- **Location:** `ui.js` (manual mode), `timer.js` (real-time mode)
- **Initialization:** `currentHour` starts at `WORK_DAY_START` (default 9 AM) each week
- **Manual Mode** (`advanceClock()`):
  - When day advances, clock moves forward by 2-4 hours randomly
  - Week reset: At start of new week, `currentHour` resets to 9 AM
- **Real-time Mode** (`timer.js`):
  - 1 game hour = 1 real second
  - Timer pauses when conversations appear, resumes when resolved
  - Automatically advances `currentHour` every second
  - When `currentHour >= WORK_DAY_END` (18 / 6 PM): resets to 9 AM, advances day
  - **Day rollover**: Resets `shownConversationsToday = []` when day advances
  - Week rollover: When `currentDay > 7`, resets to day 1, advances week
  - Calls `resetWeeklyHours()` on week start, `resetDailyHours()` on day start
  - Deducts `HOURS_PER_TICK` (0.1) hours from team members per tick
  - Updates projects, burnout, morale, and game state every tick
- **Display:** Shows time in 12-hour format (e.g., "9:00 AM", "2:00 PM", "9:00 PM")
- **Visual Feedback:** Clock icon animates when time advances, shows remaining work hours (9 AM - 6 PM)
- **Purpose:** Provides sense of time progression through the work week

### Hours System
- **Location:** `game.js` (reset functions), `timer.js` (deduction logic)
- **Weekly Reset** (`resetWeeklyHours()`): Called at start of each new week (day 1)
  - Sets all team members to `HOURS_PER_WEEK` (default 40) hours
  - Resets `hoursWorkedThisWeek` to 0
  - Resets `overtimeWarningShown` and `outOfHoursWarningShown` flags
  - Resets `_hoursDeductedToday` flag
- **Daily Reset** (`resetDailyHours()`): Called at start of each day (except day 1)
  - Resets `_hoursDeductedToday` flag (prevents double-deduction in real-time mode)
  - Does NOT reset hours - hours persist across days within a week
- **Work Week:** Team members start with `HOURS_PER_WEEK` (40) hours per week
- **Work Day:** 9 AM to 6 PM (9 hours total, but team members have 8 hours capacity per day)
- **Hours Deduction:** Only deducted from members assigned to active/ready phases (or player)
- **Real-time Mode:** Timer automatically deducts `HOURS_PER_TICK` (0.1) hours per tick (every 0.1 seconds)

### Hours Exhaustion System
**Location:** `timer.js` → `deductHoursFromTeam()`

Different mechanics for player vs. workers:

**Player (id === 'player'):**
- Can go into **negative hours** (overtime)
- When crossing from positive to negative hours:
  - `overtimeWarningShown` flag set to `true`
  - Morale penalty: `-2` (one-time per week)
  - Burnout increases with overtime work
- Hours reset to 40 at start of new week (overtime debt cleared)

**Workers (all other team members):**
- **Cannot go negative** - hours stop at 0
- When hitting 0 hours:
  - `outOfHoursWarningShown` flag set to `true`
  - Morale penalty: `-5` (one-time per week, only if before day 7)
  - Worker stops contributing to projects until next week
  - Worker sits idle (no hours deducted)
- Hours reset to 40 at start of new week

**Idle Workers:**
- Workers not assigned to any active/ready phase do not lose hours
- They sit idle and can be assigned to phases at any time

### Player Burnout System (`updatePlayerBurnout()`)
- **Location:** `projects.js`
- **Daily Update:** Called after projects update each day
- **Phase-Aware:** Counts player assignments from `phase.teamAssigned` (legacy `project.teamAssigned` is deprecated)
- **Burnout Increases (more urgent for 12-week game):**
  - Base stress: `+0.5` per tick
  - `+6` per project where player is assigned to any phase
  - `+2` if hours < 4, `+1` if hours < 6
  - `+9` per crisis project where player is assigned
  - `+2` if team morale < 50; `+0.5` if morale < 70
- **Burnout Decreases:**
  - Only via conversation consequences (`playerBurnout`), or calling in sick
  - Conversation burnout relief is reduced (40% less effective than stated value)
  - Call in sick: reduces up to 15 (was 25)
- **Thresholds:**
  - `≥80%`: Triggers "Art Director Burnout Warning" key moment
  - `≥60%`: Some conversation choices become unavailable
  - `≥90%`: Higher chance of making poor decisions in conversations
- **Overtime Burnout:** `calculateOvertimeBurnout()` now 10% per overtime hour (was 5%)

### Illness System (`checkForIllness()`)
- **Location:** `projects.js`
- **Daily Check:** Called at start of each day advance
- **Illness Chance:** Random chance (configurable) that team members get sick
- **Recovery:** If `isIll = true` from previous day, member recovers (hours restored to 8)
- **New Illness:** If member gets sick, sets `isIll = true` and `hours = max(0, hours - 8)`
- **Impact:** Sick members cannot work on projects, lose 8 hours for the day
- **UI:** Shows "(Ill)" indicator on team member cards

### Response Time Tracking
- When conversation opens: record `currentConversationStartTime`
- When choice submitted: calculate elapsed hours
- Update project `lastResponseHours`
- If `responseDeadlineHours` exists:
  - Late response: `satisfaction -= (elapsedHours - deadline) * 1.5`
  - On-time response: `satisfaction += 3`

### Weekly Client Feedback (`generateWeeklyClientFeedback()`)
- Runs at end of week (day 7)
- Updates satisfaction for all active projects
- Generates feedback message based on satisfaction:
  - `>= 80%`: Positive feedback, `+3` morale to assigned team
  - `55-79%`: Neutral feedback, no change
  - `< 55%`: Negative feedback, `-4` morale to assigned team
- Adds entry to `conversationHistory`

### Weekly Payroll Processing (`processWeeklySalaries()`)
- **Location:** `game.js`
- **Runs:** Every week at transition from Day 7 to Day 1 (End of Week)
- **Calculation:**
  - **Workers:** `sum(hours_on_phase × rate × phase_efficiency)` per worker
  - **Minimum:** Workers guaranteed €100 minimum weekly pay
  - **Player:** Fixed €1,000 weekly salary (if funds available)
  - **Overhead:** Fixed `WEEKLY_OVERHEAD` (default €300)
- **Deducts** from `GameState.money`
- **Adds** detailed cost entry to `conversationHistory`
- **Records** "Low on Cash" key moment if money < €1,000
- **Resets** `weeklyPhaseHours` tracking for next week
- **Note:** `processMonthlySalaries()` is deprecated and removed

### Project Completion Penalties (Late Fees)
- **Location:** `projects.js` (`completeProject`)
- **Rule:** If completed after deadline (`weeksRemaining < 0`), apply late fee:
  - 10% of budget per late week, capped at 50% of payment
  - Payment is reduced accordingly
  - Logs warning entry to `conversationHistory`

### Reputation Budget Penalty (New Projects)
- **Location:** `conversations.js` (project spawn)
- **Rule:** Budgets for new projects scale down based on deadline miss ratio:
  - Miss ratio ≥ 50%: budget × 0.7
  - Miss ratio ≥ 30%: budget × 0.85
  - Miss ratio ≥ 10%: budget × 0.95
  - Logs warning and adjusted budget in `conversationHistory`

### Game Phase Updates (`updateGamePhase()`)
- Called at start of each new week
- Updates `GameState.gamePhase`:
  - Weeks 1-2: `"tutorial"`
  - Weeks 3-5: `"early"`
  - Weeks 6-9: `"mid"`
  - Weeks 10-12: `"late"`

### Scripted Events (`triggerScriptedEvents()`)
- Called at start of each new week
- Records milestone key moments at Weeks 3, 5, and 10
- Triggers difficulty curve conversations (see conversations.json)

### Failure Condition Checks (`checkFailureConditions()`)
- **Location:** `game.js`
- Called every day advance (and every timer tick in real-time mode)
- **Immediate Game Over Triggers:**
  - **Bankruptcy:** `money < BANKRUPTCY_THRESHOLD` (default -$5,000) → `handleGameEnd('bankruptcy')`
  - **Player Burnout:** Player burnout ≥ `BURNOUT_MAX` (100) → `handleGameEnd('player_burnout')`
  - **Full Team Quit:** All non-player team members at morale < `BURNOUT_MORALE_THRESHOLD` (default 10) → `handleGameEnd('team_quit')`
  - **Team Burnout:** `MIN_TEAM_SIZE_FOR_BURNOUT_CHECK` (default 2) or more team members at morale < `BURNOUT_MORALE_THRESHOLD` (default 10) → `handleGameEnd('burnout')`
- Returns `true` if game over triggered, `false` otherwise
- Calls `handleGameEnd(reason)` with failure type

### Game Stats Updates (`updateGameStats()`)
- Called every day advance
- Updates `highestMorale` if current > highest
- Updates `lowestMorale` if current < lowest
- Other stats updated by specific events (project completion, scope creep, etc.)

---

## Helper Functions Reference

### State Management (`state.js`)
- `resetToDefaultState()` - Resets GameState to initial values
- `saveState()` - Saves GameState to localStorage
- `getTeamMemberById(memberId)` - Finds team member in team or templates
- `getTeamMemberName(memberId)` - Returns display name for member
- `adjustMemberMorale(member, delta)` - Updates member morale (clamped to min/max)
- `recalculateTeamMorale()` - Updates GameState.teamMorale from team average
- `applyTeamMoraleConsequence(change)` - Applies morale changes from consequences
- `describeTeamMoraleChange(change)` - Formats morale change for display
- `formatConsequences(consequences)` - Formats all consequences for UI display

### Project Management (`projects.js`)
- `buildProjectFromTemplate(template, overrides)` - Creates project instance
- `hydrateProject(project)` - Ensures project has all required runtime properties
- `updateProjectSatisfaction(project)` - Recalculates client satisfaction
- `updateProjectRisk(project)` - Updates risk indicators (including scope creep risk)
- `calculateSatisfactionScores(project)` - Calculates individual satisfaction factors
- `getClientProfile(project)` - Returns project's client profile
- `getProjectStatus(projectId)` - Determines current project status
- `completeProject(projectId)` - Handles project completion
- `handleScopeCreepRequest(change)` - Processes scope changes, increments scopeCreepCount
- `assignTeamMember(memberId, projectId)` - LEGACY: Assigns/unassigns team member (deprecated)
- `assignTeamMemberToPhase(memberId, projectId, phaseName)` - Assigns member to specific phase
- `removeTeamMemberFromPhase(memberId, projectId, phaseName)` - Removes member from specific phase
- `getAvailableTeamMembers()` - Returns team members not assigned to any active phase
- `getTeamMemberStatus(memberId)` - Returns member's current status/mood (based on phase assignments)
- `getPhaseStatus(project, phaseName)` - Determines phase status (waiting/ready/active/complete)
- `updatePhaseProgress(project, phaseName)` - Updates progress for a specific phase
- `canStartPhase(project, phaseName)` - Checks if phase can be activated
- `triggerPhaseActivation(project, phaseName)` - Handles phase activation
- `triggerPhaseCompletion(project, phaseName)` - Handles phase completion
- `getEfficiencyForPhase(member, phaseName)` - Calculates member's efficiency for a phase
- `autoAssignAvailableWorkers()` - Automatically assigns workers to active phases (skill-aware, urgency-based)
- `hireFreelancer(projectId, phaseName)` - Hires a freelancer for a specific phase (cost: complexity × $200)
- `checkForIllness()` - Checks for random team member illness, handles recovery
- `showIllnessPopup(member)` - Displays illness notification modal
- `updatePlayerBurnout()` - Calculates and updates player burnout level (uses tick multiplier)
- `updateTeamMorale()` - Updates team morale for all members (uses `for...of` loop)
- `callInSick()` - Player action to take a sick day and reduce burnout

### Conversation Management (`conversations.js`)
- `checkForConversations()` - Checks for auto-triggered conversations, marks as shown
- `getCurrentConversations()` - Returns conversations matching current week/day, filters out shown today
- `markConversationAsShown(conversationId)` - Adds conversation ID to `shownConversationsToday`
- `queueConversation(conversationId)` - Adds conversation to queue
- `deferConversation(conversationId)` - Defers conversation to current day
- `isConversationDeferred(conversationId)` - Checks if conversation is deferred
- `purgeDeferredConversations()` - Removes expired deferred conversations
- `displayConversation(conversation)` - Renders conversation UI
- `handleChoice(conversationId, choiceId)` - Selects a choice
- `submitConversationChoice()` - Applies choice consequences
- `applyConsequences(consequences, conversation)` - Applies all consequence types
- `recordConversationResponse(conversation)` - Records response time
- `triggerClientEvent(projectId, eventType)` - Triggers project-specific conversations
- `triggerTeamEvent(target, eventType)` - Triggers team-specific conversations
- `checkTeamEvents()` - Checks for personality-driven team events
- `checkTeamPulse()` - End-of-week team morale check
- `checkConditionalConversations()` - Checks for conditional conversations, respects shown today filter

### Game Orchestration (`game.js`)
- `initGame()` - Initializes game, loads JSON files, restores state
- `advanceDay()` - Main game loop function (manual mode)
- `seedInitialProjects()` - Creates starting projects
- `resetWeeklyHours()` - Resets all team members to `HOURS_PER_WEEK` (40) at start of week
- `resetDailyHours()` - Resets daily flags (prevents double-deduction in real-time mode)
- `updateGamePhase()` - Updates game phase based on current week
- `triggerScriptedEvents()` - Triggers milestone key moments
- `checkFailureConditions()` - Checks for game over conditions (bankruptcy, player burnout, team quit)
- `updateGameStats()` - Updates morale highs/lows
- `processMonthlySalaries()` - Deducts monthly payroll and overhead (weeks 5, 9)
- `processWeeklyCosts()` - Deprecated, kept for backward compatibility (no-op)
- `calculateVictoryPath()` - Determines which victory path was achieved
- `calculateScore()` - Calculates final score from stats
- `getRankTitle(victoryPath, score)` - Returns rank title based on performance
- `getEndGameMessage(endReason, victoryPath)` - Returns personalized end message
- `handleGameEnd(endReason)` - Called on victory or failure, shows end screen

### UI Management (`ui.js`)
- `displayGameState()` - Updates all UI elements with current game state
  - **Burnout indicator colors** reference `GameConstants.BURNOUT_WARNING_THRESHOLD` (default 80), `GameConstants.BURNOUT_CHOICE_BLOCK_THRESHOLD` (default 60), and `GameConstants.BURNOUT_MODERATE_THRESHOLD` (default 40) to determine when the burnout text changes styling (red/orange/yellow)
  - **Player hours widget** uses `GameConstants.HOURS_PER_WEEK` (default 40) as the baseline denominator so UI updates stay in sync when weekly capacity is reconfigured
  - Displays current week, day, money, team morale, satisfaction, burnout, and player hours
- `createProjectCard(project)` - Creates project card UI with phase-specific team assignments
- `createTeamMemberCard(member)` - Creates team member card showing phase assignments
- `showPhaseAssignmentModal(projectId)` - Displays 4-column grid modal for phase assignments
- `checkUnassignedProjectsWarning()` - Checks for projects with no team on active phases
- `updateClock()` - Updates clock display with current time (12-hour format)
- `advanceClock()` - Advances `currentHour` by 2-4 hours randomly, resets to 9 AM on new week (manual mode only)
- `displayConversation(conversation)` - Renders conversation UI
- `filterChoicesByBurnout(choices, burnout)` - Filters conversation choices based on burnout thresholds
- `showConsequenceFeedback(consequences)` - Displays consequence feedback (persistent until day advance)
- `showEndGameScreen()` - Displays victory/defeat screen with stats

---

## Data Flow Examples

### Example 1: Assigning Team Member to Project Phases
1. User clicks "Assign to Phases" on project card
2. `showPhaseAssignmentModal(projectId)` displays phase assignment modal
3. User checks/unchecks team members for each phase (4-column grid)
4. User clicks "Save Assignments"
5. For each phase:
   - `assignTeamMemberToPhase(memberId, projectId, phaseName)` adds member to `phase.teamAssigned`
   - `removeTeamMemberFromPhase(memberId, projectId, phaseName)` removes member from `phase.teamAssigned`
6. `displayGameState()` refreshes UI
7. `saveState()` persists to localStorage

**Note:** Workers only contribute to phases they are explicitly assigned to. Unassigned workers sit idle.

### Example 2: Scope Creep Conversation
1. Conversation auto-triggers (week/day match)
2. User selects choice with `scopeChange` consequence
3. `applyConsequences()` calls `handleScopeCreepRequest()`
4. Project `currentScope` increases
5. Timeline extended OR team stress applied
6. `updateProjectSatisfaction()` recalculates satisfaction
7. `updateProjectRisk()` updates risk indicators
8. UI updates to show new scope/risk values

### Example 3: Project Progress Over Time
1. Day advances
2. `updateProjects()` called
3. For each project with assigned team:
   - Calculates daily progress from team skill/morale
   - Applies status multiplier (crisis = 0x, warning = 0.5x)
   - Adds random variation
   - Updates `project.progress`
   - Decrements `weeksRemaining`
4. If `progress >= 1.0`: `completeProject()` triggered
5. Payment calculated and added to money
6. Team unassigned and morale boosted

---

## Persistence

**Location:** `localStorage` key: `"agencyChaosState"`

Game state is saved automatically:
- After each day advance
- After conversation choice submission
- After team member assignment

State is loaded on `initGame()` if localStorage entry exists.

**Note:** JSON data files (conversations.json, characters.json, projects.json) are NOT part of saved state - they are templates loaded fresh each session.

---

## State Validation

When loading from localStorage, projects are hydrated via `hydrateProject()` to ensure all runtime properties exist. Team members are initialized from templates if `GameState.team` is empty.

---

## Victory & Failure System

### Victory Paths

Three victory paths available when completing all 12 weeks:

#### 🌟 Rockstar Path
**Requirements:**
- 5+ projects completed
- $25,000+ final money
- 75%+ average satisfaction
- 70%+ team morale

**Rank Titles:**
- 50,000+ score: "🌟 Agency Legend"
- 40,000+ score: "🎯 Master Director"
- Default: "💎 Top Performer"

#### 📈 Professional Path
**Requirements:**
- 3+ projects completed
- $10,000+ final money
- 60%+ average satisfaction
- 50%+ team morale

**Rank Titles:**
- 30,000+ score: "📈 Solid Professional"
- 20,000+ score: "✅ Competent Manager"
- Default: "👔 Getting By"

#### 💪 Survivor Path
**Requirements:**
- 2+ projects completed
- $2,000+ final money

**Rank Titles:**
- 15,000+ score: "💪 Scrappy Survivor"
- 10,000+ score: "🔥 Barely Made It"
- Default: "😅 Still Standing"

#### 📉 Struggled Path
- Completed 12 weeks but didn't meet Survivor requirements
- Rank: "📉 Struggling Startup"

### Failure Conditions

**Immediate Game Over:**
1. **Bankruptcy** - `money < -$5,000`
2. **Team Quit** - All non-player team members quit (morale < 10)
3. **Burnout** - 2+ team members at morale < 10 simultaneously

### Scoring System

**Base Score Components:**
- Projects Completed: 1,000 points each
- Final Money: money ÷ 10
- Average Satisfaction: (avg satisfaction) × 10
- Team Morale: current morale × 5

**Bonuses:**
- Perfect Deliveries: +500 each (90%+ satisfaction, on time)
- Scope Creep Handled: +200 each
- Early Completion: +100 per week before Week 12

**Penalties:**
- Projects Failed: -800 each
- Deadlines Missed: -400 each
- Team Member Quits: -600 each

**Score Range:**
- Typical: 10,000 - 30,000
- Good: 30,000 - 45,000
- Exceptional: 45,000+

---

## End Game Flow

### Game End Triggers

1. **Victory** - Week 12 Day 7 completes
   - Calculates victory path via `calculateVictoryPath()`
   - Records "12 Weeks Complete!" key moment
   
2. **Failure** - Failure condition triggered
   - Sets `victoryPath = "failed"`
   - Records appropriate failure key moment

### End Game Screen Display

Shows modal with:
- Victory/defeat header
- Personalized rank title
- Custom message based on performance
- Final stats grid (weeks, money, projects, satisfaction, morale)
- Performance breakdown (failures, quits, perfect deliveries)
- Final score
- Key moments timeline (last 10 events)
- "Play Again" button (resets game)
- "Copy Score to Clipboard" button

**Implementation:** `ui.js` → `showEndGameScreen()`

---

## Scripted Difficulty Events

Five major scripted events create difficulty curve:

### Week 3: Major Scope Creep Crisis
- **ID:** `week3_scope_creep_crisis`
- Client requests major expansion (mobile, dark mode, accessibility)
- 2 choices: Accept all / Phase approach
- Tests scope management and negotiation

### Week 5: Team Morale Crisis
- **ID:** `week5_morale_crisis`
- Team burnout warning from senior developer
- 2 choices: Day off / Push through
- Tests team management and resource decisions

### Week 7: Budget Pressure
- **ID:** `week7_budget_pressure`
- Monthly payroll costs vs. quick job opportunity
- 2 choices: Take quick job / Stay focused
- Tests financial management

### Week 10: Final Push Decision
- **ID:** `week10_final_push`
- Quality vs. timeline strategic choice
- 2 choices: Quality sprint / Trust team
- Tests leadership and prioritization

### Week 11: Crunch Time
- **ID:** `week11_crunch_decision`
- Last-minute client presentation demand
- 2 choices: Weekend crunch / Push back
- Tests boundaries and sustainability

---

## Team Member Quit Mechanics

**Quit Triggers:**
- Team member morale drops below 5
- Checked during weekly team pulse (`checkTeamPulse()`)

**When Member Quits:**
1. Sets `member.hasQuit = true`
2. Increments `GameState.gameStats.teamMemberQuits`
3. Records key moment: "Team Member Quit"
4. Adds event to conversation history
5. Member no longer contributes to projects
6. Reduces weekly costs (one fewer person on payroll)

**Impact:**
- Reduces project progress (fewer hands)
- Can trigger burnout failure if multiple quit
- Significant score penalty (-600 per quit)

---

## Economics & Balance

### Starting Resources
- **Money:** `STARTING_MONEY` (default $8,000)
- **Team Size:** 3 (player + 2 employees)
- **Team Morale:** `DEFAULT_STARTING_MORALE` (default 75%)

### Weekly Costs
- **Weekly Payroll:** Based on hours worked × rate × efficiency
- **Hourly Rates:**
  - Manager: €50/hr
  - Developer: €30/hr
  - Designer: €25/hr
- **Minimum Pay:** €100/week per worker
- **Player Salary:** €1,000/week (fixed)
- **Overhead:** `WEEKLY_OVERHEAD` (default €300)
- **Frequency:** Every week (Day 7 end)
- **Default Total:** Variable based on workload + €1,300 fixed (Player + Overhead)

### 12-Week Economics
- **Total Fixed Costs:** €15,600 (Player + Overhead for 12 weeks)
- **Variable Costs:** Depends on team size and workload
- **Break Even:** Need ~€20,000+ net income
- **Survivor Target:** ~€30,000 total income
- **Professional Target:** ~€40,000 total income
- **Rockstar Target:** ~€60,000 total income

### Project Economics
- **Budget Range:** $5,000 - $15,000
- **Satisfaction Multiplier:** 20% - 100%
- **Average Payment:** $6,000 - $10,000 per project
- **Projects Needed:**
  - Survivor: 2-3 projects
  - Professional: 3-4 projects
  - Rockstar: 5-6 projects

### Balance Targets
- Average player: Reaches Week 8-10
- Competent player: Achieves Professional path
- Expert player: Achieves Rockstar path
- Survivor path: Achievable with basic competence

---

## Future Enhancements (Post-MVP)

Potential additions for future versions:
- Difficulty modes (Chill / Realistic / Nightmare)
- Tutorial overlay system
- Achievement/unlock system
- New hire system (expand team mid-game)
- Client relationship progression
- Team member skill leveling
- Multiple save slots
- Leaderboard / score comparison

---

## Phase-Specific Assignment System

**Location:** `projects.js`, `ui.js`, `timer.js`

### Core Rules
1. **Workers are assigned to specific phases, not projects**
   - Each phase has a `teamAssigned` array of member IDs
   - Workers can be assigned to multiple phases across multiple projects
   - Workers only contribute to phases they are explicitly assigned to

2. **Phase Progression**
   - Phases progress sequentially (management → design → development → review)
   - Next phase becomes "ready" when previous phase reaches 50% progress
   - Phases do not run simultaneously

3. **Hours Splitting**
   - Worker hours are split evenly across all active phase assignments
   - Example: Worker on 2 active phases = 50% hours per phase
   - Only active/ready phases count toward hour splitting

4. **Idle Workers**
   - Workers not assigned to any active/ready phase sit idle
   - Idle workers do not lose hours
   - Can be assigned to phases at any time via "Assign to Phases" modal

5. **Auto-Assignment**
   - `autoAssignAvailableWorkers()` assigns workers to active phases
   - Prioritizes projects by urgency (progress, weeks remaining, current team size)
   - Assigns best-fit workers based on skill and efficiency

### UI Elements
- **Project Cards**: Show warning if no team assigned to active phases
- **Top Banner**: Warns about projects with no team on active phases
- **Worker Cards**: Show projects only if worker is assigned to at least one phase
- **Phase Assignment Modal**: 4-column grid (one per phase) with checkboxes for each worker

### Backward Compatibility
- Legacy `member.currentAssignment` and `member.assignedProjects` still exist but are deprecated
- Legacy `project.teamAssigned` still exists but is deprecated
- Code checks both old and new systems for compatibility

---

## Recent Updates & Current Build State

### Phase-Specific Assignments (Latest)
- **Feature**: Workers assigned to specific project phases, not projects
- **Implementation**: `phase.teamAssigned` arrays, phase-specific progress calculation
- **UI**: 4-column phase assignment modal, updated project/worker cards
- **Location**: `projects.js` - `updatePhaseProgress()`, `assignTeamMemberToPhase()`, `ui.js` - `showPhaseAssignmentModal()`

### Burnout Rebalance & Phase Awareness (Latest)
- **Feature**: Burnout now reads phase assignments (not legacy project.teamAssigned) and is more urgent
- **Increases**: Base +0.5/tick, +6 per assigned project (via phases), +9 per crisis project, +2/+1 for low hours, morale stress (+2 / +0.5)
- **Relief**: Only via conversations (40% reduced relief) or call in sick (max 15). Overtime burnout is 10% per hour.
- **Location**: `projects.js` - `updatePlayerBurnout()`, `state.js` - `calculateOvertimeBurnout()`

### Team Events Phase-Aware (Latest)
- **Feature**: Personality events (perfectionist/pragmatic/eager) and conflict checks now use phase assignments
- **Compatibility**: Legacy `currentAssignment`/`assignedProjects` still read as fallback
- **Location**: `conversations.js` - `checkTeamEvents()`

### Inbox-Style Messages UI (Latest)
- **Feature**: Messages panel now mimics an email inbox with list + detail panes
- **List Pane**: Inbox header, filters (All/Unread), search stub, message cards with urgency icons, tags/pills, preview
- **Detail Pane**: Conversation with sender, subject, deadline badge, choices with consequence icons
- **Location**: `ui.js` (messages render), `styles.css` (inbox layout)

### Economic Penalties (Latest)
- **Late Fees**: 10% of budget per late week (capped at 50%) deducted on completion if `weeksRemaining < 0`
- **Reputation Budget Cuts**: New project budgets scale down based on deadline miss ratio (0.95 / 0.85 / 0.7)
- **Location**: `projects.js` (`completeProject`), `conversations.js` (project spawn)

### Hours Exhaustion System (Latest)
- **Feature**: Different mechanics for player (can go negative) vs workers (stop at 0)
- **Player**: Can work overtime (negative hours), incurs burnout and morale penalties
- **Workers**: Stop at 0 hours, incur morale penalty, resume next week
- **Location**: `timer.js` - `deductHoursFromTeam()`

### Scope Creep Risk Indicator (Latest)
- **Feature**: Projects track `scopeCreepCount` and display risk in UI
- **Implementation**: `updateProjectRisk()` calculates `risk.scopeCreep` based on count
- **Location**: `projects.js` - `updateProjectRisk()`, `handleScopeCreepRequest()`

### Dynamic Conversation System (Latest)
- **Feature**: Dynamic conversation IDs and name replacements for random teams
- **Implementation**: `triggerTeamEvent()` uses member IDs, `replaceHardcodedNames()` handles placeholders
- **Location**: `conversations.js` - `triggerTeamEvent()`, `replaceHardcodedNames()`

### Message Repeat Prevention
- **Feature**: Prevents conversations from repeating within the same day
- **Implementation**: `shownConversationsToday` array tracks displayed conversations
- **Allowed Repeats**: Lunch breaks, bedtime reminders, and exercise reminders can still appear multiple times
- **Reset**: Array clears when day advances (both manual and real-time modes)
- **Location**: `conversations.js` - `markConversationAsShown()`, `getCurrentConversations()`, `checkConditionalConversations()`

### Constants System
- **Location**: `constants.js`
- Centralized configuration for all game parameters
- All magic numbers should reference `GameConstants` object
- Includes thresholds, multipliers, victory paths, and UI element IDs
- Fallback defaults ensure backward compatibility

### State Initialization
- `shownConversationsToday` initialized in `resetToDefaultState()`
- `overtimeWarningShown` and `outOfHoursWarningShown` flags reset weekly
- Validated when loading from localStorage in `initGame()`
- Reset on day advance in both `timer.js` and `game.js`

---
