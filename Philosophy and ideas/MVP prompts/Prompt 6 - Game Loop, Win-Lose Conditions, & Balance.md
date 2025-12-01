PROMPT 6: Game Loop, Win/Lose Conditions, & Balance

Objective: Make it actually playable end-to-end with proper pacing

Implement the complete game loop with victory/failure conditions and balanced difficulty.

REQUIREMENTS:

1. Add to game.js:
   - Game loop structure:
     * Tutorial mode (Week 1-2)
     * Early game (Week 3-5)
     * Mid game (Week 6-9)
     * Late game (Week 10-12)
   - Difficulty curve implementation with scripted events (scope creep, morale crisis, budget issues, final push).

2. Implement victory conditions (three paths):
   - Survivor
   - Professional
   - Rockstar
   Each with specific thresholds for projects, money, satisfaction, morale.

3. Implement failure conditions:
   - Immediate game over: bankruptcy, full team quit, lawsuit
   - Soft failures: missed deadlines, client firing, team member quitting

4. Create end-game scoring system with bonuses/penalties and rank titles.

5. Create end game screen:
   - Final stats
   - Rank, score
   - Personalized message
   - Play Again / Share Score buttons

6. Add "key moments" tracking:
   - Record significant choices/events
   - Display in end summary timeline

7. Balance the difficulty:
   - Starting resources
   - Project payments
   - Weekly costs
   - Ensure average play reaches Week 8+, expert play completes victory paths

8. (Optional) Difficulty modes:
   - Chill, Realistic, Nightmare presets

TESTING:
- Play through full 12 weeks
- Trigger each failure condition
- Verify scoring and ranks
- Ensure replayability ("one more try" feeling)

Please provide complete, balanced game loop code.

