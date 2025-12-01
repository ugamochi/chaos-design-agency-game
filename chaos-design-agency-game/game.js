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
            window.GameState.team = window.AllTeamMembers.map(member => ({
                ...member,
                currentAssignment: null,
                daysOnAssignment: 0,
                lowMoraleTriggered: false,
                highMoraleTriggered: false,
                hours: 8
            }));
        }
        
        window.GameState.team.forEach(member => {
            if (member.hours === undefined || member.hours === null) {
                member.hours = 8;
            }
        });

        if (window.GameState.projects.length === 0) {
            seedInitialProjects();
        }

        window.GameState.projects.forEach(project => window.updateProjectSatisfaction(project));

        window.checkForConversations();
        window.displayGameState();
        window.setupEventListeners();
        window.initTutorial();
    }

    function seedInitialProjects() {
        const techcorpTemplate = window.AllProjectTemplates.find(t => t.id === 'techcorp_web');
        const startupxTemplate = window.AllProjectTemplates.find(t => t.id === 'startupx_branding');

        window.GameState.projects = [
            window.buildProjectFromTemplate(techcorpTemplate || {}, {
                id: 'proj-001',
                progress: 0.6,
                weeksRemaining: techcorpTemplate?.totalWeeks || 7
            }),
            window.buildProjectFromTemplate(startupxTemplate || {}, {
                id: 'proj-002',
                progress: 0.3,
                weeksRemaining: startupxTemplate?.totalWeeks || 9
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

        window.GameState.currentDay++;
        window.advanceClock();
        
        resetDailyHours();

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

        window.checkForIllness();
        window.updateTeamMorale();
        window.updateProjects();
        window.checkTeamEvents();
        checkFailureConditions();
        window.checkForConversations();
        window.checkForContextualTips();

        if (window.GameState.currentDay === 7) {
            window.checkTeamPulse();
            processWeeklyCosts();
            setTimeout(() => window.showWeekSummary(), 500);
            window.generateWeeklyClientFeedback();
        }

        window.checkProjectDeadlines();
        updateGameStats();
        window.displayGameState();
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
        const teamSize = window.GameState.team.filter(m => m.id !== 'player' && (!m.hasQuit || m.hasQuit === false)).length;
        const weeklyCosts = teamSize * 600 + 300;
        
        window.GameState.money -= weeklyCosts;
        
        window.GameState.conversationHistory.push({
            title: 'Weekly Costs',
            message: `Payroll and overhead: -$${weeklyCosts.toLocaleString()}`,
            type: 'info',
            timestamp: `Week ${window.GameState.currentWeek}`
        });
        
        if (window.GameState.money < 1000 && window.GameState.money > 0) {
            window.recordKeyMoment('Low on Cash', 'Running dangerously low on funds', 'crisis');
        }
    }

    function resetDailyHours() {
        window.GameState.team.forEach(member => {
            member.hours = 8;
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
window.resetDailyHours = GameModule.resetDailyHours;
window.handleGameEnd = GameModule.handleGameEnd;

document.addEventListener('DOMContentLoaded', () => {
    GameModule.initGame();
});
