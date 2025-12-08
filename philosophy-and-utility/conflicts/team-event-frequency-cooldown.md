# Fix: Team Event Frequency Cooldown

## Issue
`checkTeamEvents()` in `conversations.js:669-696` has random chance triggers (0.03-0.08) called every game tick (0.1 hours). Might trigger too frequently or conflict with other conversation triggers.

## Solution
Add cooldown per team member:

```javascript
if (!member._lastTeamEventTime) member._lastTeamEventTime = 0;
const hoursSinceLastEvent = (window.GameState.currentHour - member._lastTeamEventTime);
if (hoursSinceLastEvent < 24) return; // 24-hour cooldown

// Trigger event...
member._lastTeamEventTime = window.GameState.currentHour;
```

Or reduce frequency: `Math.random() < 0.01` (1% chance per check).

