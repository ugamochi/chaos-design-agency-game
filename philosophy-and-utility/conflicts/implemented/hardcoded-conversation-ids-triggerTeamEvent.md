# Fix: Hardcoded Conversation IDs in triggerTeamEvent()

## Issue
`eventMap` in `conversations.js:642-667` has hardcoded conversation IDs:
- `perfectionist_polish: 'tanue_extension_request'` (hardcoded to Tanue)
- `pragmatic_scope: 'pasha_scope_suggestion'` (hardcoded to Pasha)
- `eager_help: 'sasha_needs_help'` (hardcoded to Sasha)

New team members won't have conversations.

## Solution
Make conversation IDs dynamic:

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

Create generic conversation templates that use `{Worker}` placeholder and replace when displaying.

