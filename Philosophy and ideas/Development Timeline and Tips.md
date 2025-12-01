# Development Timeline and Tips

## Development Timeline

### Week 1: MVP Foundation

- Day 1: Prompt 1 (Foundation)
- Day 2: Prompt 2 (Conversations)
- Day 3: Prompt 3 (Projects)
- Day 4: Prompt 4 (Team)
- Day 5: Prompt 5 (Clients)
- Day 6: Prompt 6 (Game Loop)
- Day 7: Prompt 7 (Polish)

### Week 2: Testing & Iteration

- Days 1-3: Internal playtesting
- Days 4-5: External playtest (5-10 people)
- Days 6-7: Fixes and balance adjustments

### Week 3: Launch Prep

- Day 1-2: itch.io page setup
- Day 3-4: Marketing materials (screenshots, GIF, description)
- Day 5: Soft launch to friends
- Day 6-7: Monitor feedback, quick fixes

### Month 2+: Post-MVP

- Week 1: Prompt 8 (Office view)
- Week 2-3: Prompt 9 (Procedural content)
- Week 4+: Prompt 10 (Campaigns)

---

## Cursor/Claude Usage Tips

### For Each Prompt Session

1. **Start fresh context:**

   "I'm building an agency management simulator game. Here's what exists so far: [paste relevant code]

   Now I need to: [paste specific prompt]"

2. **Be specific about constraints:**
   - "Keep it under 300 lines"
   - "No external dependencies"
   - "Maintain existing naming conventions"

3. **Request explanations:**
   - "Explain the key design decisions"
   - "How would I extend this later?"
   - "What are potential performance issues?"

4. **Iterate in small chunks:**
   - If response is wrong, ask for specific fix
   - "The calculation is incorrect because..."
   - "Change only the X function, keep everything else"

5. **Test as you go:**
   - After each prompt, actually run the code
   - Fix bugs before moving to next prompt
   - Don't accumulate technical debt

### Common Issues & Solutions

**Issue:** Code gets messy after multiple prompts  
**Solution:** Every 2-3 prompts, ask for refactoring:  
"Refactor game.js to be more modular. Separate into: state.js, ui.js, conversations.js, projects.js"

**Issue:** Features conflict with each other  
**Solution:** Before new feature, ask:  
"Before implementing X, identify potential conflicts with existing systems Y and Z. Propose integration strategy."

**Issue:** Losing track of game state  
**Solution:** Maintain a `GAME_STATE.md` file:  
"Generate a complete game state documentation file that describes all objects, properties, and their interactions."

---

## Success Metrics for MVP

### Must achieve

1. **Playability:**
   - [ ] Can complete 12-week game without bugs
   - [ ] All conversations trigger appropriately
   - [ ] Win/lose conditions work

2. **Fun factor:**
   - [ ] Players say "just one more day"
   - [ ] Players laugh at conversations
   - [ ] Players feel tension (good stress)
   - [ ] Players want to try different strategies

3. **Technical quality:**
   - [ ] No console errors
   - [ ] Loads in <2 seconds
   - [ ] Works on mobile
   - [ ] localStorage persists properly

4. **Content quality:**
   - [ ] Conversations feel authentic
   - [ ] Choices have meaningful tradeoffs
   - [ ] Humor lands (not cringe)
   - [ ] Personalities are distinct

If these metrics hit, proceed to Phase 2. If not, iterate on MVP until they do.

---

## Final Advice

**Start simple.** Resist the urge to add features during MVP.

**Test early.** Don't wait until "it's ready."

**Write good content.** The funniest, most relatable conversations will carry this game.

**Feel the chaos.** If YOU feel overwhelmed playing it, you've succeeded.

**Ship it.** Done is better than perfect.

Now go build it. This could be special.
