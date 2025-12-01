// Real-time game timer: 1 game hour = 1 real second
// Timer pauses when conversations appear, resumes when resolved

const TimerModule = (function() {
    'use strict';

    let gameTimer = null;
    let isPaused = false;
    let lastTickTime = null;
    const HOURS_PER_SECOND = 1; // 1 game hour per 1 real second
    const TICK_INTERVAL = 100; // Tick every 0.1 seconds (100ms) for smoother animation
    const HOURS_PER_TICK = 0.1; // 0.1 hours per tick (10 ticks = 1 hour = 1 second)

    function startGameTimer() {
        if (gameTimer) {
            console.warn('Game timer already running');
            return;
        }

        console.log('Starting real-time game timer (1 hour = 1 second, ticking every 0.1s)');
        lastTickTime = Date.now();
        
        // Initialize currentMinute if not exists
        if (window.GameState.currentMinute === undefined) {
            window.GameState.currentMinute = 0;
        }
        
        gameTimer = setInterval(() => {
            // Check if we should pause
            if (shouldPauseTimer()) {
                return;
            }

            tickGameTime();
        }, TICK_INTERVAL); // Tick every 0.1 seconds for smooth animation
    }

    function shouldPauseTimer() {
        // Pause if:
        // - Game is over
        // - There's an active conversation
        // - Timer is manually paused
        return window.GameState.gameOver || 
               window.currentConversation !== null || 
               isPaused;
    }

    function tickGameTime() {
        const now = Date.now();
        const deltaTime = (now - lastTickTime) / 1000; // seconds elapsed
        lastTickTime = now;

        // Advance game time by 0.1 hours (6 minutes) per tick
        // Initialize currentMinute if not exists
        if (window.GameState.currentMinute === undefined) {
            window.GameState.currentMinute = 0;
        }
        
        window.GameState.currentMinute += 6; // 0.1 hours = 6 minutes
        
        // Handle minute rollover (60 minutes = 1 hour)
        if (window.GameState.currentMinute >= 60) {
            const hoursToAdd = Math.floor(window.GameState.currentMinute / 60);
            window.GameState.currentMinute = window.GameState.currentMinute % 60;
            window.GameState.currentHour = Math.floor((window.GameState.currentHour || 9) + hoursToAdd);
        } else {
            // Ensure hour is always an integer
            window.GameState.currentHour = Math.floor(window.GameState.currentHour || 9);
        }

        // Handle work day boundaries (9 AM to 6 PM)
        if (window.GameState.currentHour >= 18) {
            // End of work day
            window.GameState.currentHour = 9;
            window.GameState.currentDay++;
            
            // Handle week rollover
            if (window.GameState.currentDay > 7) {
                window.GameState.currentDay = 1;
                window.GameState.currentWeek++;
                
                if (window.GameState.currentWeek > 12) {
                    window.handleGameEnd('victory');
                    stopGameTimer();
                    return;
                }

                // Reset weekly hours at start of new week
                window.resetWeeklyHours();
                window.updateGamePhase();
                window.triggerScriptedEvents();
            } else {
                // Reset daily hours
                window.resetDailyHours();
            }

            // Day-end logic
            window.purgeDeferredConversations();
            window.checkForIllness();
            
            if (window.GameState.currentDay === 7) {
                window.checkTeamPulse();
                setTimeout(() => window.showWeekSummary(), 500);
                window.generateWeeklyClientFeedback();
            }
            
            // Process monthly salaries at start of new month
            if (window.GameState.currentDay === 1) {
                window.processMonthlySalaries();
            }
        }

        // Deduct hours from team members in real-time
        // Each tick is 0.1 hours, so deduct 0.1 hours per tick
        // Regular clock running cannot cause debt (allowDebt = false)
        deductHoursFromTeam(HOURS_PER_TICK, false);

        // Update projects based on time elapsed
        window.updateProjects();

        // Update game state
        window.updatePlayerBurnout();
        window.updateTeamMorale();
        window.checkTeamEvents();
        window.checkFailureConditions();
        window.checkConditionalConversations();
        window.checkProjectDeadlines();
        window.updateGameStats();

        // Update UI
        window.updateClock();
        window.displayGameState();
        
        // Check for new conversations
        if (window.currentConversation === null) {
            window.checkForConversations();
        }

        // Auto-save periodically (every 10 game hours = 10 seconds)
        if (Math.floor(window.GameState.currentHour) % 10 === 0) {
            window.saveState();
        }
    }

    function deductHoursFromTeam(hoursToDeduct, allowDebt = false) {
        window.GameState.team.forEach(member => {
            if (member.isIll || member.hasQuit) {
                return; // Skip ill or quit members
            }

            // Only deduct if member is working (has assignment or is player)
            const hasAssignment = member.currentAssignment !== null && member.currentAssignment !== undefined;
            const isPlayer = member.id === 'player';
            
            if (!hasAssignment && !isPlayer) {
                return; // Not working, don't deduct
            }

            // Deduct hours
            const currentHours = member.hours || 40;
            let newHours = currentHours - hoursToDeduct;
            let actualHoursDeducted = hoursToDeduct;
            
            // For player: only allow debt (negative hours) from message events, not regular clock
            // Regular clock cannot push you from positive/zero into debt, but can make existing debt worse
            if (isPlayer && !allowDebt && currentHours >= 0 && newHours < 0) {
                // Prevent going from positive/zero into debt during regular clock
                // Calculate actual hours deducted (only what was available)
                actualHoursDeducted = currentHours;
                newHours = 0;
            }
            
            // Update hours
            member.hours = newHours;
            
            // Track hours worked this week (use actual hours deducted, not the full amount)
            if (member.hoursWorkedThisWeek === undefined) {
                member.hoursWorkedThisWeek = 0;
            }
            member.hoursWorkedThisWeek += actualHoursDeducted;

            // Handle overtime for player
            // Calculate burnout only for hours worked while in overtime
            // Rate: 5% burnout per hour of overtime (scaled to tick: 0.5% per 0.1 hours)
            if (isPlayer && newHours < 0) {
                let hoursInOvertime = 0;
                
                if (currentHours < 0) {
                    // Already in overtime - all deducted hours are overtime
                    hoursInOvertime = hoursToDeduct;
                } else {
                    // Just entered overtime - only count hours that pushed into negative
                    // If we deducted more than available hours, only the deficit is overtime
                    hoursInOvertime = Math.abs(newHours);
                }
                
                // 5% burnout per hour of overtime, scaled to tick rate
                const burnoutIncrease = hoursInOvertime * 5 * 0.01; // 5% per hour = 0.5% per 0.1 hours
                if (member.burnout !== undefined && burnoutIncrease > 0) {
                    member.burnout = Math.min(100, (member.burnout || 0) + burnoutIncrease);
                }
            }

            // Handle overtime for workers (affects morale)
            // Rate: 3% morale loss per hour of overtime (scaled to tick: 0.3% per 0.1 hours)
            if (!isPlayer && newHours < 0) {
                const overtimeHours = Math.abs(newHours);
                // 3% morale per hour of overtime, scaled to tick rate
                const moralePenalty = overtimeHours * 3 * 0.01; // 3% per hour = 0.3% per 0.1 hours
                if (member.morale && typeof member.morale.current === 'number') {
                    member.morale.current = Math.max(0, member.morale.current - moralePenalty);
                }
            }
        });
    }

    function advanceTimeByHours(hours) {
        // Manually advance time (used when replying to messages)
        // Initialize currentMinute if not exists
        if (window.GameState.currentMinute === undefined) {
            window.GameState.currentMinute = 0;
        }
        
        // Convert hours to minutes and add
        const minutesToAdd = hours * 60;
        window.GameState.currentMinute += minutesToAdd;
        
        // Handle minute rollover
        if (window.GameState.currentMinute >= 60) {
            const hoursToAdd = Math.floor(window.GameState.currentMinute / 60);
            window.GameState.currentMinute = window.GameState.currentMinute % 60;
            window.GameState.currentHour = Math.floor((window.GameState.currentHour || 9) + hoursToAdd);
        } else {
            window.GameState.currentHour = Math.floor(window.GameState.currentHour || 9);
        }

        // Handle day rollover
        if (window.GameState.currentHour >= 18) {
            window.GameState.currentHour = 9;
            window.GameState.currentMinute = 0;
            window.GameState.currentDay++;
            
            if (window.GameState.currentDay > 7) {
                window.GameState.currentDay = 1;
                window.GameState.currentWeek++;
                
                if (window.GameState.currentWeek > 12) {
                    window.handleGameEnd('victory');
                    stopGameTimer();
                    return;
                }

                window.resetWeeklyHours();
                window.updateGamePhase();
                window.triggerScriptedEvents();
            } else {
                window.resetDailyHours();
            }

            window.GameState.shownConversationsToday = [];
            window.purgeDeferredConversations();
            window.checkForIllness();
            
            if (window.GameState.currentDay === 7) {
                window.checkTeamPulse();
                setTimeout(() => window.showWeekSummary(), 500);
                window.generateWeeklyClientFeedback();
            }
            
            if (window.GameState.currentDay === 1) {
                window.processMonthlySalaries();
            }
        }

        // Deduct hours from team
        // Message events can cause debt (allowDebt = true)
        deductHoursFromTeam(hours, true);

        // Update game state
        window.updateProjects();
        window.updatePlayerBurnout();
        window.updateTeamMorale();
        window.checkTeamEvents();
        window.checkFailureConditions();
        window.checkProjectDeadlines();
        window.updateGameStats();

        // Update UI
        window.updateClock();
        window.displayGameState();
    }

    function stopGameTimer() {
        if (gameTimer) {
            clearInterval(gameTimer);
            gameTimer = null;
            console.log('Game timer stopped');
        }
    }

    function pauseTimer() {
        isPaused = true;
        console.log('Game timer paused');
    }

    function resumeTimer() {
        isPaused = false;
        lastTickTime = Date.now(); // Reset to avoid time jumps
        console.log('Game timer resumed');
    }

    function isTimerRunning() {
        return gameTimer !== null;
    }

    return {
        startGameTimer,
        stopGameTimer,
        pauseTimer,
        resumeTimer,
        isTimerRunning,
        advanceTimeByHours,
        deductHoursFromTeam
    };
})();

// Expose on window
window.startGameTimer = TimerModule.startGameTimer;
window.stopGameTimer = TimerModule.stopGameTimer;
window.pauseTimer = TimerModule.pauseTimer;
window.resumeTimer = TimerModule.resumeTimer;
window.isTimerRunning = TimerModule.isTimerRunning;
window.advanceTimeByHours = TimerModule.advanceTimeByHours;

