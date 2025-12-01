// Agency Chaos Simulator - Orchestration Logic

const GameModule = (function() {
    'use strict';

    async function initGame() {
        window.setAllConversations(await Utils.loadJson('conversations.json'));
        window.setAllTeamMembers(await Utils.loadJson('characters.json'));
        window.setAllProjectTemplates(await Utils.loadJson('projects.json'));

        console.log('Loaded conversations:', window.AllConversations.length);
        console.log('Loaded team members:', window.AllTeamMembers.length);
        console.log('Loaded project templates:', window.AllProjectTemplates.length);

        const savedState = localStorage.getItem('agencyChaosState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                Object.assign(window.GameState, parsed);
                
                if (!window.GameState.keyMoments) window.GameState.keyMoments = [];
                if (!window.GameState.gameStats) {
                    window.GameState.gameStats = {
                        projectsCompleted: 0,
                        projectsFailed: 0,
                        scopeCreepHandled: 0,
                        teamMemberQuits: 0,
                        deadlinesMissed: 0,
                        perfectDeliveries: 0,
                        totalSatisfactionPoints: 0,
                        highestMorale: window.GameState.teamMorale || 75,
                        lowestMorale: window.GameState.teamMorale || 75
                    };
                }
                if (!window.GameState.gamePhase) window.GameState.gamePhase = 'tutorial';
                if (typeof window.GameState.gameOver !== 'boolean') window.GameState.gameOver = false;
                if (window.GameState.victoryPath === undefined) window.GameState.victoryPath = null;
                
                console.log('Game state loaded from localStorage');
            } catch (error) {
                console.error('Error loading saved state:', error);
                window.resetToDefaultState();
            }
        } else {
            window.resetToDefaultState();
        }

        if (window.GameState.projects.length > 0) {
            window.GameState.projects = window.GameState.projects.map(project => window.hydrateProject(project));
        }

        if (window.GameState.team.length === 0 && window.AllTeamMembers.length > 0) {
            initializeRandomTeam();
        }
        
        window.GameState.team.forEach(member => {
            if (member.hours === undefined || member.hours === null) {
                member.hours = 40;
            }
            if (member.id === 'player' && (member.burnout === undefined || member.burnout === null)) {
                member.burnout = 0;
            }
            if (member.hoursWorkedToday !== undefined) {
                member.hoursWorkedThisWeek = member.hoursWorkedToday || 0;
                delete member.hoursWorkedToday;
            }
            if (member.hoursWorkedThisWeek === undefined) {
                member.hoursWorkedThisWeek = 0;
            }
        });
        
        if (window.GameState.currentDay === 1) {
            resetWeeklyHours();
        }

        if (window.GameState.projects.length === 0) {
            seedInitialProjects();
        }

        window.GameState.projects.forEach(project => window.updateProjectSatisfaction(project));

        window.currentConversation = null;
        window.selectedChoiceId = null;
        window.currentConversationStartTime = null;
        window.currentConversationMeta = null;

        window.checkForConversations();
        window.displayGameState();
        if (window.OfficeVisualization && window.OfficeVisualization.init) {
            window.OfficeVisualization.init();
        }
        window.setupEventListeners();
        window.initTutorial();
        
        // Start real-time game timer (1 hour = 1 second)
        if (window.startGameTimer) {
            window.startGameTimer();
        }
    }

    function initializeRandomTeam() {
        const allMembers = window.AllTeamMembers || [];
        const player = allMembers.find(m => m.id === 'player');
        const availableWorkers = allMembers.filter(m => m.id !== 'player');
        
        if (availableWorkers.length === 0) {
            window.GameState.team = player ? [{
                ...player,
                currentAssignment: null,
                daysOnAssignment: 0,
                lowMoraleTriggered: false,
                highMoraleTriggered: false,
                hours: 40,
                hoursWorkedThisWeek: 0,
                burnout: 0,
                isIll: false,
                hasQuit: false
            }] : [];
            return;
        }
        
        const managers = availableWorkers.filter(m => m.role && m.role.toLowerCase() === 'manager');
        const nonManagers = availableWorkers.filter(m => !m.role || m.role.toLowerCase() !== 'manager');
        
        const team = [];
        if (player) {
            team.push({
                ...player,
                currentAssignment: null,
                daysOnAssignment: 0,
                lowMoraleTriggered: false,
                highMoraleTriggered: false,
                hours: 40,
                hoursWorkedThisWeek: 0,
                burnout: 0,
                isIll: false,
                hasQuit: false
            });
        }
        
        if (managers.length > 0) {
            const shuffledManagers = [...managers].sort(() => Math.random() - 0.5);
            const selectedManager = shuffledManagers[0];
            team.push({
                ...selectedManager,
                currentAssignment: null,
                daysOnAssignment: 0,
                lowMoraleTriggered: false,
                highMoraleTriggered: false,
                hours: 40,
                hoursWorkedThisWeek: 0,
                burnout: undefined,
                isIll: false,
                hasQuit: false
            });
        }
        
        const remainingSlots = 4 - team.length;
        if (remainingSlots > 0 && nonManagers.length > 0) {
            const shuffledNonManagers = [...nonManagers].sort(() => Math.random() - 0.5);
            const numToSelect = Math.min(remainingSlots, nonManagers.length);
            const selectedWorkers = shuffledNonManagers.slice(0, numToSelect);
            
            selectedWorkers.forEach(member => {
                team.push({
                    ...member,
                    currentAssignment: null,
                    daysOnAssignment: 0,
                    lowMoraleTriggered: false,
                    highMoraleTriggered: false,
                    hours: 40,
                    hoursWorkedThisWeek: 0,
                    burnout: undefined,
                    isIll: false,
                    hasQuit: false
                });
            });
        }
        
        window.GameState.team = team;
        
        const Logger = window.Logger || console;
        Logger.log(`Initialized team with ${team.length} members:`, team.map(m => m.name).join(', '));
    }

    function seedInitialProjects() {
        const techcorpTemplate = Array.isArray(window.AllProjectTemplates) 
            ? window.AllProjectTemplates.find(t => t && t.id === 'techcorp_web')
            : null;
        const startupxTemplate = Array.isArray(window.AllProjectTemplates)
            ? window.AllProjectTemplates.find(t => t && t.id === 'startupx_branding')
            : null;

        const techcorpWeeks = techcorpTemplate?.totalWeeks || 7;
        const startupxWeeks = startupxTemplate?.totalWeeks || 9;

        window.GameState.projects = [
            window.buildProjectFromTemplate(techcorpTemplate || {}, {
                id: 'proj-001',
                progress: 0.6,
                totalWeeks: techcorpWeeks,
                weeksRemaining: techcorpWeeks
            }),
            window.buildProjectFromTemplate(startupxTemplate || {}, {
                id: 'proj-002',
                progress: 0.3,
                totalWeeks: startupxWeeks,
                weeksRemaining: startupxWeeks
            })
        ].map(project => window.hydrateProject(project));
    }

    function advanceDay() {
        if (window.currentConversation !== null) {
            window.pulseElement('.conversation-container');
            window.showWarningToast('⏸️ Please respond to the active conversation before advancing time', 3000);
            return;
        }
        
        if (window.GameState.gameOver) {
            return;
        }

        const feedbackElement = document.getElementById('currentConsequenceFeedback');
        if (feedbackElement) {
            feedbackElement.classList.add('fade-out');
            setTimeout(() => feedbackElement.remove(), 300);
        }

        // With real-time timer, manually advance by 8 hours (full work day)
        // This is a manual override option
        if (window.advanceTimeByHours) {
            window.advanceTimeByHours(8);
            window.showInfoToast('⏩ Manually advanced 8 hours', 2000);
            return;
        }

        // Fallback if timer not available
        window.GameState.currentDay++;
        window.advanceClock();

        if (window.GameState.currentDay > 7) {
            window.GameState.currentDay = 1;
            window.GameState.currentWeek++;
            window.GameState.currentHour = 9; // Reset to 9 AM on new week

            if (window.GameState.currentWeek > 12) {
                handleGameEnd('victory');
                return;
            }

            updateGamePhase();
            triggerScriptedEvents();
        }

        window.purgeDeferredConversations();

        const previousWeek = window.GameState.currentWeek - (window.GameState.currentDay === 1 ? 1 : 0);
        const isNewWeek = window.GameState.currentDay === 1;
        
        if (isNewWeek) {
            resetWeeklyHours();
        } else {
            resetDailyHours();
        }
        
        window.checkForIllness();
        
        window.updateProjects();
        window.updatePlayerBurnout();
        window.updateTeamMorale();
        
        window.displayGameState();
        window.checkTeamEvents();
        checkFailureConditions();
        window.checkConditionalConversations();
        window.checkForConversations();
        window.checkForContextualTips();

        if (window.GameState.currentDay === 7) {
            window.checkTeamPulse();
            processWeeklyCosts(); // Keep for backward compatibility
            setTimeout(() => window.showWeekSummary(), 500);
            window.generateWeeklyClientFeedback();
        }
        
        // Process monthly salaries at the start of each new month (day 1 of weeks 1, 5, 9)
        if (window.GameState.currentDay === 1) {
            processMonthlySalaries();
        }

        window.checkProjectDeadlines();
        updateGameStats();
        window.saveState();

        console.log(`Day advanced: Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`);
    }

    function updateGamePhase() {
        if (window.GameState.currentWeek <= 2) {
            window.GameState.gamePhase = 'tutorial';
        } else if (window.GameState.currentWeek <= 5) {
            window.GameState.gamePhase = 'early';
        } else if (window.GameState.currentWeek <= 9) {
            window.GameState.gamePhase = 'mid';
        } else {
            window.GameState.gamePhase = 'late';
        }
    }

    function triggerScriptedEvents() {
        if (window.GameState.currentWeek === 3 && window.GameState.currentDay === 1) {
            window.recordKeyMoment('Early Growing Pains', 'First real test of agency management', 'milestone');
        }
        
        if (window.GameState.currentWeek === 5 && window.GameState.currentDay === 1) {
            window.recordKeyMoment('Mid-Point Push', 'Halfway through the gauntlet', 'milestone');
        }
        
        if (window.GameState.currentWeek === 10 && window.GameState.currentDay === 1) {
            window.recordKeyMoment('Final Stretch', 'The home stretch begins', 'milestone');
        }
    }

    function checkFailureConditions() {
        if (window.GameState.money < -5000) {
            handleGameEnd('bankruptcy');
            return true;
        }

        const player = window.GameState.team.find(m => m.id === 'player');
        if (player && (player.burnout || 0) >= 100) {
            handleGameEnd('player_burnout');
            return true;
        }

        const activeMembersCount = window.GameState.team.filter(m => 
            m.id !== 'player' && m.morale.current >= 10
        ).length;
        
        if (activeMembersCount === 0 && window.GameState.team.length > 1) {
            handleGameEnd('team_quit');
            return true;
        }

        const teamBurnout = window.GameState.team.filter(m => 
            m.id !== 'player' && m.morale.current < 10
        ).length;
        
        if (teamBurnout >= Math.max(2, window.GameState.team.length - 1)) {
            handleGameEnd('burnout');
            return true;
        }

        return false;
    }

    function updateGameStats() {
        if (window.GameState.teamMorale > window.GameState.gameStats.highestMorale) {
            window.GameState.gameStats.highestMorale = window.GameState.teamMorale;
        }
        if (window.GameState.teamMorale < window.GameState.gameStats.lowestMorale) {
            window.GameState.gameStats.lowestMorale = window.GameState.teamMorale;
        }
    }

    function calculateVictoryPath() {
        const stats = window.GameState.gameStats;
        const completedProjects = stats.projectsCompleted;
        const money = window.GameState.money;
        const avgSatisfaction = completedProjects > 0 
            ? stats.totalSatisfactionPoints / completedProjects 
            : 0;
        const morale = window.GameState.teamMorale;

    if (completedProjects >= 5 && money >= 25000 && avgSatisfaction >= 75 && morale >= 70) {
        return 'rockstar';
    }
    
    if (completedProjects >= 3 && money >= 10000 && avgSatisfaction >= 60 && morale >= 50) {
        return 'professional';
    }
    
    if (completedProjects >= 2 && money >= 2000) {
        return 'survivor';
    }
    
    return 'struggled';
}

    function calculateScore() {
        const stats = window.GameState.gameStats;
        let score = 0;

        score += stats.projectsCompleted * 1000;
        score += Math.max(0, window.GameState.money) / 10;
        score += (stats.totalSatisfactionPoints / Math.max(1, stats.projectsCompleted)) * 10;
        score += window.GameState.teamMorale * 5;
        
        score += stats.perfectDeliveries * 500;
        score += stats.scopeCreepHandled * 200;
        
        score -= stats.projectsFailed * 800;
        score -= stats.deadlinesMissed * 400;
        score -= stats.teamMemberQuits * 600;

        const weekBonus = (12 - window.GameState.currentWeek) * 100;
        score += Math.max(0, weekBonus);

        return Math.round(Math.max(0, score));
    }

    function getRankTitle(victoryPath, score) {
    if (victoryPath === 'rockstar') {
        if (score >= 50000) return '🌟 Agency Legend';
        if (score >= 40000) return '🎯 Master Director';
        return '💎 Top Performer';
    }
    
    if (victoryPath === 'professional') {
        if (score >= 30000) return '📈 Solid Professional';
        if (score >= 20000) return '✅ Competent Manager';
        return '👔 Getting By';
    }
    
    if (victoryPath === 'survivor') {
        if (score >= 15000) return '💪 Scrappy Survivor';
        if (score >= 10000) return '🔥 Barely Made It';
        return '😅 Still Standing';
    }
    
    return '📉 Struggling Startup';
}

    function getEndGameMessage(endReason, victoryPath) {
    if (endReason === 'bankruptcy') {
        return 'The agency ran out of money. Sometimes the best lessons come from failure. Try managing your budget more carefully next time!';
    }
    
    if (endReason === 'player_burnout') {
        return 'You\'ve reached complete burnout. You can\'t keep pushing yourself indefinitely - rest and recovery are essential. Take better care of yourself next time!';
    }
    
    if (endReason === 'team_quit') {
        return 'Your entire team quit. Remember: happy team, happy agency. Pay attention to morale and don\'t overwork your people!';
    }
    
    if (endReason === 'burnout') {
        return 'Team burnout caused a complete collapse. This is a people business - take care of your team or lose everything.';
    }

    if (victoryPath === 'rockstar') {
        return 'Incredible! You didn\'t just survive - you thrived. Your agency is the talk of the industry. Clients love you, your team is energized, and you\'re profitable. This is what excellence looks like!';
    }
    
    if (victoryPath === 'professional') {
        return 'Well done! You ran a solid agency. Good client relationships, decent profits, and a team that didn\'t hate you. That\'s honestly better than most agencies manage. You should be proud!';
    }
    
    if (victoryPath === 'survivor') {
        return 'You made it through 12 weeks without catastrophic failure. That\'s... something! It was messy, chaotic, and barely held together - but you survived. Welcome to agency life!';
    }
    
    return 'You struggled through, but didn\'t quite hit the mark. Every agency has rough patches - learn from this and come back stronger!';
}

    function processWeeklyCosts() {
        // Keep for backward compatibility, but now we use monthly salaries
        // This function is deprecated but kept to avoid breaking changes
    }

    function processMonthlySalaries() {
        // Pay salaries starting from week 5, then every 4 weeks (weeks 5, 9)
        // Calculate which payroll period we're in (0 = week 5, 1 = week 9, etc.)
        const payrollPeriod = window.GameState.currentWeek >= 5 
            ? Math.floor((window.GameState.currentWeek - 5) / window.GameConstants.WEEKS_PER_MONTH)
            : -1;
        const lastPayrollPeriod = window.GameState.lastSalaryMonth || -1;
        
        // Pay salaries at the start of each payroll period (weeks 5, 9) on day 1
        // Skip if we're before week 5
        if (payrollPeriod >= 0 && payrollPeriod > lastPayrollPeriod && window.GameState.currentDay === 1) {
            const teamSize = window.GameState.team.filter(m => m.id !== 'player' && (!m.hasQuit || m.hasQuit === false)).length;
            const monthlySalary = teamSize * window.GameConstants.MONTHLY_SALARY_PER_MEMBER;
            const monthlyOverhead = window.GameConstants.MONTHLY_OVERHEAD;
            const totalMonthlyCosts = monthlySalary + monthlyOverhead;
            
            window.GameState.money -= totalMonthlyCosts;
            window.GameState.lastSalaryMonth = payrollPeriod;
            
            const employeeNames = window.GameState.team
                .filter(m => m.id !== 'player' && (!m.hasQuit || m.hasQuit === false))
                .map(m => m.name)
                .join(', ');
            
            window.GameState.conversationHistory.push({
                title: 'Monthly Payroll',
                message: `Salaries paid: ${employeeNames ? `-$${monthlySalary.toLocaleString()} (${employeeNames})` : 'No employees'}\nOverhead: -$${monthlyOverhead.toLocaleString()}\nTotal: -$${totalMonthlyCosts.toLocaleString()}`,
                type: 'info',
                timestamp: `Week ${window.GameState.currentWeek}, Payroll Period ${payrollPeriod + 1}`
            });
            
            if (window.GameState.money < 1000 && window.GameState.money > 0) {
                window.recordKeyMoment('Low on Cash', 'Running dangerously low on funds', 'crisis');
            }
            
            if (totalMonthlyCosts > 0) {
                window.showWarningToast(`💰 Monthly payroll: -$${totalMonthlyCosts.toLocaleString()}`, 4000);
            }
        }
    }

    function resetWeeklyHours() {
        window.GameState.team.forEach(member => {
            const previousWeekDeficit = member.hours < 0 ? member.hours : 0;
            member.hours = 40 + previousWeekDeficit;
            member.hoursWorkedThisWeek = 0;
            member._hoursDeductedToday = false;
        });
    }
    
    function resetDailyHours() {
        window.GameState.team.forEach(member => {
            member._hoursDeductedToday = false;
        });
    }

    function handleGameEnd(endReason = 'victory') {
        window.GameState.gameOver = true;
        
        if (endReason === 'victory') {
            window.recordKeyMoment('12 Weeks Complete!', 'Finished the full agency simulation', 'victory');
            window.GameState.victoryPath = calculateVictoryPath();
            window.celebrateVictory(window.GameState.victoryPath);
        } else {
            window.GameState.victoryPath = 'failed';
            window.screenShake('heavy');
        }
        
        const score = calculateScore();
        const rank = getRankTitle(window.GameState.victoryPath, score);
        const message = getEndGameMessage(endReason, window.GameState.victoryPath);
        
        window.saveGameAttempt(endReason, window.GameState.victoryPath, score, rank);
        
        setTimeout(() => {
            window.showEndGameScreen(endReason, window.GameState.victoryPath, score, rank, message);
        }, 500);
        
        window.saveState();
    }

    return {
        initGame,
        advanceDay,
        seedInitialProjects,
        updateGamePhase,
        triggerScriptedEvents,
        checkFailureConditions,
        updateGameStats,
        calculateVictoryPath,
        calculateScore,
        getRankTitle,
        getEndGameMessage,
        processWeeklyCosts,
        processMonthlySalaries,
        resetDailyHours,
        handleGameEnd
    };
})();

// Expose on window for backward compatibility
window.initGame = GameModule.initGame;
window.advanceDay = GameModule.advanceDay;
window.seedInitialProjects = GameModule.seedInitialProjects;
window.updateGamePhase = GameModule.updateGamePhase;
window.triggerScriptedEvents = GameModule.triggerScriptedEvents;
window.checkFailureConditions = GameModule.checkFailureConditions;
window.updateGameStats = GameModule.updateGameStats;
window.calculateVictoryPath = GameModule.calculateVictoryPath;
window.calculateScore = GameModule.calculateScore;
window.getRankTitle = GameModule.getRankTitle;
window.getEndGameMessage = GameModule.getEndGameMessage;
window.processWeeklyCosts = GameModule.processWeeklyCosts;
window.processMonthlySalaries = GameModule.processMonthlySalaries;
window.resetDailyHours = GameModule.resetDailyHours;
window.resetWeeklyHours = GameModule.resetWeeklyHours;
window.handleGameEnd = GameModule.handleGameEnd;

document.addEventListener('DOMContentLoaded', () => {
    GameModule.initGame();
});
