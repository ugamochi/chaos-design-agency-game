// Real-time game timer: 1 game hour = 1 real second
// Timer pauses when conversations appear, resumes when resolved
// BURNOUT RULE: Never write to member.burnout directly!
// ALWAYS use adjustBurnout() from state.js

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
        // Pause priority (highest to lowest):
        // 1. Game is over (can't unpause)
        // 2. Active conversation (auto-pause)
        // 3. Weekend choice modal (auto-pause)
        // 4. Manual pause by user
        
        if (window.GameState.gameOver) {
            return true; // Can never resume after game over
        }
        
        if (window.currentConversation !== null) {
            return true; // Auto-pause during conversations
        }
        
        if (window.weekendModalActive === true) {
            return true; // Auto-pause during weekend choice
        }
        
        if (window.GameState.isManuallyPaused) {
            return true; // Manual pause by user
        }
        
        return false; // Game is running
    }

    function pauseGame() {
        if (window.GameState.gameOver) {
            console.warn('Cannot pause - game is over');
            return false;
        }
        
        window.GameState.isManuallyPaused = true;
        window.updatePauseButton && window.updatePauseButton();
        window.saveState && window.saveState();
        console.log('Game paused by user');
        return true;
    }

    function resumeGame() {
        if (window.GameState.gameOver) {
            console.warn('Cannot resume - game is over');
            return false;
        }
        
        if (window.currentConversation !== null) {
            console.warn('Cannot resume - conversation active');
            return false;
        }
        
        window.GameState.isManuallyPaused = false;
        window.updatePauseButton && window.updatePauseButton();
        window.saveState && window.saveState();
        console.log('Game resumed by user');
        return true;
    }

    function togglePause() {
        if (window.GameState.isManuallyPaused) {
            return resumeGame();
        } else {
            return pauseGame();
        }
    }

    function isGamePaused() {
        return shouldPauseTimer();
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
        // BUG FIX #3: Check for Friday BEFORE advancing day
        if (window.GameState.currentHour >= 18) {
            // Check if it's Friday (Day 5) BEFORE advancing to next day
            if (window.GameState.currentDay === 5) {
                // Friday evening - show weekend choice modal
                // Keep time at Friday 6 PM until choice is made
                window.GameState.currentHour = 18;
                window.GameState.currentMinute = 0;
                
                // Show weekend modal (this will pause the timer)
                if (window.showWeekendChoiceModal) {
                    window.showWeekendChoiceModal();
                }
                
                // Save state and return (weekend choice will advance to Monday)
                window.saveState();
                return;
            }
            
            // End of work day - reset to 9:00 AM next day
            window.GameState.currentHour = 9;
            window.GameState.currentMinute = 0;
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

                // Pay weekly salaries (before resetting hours)
                if (window.processWeeklySalaries) {
                    window.processWeeklySalaries();
                }

                // Reset weekly hours at start of new week
                window.resetWeeklyHours = window.resetWeeklyHours || function() {
                    window.GameState.team.forEach(member => {
                        member.hours = 40;
                        member.hoursWorkedThisWeek = 0;
                        // Reset overtime flags for new week
                        member.overtimeWarningShown = false;
                        member.outOfHoursWarningShown = false;
                    });
                };
                window.resetWeeklyHours();
                window.updateGamePhase && window.updateGamePhase();
                window.triggerScriptedEvents && window.triggerScriptedEvents();
            } else {
                // Reset daily hours
                window.resetDailyHours = window.resetDailyHours || function() {
                    window.GameState.team.forEach(member => {
                        if (!member.hasQuit && !member.isIll) {
                            member.hours = Math.min(member.hours, 40);
                        }
                    });
                };
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
            
            // Process monthly salaries - REMOVED (replaced by weekly system)
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

    // ONLY place hours are deducted - projects.js must NOT modify member.hours
    function deductHoursFromTeam(hoursToDeduct, allowDebt = false) {
        window.GameState.team.forEach(member => {
            if (member.isIll || member.hasQuit) {
                return; // Skip ill or quit members
            }

            // Only deduct if member is working (assigned to any active phase or is player)
            const isPlayer = member.id === 'player';
            
            // Check if member is assigned to any active phase
            let hasActivePhaseAssignment = false;
            if (!isPlayer) {
                window.GameState.projects.forEach(proj => {
                    if (!proj.phases) return;
                    ['management', 'design', 'development', 'review'].forEach(phaseName => {
                        const phase = proj.phases[phaseName];
                        if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                            const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(proj, phaseName) : phase.status;
                            if (phaseStatus === 'active' || phaseStatus === 'ready') {
                                hasActivePhaseAssignment = true;
                            }
                        }
                    });
                });
            }
            
            if (!hasActivePhaseAssignment && !isPlayer) {
                return; // Not working, don't deduct (sits idle)
            }

            // Deduct hours
            const currentHours = member.hours || 40;
            let newHours = currentHours - hoursToDeduct;
            let actualHoursDeducted = hoursToDeduct;
            
            // Different behavior for player vs workers
            if (isPlayer) {
                // PLAYER: Can go into overtime (negative hours)
                // This is allowed - player can push themselves
                if (allowDebt) {
                    // Message events can force player into debt
                    member.hours = newHours;
                } else {
                    // Regular work: player can willingly go into overtime
                    member.hours = newHours;
                    
                    // Check if just crossed into overtime (first time this week)
                    if (currentHours >= 0 && newHours < 0 && !member.overtimeWarningShown) {
                        member.overtimeWarningShown = true;
                        // Small morale hit for entering overtime
                        if (member.morale && typeof member.morale.current === 'number') {
                            member.morale.current = Math.max(0, member.morale.current - 2);
                        }
                    }
                }
            } else {
                // WORKERS: Cannot go into overtime - stop at 0 hours
                if (newHours < 0) {
                    // Only deduct what's available, then stop
                    actualHoursDeducted = currentHours;
                    newHours = 0;
                    
                    // Morale penalty for running out of hours before week ends
                    // This represents feeling overworked/exhausted
                    // BUG FIX #1: Only apply penalty ONCE when crossing from positive to 0
                    if (currentHours > 0 && !member.outOfHoursWarningShown && window.GameState.currentDay < 7) {
                        member.outOfHoursWarningShown = true;
                        if (member.morale && typeof member.morale.current === 'number') {
                            const moralePenalty = 5; // Significant penalty
                            member.morale.current = Math.max(0, member.morale.current - moralePenalty);
                            console.log(`${member.name} ran out of hours! Morale -${moralePenalty}`);
                        }
                    }
                }
                member.hours = newHours;
            }
            
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
                
                // Use centralized burnout calculation (5% per hour)
                if (window.calculateOvertimeBurnout && hoursInOvertime > 0) {
                    window.calculateOvertimeBurnout(member.id, hoursInOvertime);
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
        // BUG FIX #3: Check for Friday BEFORE advancing day
        if (window.GameState.currentHour >= 18) {
            // Check if it's Friday (Day 5) BEFORE advancing to next day
            if (window.GameState.currentDay === 5) {
                // Friday evening - show weekend choice modal
                window.GameState.currentHour = 18;
                window.GameState.currentMinute = 0;
                
                // Show weekend modal
                if (window.showWeekendChoiceModal) {
                    window.showWeekendChoiceModal();
                }
                
                // Save state and return (weekend choice will advance to Monday)
                window.saveState();
                return;
            }
            
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

                window.resetWeeklyHours = window.resetWeeklyHours || function() {
                    window.GameState.team.forEach(member => {
                        member.hours = 40;
                        member.hoursWorkedThisWeek = 0;
                        // Reset overtime flags for new week
                        member.overtimeWarningShown = false;
                        member.outOfHoursWarningShown = false;
                    });
                };
                window.resetWeeklyHours();
                window.updateGamePhase && window.updateGamePhase();
                window.triggerScriptedEvents && window.triggerScriptedEvents();
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
        deductHoursFromTeam,
        pauseGame,
        resumeGame,
        togglePause,
        isGamePaused
    };
})();

// Expose on window
window.startGameTimer = TimerModule.startGameTimer;
window.stopGameTimer = TimerModule.stopGameTimer;
window.pauseTimer = TimerModule.pauseTimer;
window.resumeTimer = TimerModule.resumeTimer;
window.isTimerRunning = TimerModule.isTimerRunning;
window.advanceTimeByHours = TimerModule.advanceTimeByHours;
window.pauseGame = TimerModule.pauseGame;
window.resumeGame = TimerModule.resumeGame;
window.togglePause = TimerModule.togglePause;
window.isGamePaused = TimerModule.isGamePaused;

