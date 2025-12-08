PROMPT 2: Conversation System & UI

Objective: Build the conversation display and choice handling

Extend the agency simulator with a conversation system.

REQUIREMENTS:

1. Add to game.js:
   - Conversation object structure:
     {
       id: "unique_id",
       week: 4,  // when it triggers
       day: 1,   // which day of week
       urgency: "high",  // low, medium, high, critical
       from: "Sarah Chen (TechCorp)",
       subject: "Board meeting prep",
       body: "Long form message text here...",
       choices: [
         {
           id: "choice_1",
           text: "I'll have it ready by 5pm",
           consequences: {
             money: 0,
             teamMorale: -10,
             projectProgress: { projectId: "techcorp_web", delta: -0.1 },
             clientSatisfaction: { projectId: "techcorp_web", delta: 0.15 },
             spawnConversations: ["late_night_work"]
           },
           flavorText: "You know this means working late..."
         },
         // ... more choices
       ]
     }

   - Functions:
     * getCurrentConversations() - returns conversations that should trigger now
     * displayConversation(conversation) - renders conversation UI
     * handleChoice(conversationId, choiceId) - applies consequences
     * applyConsequences(consequences) - updates game state
     * queueConversation(conversationId) - adds to queue for later

2. Update HTML/CSS:
   - Add conversation display area:
     * From/Subject header
     * Message body (readable, boxed)
     * Choice buttons (clearly differentiated)
     * Urgency indicator (color-coded border)
   - Add "notification" style indicators when conversations are queued
   - Make choices feel impactful (slight hover effect, confirm on click)

3. Create conversations.json with 5 starter conversations:
   a) Client scope creep request
   b) Team member asking for help
   c) Payment delayed notification
   d) New project inquiry
   e) Crisis: Developer called in sick
   Each should have 3 meaningful choice options with different tradeoffs.

4. Implement conversation flow:
   - On advanceDay(), check for triggered conversations
   - Display one at a time (queue others)
   - Block time advancement until current conversation is resolved
   - Show consequence feedback after choice

5. Add visual feedback:
   - Show resource changes with +/- animations
   - Briefly highlight affected elements
   - Log important events to a mini activity feed

TESTING:
- Trigger a conversation on Week 1, Day 1
- Make a choice and verify consequences apply correctly
- Queue multiple conversations and verify they display in order

Please provide the updated files with working conversation system.

