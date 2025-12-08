# Fix: Personality Type Matching Validation

## Issue
Event triggers in `conversations.js:674-688` check for specific personality types (`perfectionist`, `pragmatic`, `eager`). Random team generation might create mismatches or missing personality types.

## Solution
Add validation when loading team members:

```javascript
if (!member.personality || !member.personality.type) {
    console.warn(`Team member ${member.id} missing personality type`);
    member.personality = { type: 'standard' }; // Default
}
```

Verify personality types in `characters.json` match expected types. Document required personality types.

