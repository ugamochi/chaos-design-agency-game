// Project and team management logic
// BURNOUT RULE: Never write to member.burnout directly!
// ALWAYS use adjustBurnout() from state.js

const ProjectsModule = (function() {
    'use strict';

    function checkForIllness() {
        window.GameState.team.forEach(member => {
            if (member.id === 'player') return;
            
            if (member.isIll) {
                member.isIll = false;
                member.hours = Math.min(40, (member.hours || 40) + 8);
                return;
            }

            const characteristics = member.characteristics || {};
            let illnessChance = characteristics.oftenGetsIll ? 0.12 : 0.02;
            
            if (member.morale && typeof member.morale.current === 'number') {
                if (member.morale.current < 30) {
                    illnessChance += 0.05;
                }
                if (member.morale.current < 20) {
                    illnessChance += 0.05;
                }
            }
            if (member.currentAssignment && member.daysOnAssignment > 10) {
                illnessChance += 0.03;
            }

            if (Math.random() < illnessChance) {
                member.isIll = true;
                member.hours = Math.max(0, (member.hours || 40) - 8);
                
                window.showIllnessPopup(member);
                
                window.GameState.conversationHistory.push({
                    title: `${member.name} is Ill`,
                    message: `${member.name} called in sick today. They won't be able to work on projects.`,
                    type: 'warning',
                    timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                });
            }
        });
    }

    function showIllnessPopup(member) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>😷 ${member.name} is Ill</h2>
            <p>${member.name} called in sick today and won't be able to work on projects.</p>
            <p style="color: #666; font-size: 0.9rem;">They've lost 8 hours for today.</p>
            <button class="btn btn-primary">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.querySelector('button').addEventListener('click', () => {
        modal.remove();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

    function updatePlayerBurnout() {
        const player = window.GameState.team.find(m => m.id === 'player');
        if (!player) return;

        if (player.burnout === undefined || player.burnout === null) {
            player.burnout = 0;
        }

        // Scale changes to tick rate: timer ticks every 0.1 hours, work day is 8 hours
        // So we need to scale daily changes by (0.1 / 8) = 0.0125
        const HOURS_PER_TICK = 0.1;
        const HOURS_PER_DAY = 8;
        const tickMultiplier = HOURS_PER_TICK / HOURS_PER_DAY; // 0.0125

        let burnoutChange = 0;

        // BASE STRESS: Just existing and working creates stress (urgency for 12-week game)
        // This ensures burnout builds up even with minimal work
        burnoutChange += 0.5;

        // FIX: Check phase-specific assignments instead of legacy project.teamAssigned
        // Count projects where player is assigned to any phase
        let assignedProjects = 0;
        let crisisProjects = 0;
        window.GameState.projects.forEach(project => {
            if (!project.phases) return;
            let playerAssignedToThisProject = false;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes('player')) {
                    playerAssignedToThisProject = true;
                }
            });
            if (playerAssignedToThisProject) {
                assignedProjects++;
                if (project.status === 'crisis') {
                    crisisProjects++;
                }
            }
        });

        // INCREASED RATES: 3x multiplier for urgency (game is only 12 weeks)
        if (assignedProjects > 0) {
            burnoutChange += assignedProjects * 6; // Was 2, now 6 (3x)
        }

        // More punishing for low hours (exhaustion)
        if (player.hours < 4) {
            burnoutChange += 2; // Was 1, now 2 (2x)
        } else if (player.hours < 6) {
            burnoutChange += 1; // Moderate exhaustion
        }
        if (crisisProjects > 0) {
            burnoutChange += crisisProjects * 9; // Was 3, now 9 (3x)
        }

        // Low morale is more stressful
        if (window.GameState.teamMorale < 50) {
            burnoutChange += 2; // Was 1, now 2 (2x)
        } else if (window.GameState.teamMorale < 70) {
            burnoutChange += 0.5; // Moderate stress from low morale
        }

        // NOTE: Burnout reduction ONLY happens through conversation choices, not automatically
        // Removed automatic rest-based burnout reduction - burnout should only decrease
        // through specific conversation decisions

        // Scale the change to tick rate
        burnoutChange *= tickMultiplier;
        
        // Use centralized burnout adjustment
        if (window.adjustBurnout && Math.abs(burnoutChange) > 0.001) {
            window.adjustBurnout(player.id, burnoutChange, 'Project work stress');
        }

        // Check for burnout threshold events (checkBurnoutThresholds handles 60% and 80% warnings)
        if (player.burnout >= 80 && !player.highBurnoutTriggered) {
            window.recordKeyMoment('Art Director Burnout Warning', 'You\'re experiencing severe burnout. This is affecting your team and decision-making.', 'crisis');
            player.highBurnoutTriggered = true;
        } else if (player.burnout < 70) {
            player.highBurnoutTriggered = false;
        }
    }

    function updateTeamMorale() {
        const player = window.GameState.team.find(m => m.id === 'player');
        const playerBurnout = player ? (player.burnout || 0) : 0;

        // Scale changes to tick rate: timer ticks every 0.1 hours, work day is 8 hours
        const HOURS_PER_TICK = 0.1;
        const HOURS_PER_DAY = 8;
        const tickMultiplier = HOURS_PER_TICK / HOURS_PER_DAY; // 0.0125

        window.GameState.team.forEach(member => {
        if (member.id === 'player') return;

        if (typeof member.lowMoraleTriggered !== 'boolean') {
            member.lowMoraleTriggered = false;
        }
        if (typeof member.highMoraleTriggered !== 'boolean') {
            member.highMoraleTriggered = false;
        }

        const characteristics = member.characteristics || {};
        
        if (characteristics.doesNotLoseMorale) {
            if (member.currentAssignment) {
                // Only increment days on assignment once per day, not per tick
                // Track this separately or check if we've crossed a day boundary
                if (!member._lastDayCheck || member._lastDayCheck !== window.GameState.currentDay) {
                    member.daysOnAssignment++;
                    member._lastDayCheck = window.GameState.currentDay;
                }
            }
            return;
        }

        let moraleChange = 0;

        if (member.currentAssignment && member.daysOnAssignment > 10 && member.morale && member.morale.modifiers) {
            moraleChange += member.morale.modifiers.overworked || -5;
        }

        if (playerBurnout > 50) {
            const burnoutPenalty = Math.round((playerBurnout - 50) / 10);
            moraleChange -= burnoutPenalty;
        }

        if (!member.currentAssignment && !member.isIll) {
            moraleChange -= 2;
        }

        // Scale the change to tick rate
        moraleChange *= tickMultiplier;
        window.adjustMemberMorale(member, moraleChange);
        
        if (member.morale && typeof member.morale.current === 'number') {
            const gradualDecay = -0.5 * tickMultiplier;
            window.adjustMemberMorale(member, gradualDecay);
        }

        if (member.currentAssignment) {
            // Only increment days on assignment once per day, not per tick
            if (!member._lastDayCheck || member._lastDayCheck !== window.GameState.currentDay) {
                member.daysOnAssignment++;
                member._lastDayCheck = window.GameState.currentDay;
            }
        }

        if (!member.morale || typeof member.morale.current !== 'number') {
            return;
        }
        
        const currentMorale = member.morale.current;
        if (currentMorale < 25 && !member.lowMoraleTriggered) {
            window.triggerTeamEvent(member, 'low_morale');
            member.lowMoraleTriggered = true;
        } else if (currentMorale >= 30) {
            member.lowMoraleTriggered = false;
        }

        if (currentMorale > 85 && !member.highMoraleTriggered) {
            window.triggerTeamEvent(member, 'high_morale');
            member.highMoraleTriggered = true;
        } else if (currentMorale <= 80) {
            member.highMoraleTriggered = false;
        }
    });
    
        if (player && !player.currentAssignment && !player.isIll) {
            const HOURS_PER_TICK = 0.1;
            const HOURS_PER_DAY = 8;
            const tickMultiplier = HOURS_PER_TICK / HOURS_PER_DAY;
            const playerMoraleChange = -1 * tickMultiplier;
            if (player.morale && typeof player.morale.current === 'number') {
                window.adjustMemberMorale(player, playerMoraleChange);
            }
        }

        window.recalculateTeamMorale();
}

    function getClientProfile(project) {
        return project.clientProfile || window.DEFAULT_CLIENT_PROFILE;
    }

    function updateProjectRisk(project) {
    const risk = project.risk || {};
    const estimatedHours = project.estimatedHours || 25;
    const originalHours = project.originalEstimatedHours || estimatedHours;
    const hoursDelta = estimatedHours - originalHours;
    const hoursDeltaPercent = originalHours ? (hoursDelta / originalHours) * 100 : 0;
    
    if (hoursDeltaPercent >= 30) risk.scope = 'high';
    else if (hoursDeltaPercent >= 10) risk.scope = 'medium';
    else risk.scope = 'low';

    if (project.satisfaction <= 40) risk.satisfaction = 'high';
    else if (project.satisfaction <= 65) risk.satisfaction = 'medium';
    else risk.satisfaction = 'low';

    if (project.weeksRemaining <= 0) risk.timeline = 'high';
    else if (project.weeksRemaining <= 1.5) risk.timeline = 'medium';
    else risk.timeline = 'low';

    // Add scope creep risk
    const scopeCreepCount = project.scopeCreepCount || 0;
    if (scopeCreepCount >= 3) {
        risk.scopeCreep = 'high';
    } else if (scopeCreepCount >= 2) {
        risk.scopeCreep = 'medium';
    } else if (scopeCreepCount >= 1) {
        risk.scopeCreep = 'low';
    } else {
        risk.scopeCreep = 'none';
    }

    risk.scopeLabel = hoursDelta > 0 ? `+${Math.round(hoursDelta)}h` : hoursDelta < 0 ? `${Math.round(hoursDelta)}h` : 'On estimate';
    risk.timelineLabel = project.weeksRemaining <= 0 ? 'Overdue' : `${Math.ceil(project.weeksRemaining)} wk left`;
    risk.satisfactionLabel = `${Math.round(project.satisfaction)}% reputation`;

    project.risk = risk;
}

    function calculateSatisfactionScores(project) {
        const profile = getClientProfile(project);
        const assignedMembers = window.GameState.team.filter(m => 
            (m.assignedProjects && m.assignedProjects.includes(project.id)) || 
            (m.currentAssignment === project.id) // backward compatibility
        );

    const avgSkill = assignedMembers.length
        ? assignedMembers.reduce((sum, m) => {
            let effectiveSkill = m.skill || 1;
            const characteristics = m.characteristics || {};
            if (m.specialProperties && m.specialProperties.efficiencyMultiplier) {
                effectiveSkill *= m.specialProperties.efficiencyMultiplier;
            }
            if (characteristics.qualityMultiplier) {
                effectiveSkill *= characteristics.qualityMultiplier;
            }
            return sum + effectiveSkill;
        }, 0) / assignedMembers.length
        : 2.5;
    const avgMorale = assignedMembers.length
        ? assignedMembers.reduce((sum, m) => sum + (m.morale?.current || 50), 0) / assignedMembers.length
        : window.GameState.teamMorale || 50;
    const designQuality = Math.min(1, (avgSkill / 5) * (avgMorale / 100));

    const expectedProgress = 1 - (project.weeksRemaining / project.totalWeeks);
    const progressDelta = project.progress - expectedProgress;
    const meetingDeadlines = Math.max(0, Math.min(1, 0.5 + progressDelta));

    const responseHours = project.lastResponseHours ?? 24;
    const responsiveness = Math.max(0, Math.min(1, responseHours <= 4 ? 1 : 4 / responseHours));

    const budgetStatus = project.budgetStatus ?? 1;

    return {
        designQuality,
        meetingDeadlines,
        responsiveness,
        stayingInBudget: Math.max(0, Math.min(1, budgetStatus))
    };
}

    function updateProjectSatisfaction(project) {
    const profile = getClientProfile(project);
    const weights = profile.satisfactionFactors;
    const scores = calculateSatisfactionScores(project);

    const satisfaction =
        (scores.designQuality * (weights.designQuality || 0)) +
        (scores.meetingDeadlines * (weights.meetingDeadlines || 0)) +
        (scores.responsiveness * (weights.responsiveness || 0)) +
        (scores.stayingInBudget * (weights.stayingInBudget || 0));

    const normalized = Math.max(0, Math.min(1, satisfaction));
    project.satisfaction = Math.round(normalized * 100);
    updateProjectRisk(project);
}

    function handleScopeCreepRequest(change) {
        if (!change) return;
        const changes = Array.isArray(change) ? change : [change];

        changes.forEach(entry => {
            const project = window.GameState.projects.find(p => p.id === entry.projectId);
            if (!project) return;

            const hoursDelta = entry.hoursDelta !== undefined ? entry.hoursDelta : (entry.delta ? (entry.delta || 0) * 25 : 0);
            if (hoursDelta !== 0) {
                project.estimatedHours = Math.max(10, (project.estimatedHours || 25) + hoursDelta);
                window.GameState.gameStats.scopeCreepHandled++;
            }

            // Track scope creep count per project (for "death by a thousand cuts" trigger)
            // Only increment if there's an actual scope change (delta or hoursDelta)
            if (entry.delta !== undefined || entry.hoursDelta !== undefined) {
                project.scopeCreepCount = (project.scopeCreepCount || 0) + 1;
            }

            if (entry.timelineWeeks) {
                project.totalWeeks += entry.timelineWeeks;
                project.weeksRemaining += entry.timelineWeeks;
            }

            if (entry.budgetDelta) {
                project.budget += entry.budgetDelta;
                // Money will be added to balance when project is completed
            }

            // Apply explicit team stress from scope change entry
            if (entry.teamStress && entry.teamStress !== 0) {
                window.GameState.team
                    .filter(m => (m.assignedProjects && m.assignedProjects.includes(project.id)) || (m.currentAssignment === project.id))
                    .forEach(member => window.adjustMemberMorale(member, entry.teamStress));
                window.recalculateTeamMorale();
            }

            // Automatic team stress when scope creep count reaches 2+ (cumulative stress)
            const scopeCreepCount = project.scopeCreepCount || 0;
            if (scopeCreepCount >= 2) {
                // Additional stress for each scope creep beyond the first
                // More scope creeps = more stress
                const additionalStress = Math.min(5, (scopeCreepCount - 1) * 2); // Max 5 stress per check
                window.GameState.team
                    .filter(m => (m.assignedProjects && m.assignedProjects.includes(project.id)) || (m.currentAssignment === project.id))
                    .forEach(member => {
                        window.adjustMemberMorale(member, -additionalStress);
                    });
                window.recalculateTeamMorale();
            }

            project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
            updateProjectSatisfaction(project);
            updateProjectRisk(project); // Update risk to include scope creep risk
        });
    }

    function generateWeeklyClientFeedback() {
        window.GameState.projects.forEach(project => {
        if (project.status === 'complete') return;
        updateProjectSatisfaction(project);
        const satisfaction = project.satisfaction;
        let message = '';
        let moraleDelta = 0;
        if (satisfaction >= 80) {
            message = `${project.client} loved the latest update!`;
            moraleDelta = 3;
        } else if (satisfaction >= 55) {
            message = `${project.client} says things look fine—keep it up.`;
        } else {
            message = `${project.client} is getting anxious about progress.`;
            moraleDelta = -4;
        }
            window.GameState.conversationHistory.push({
                title: `Client Feedback – ${project.client}`,
                message,
                type: satisfaction >= 80 ? 'success' : (satisfaction < 55 ? 'warning' : 'info'),
                timestamp: `Week ${window.GameState.currentWeek}`
            });
            if (moraleDelta !== 0) {
                window.GameState.team
                    .filter(m => (m.assignedProjects && m.assignedProjects.includes(project.id)) || (m.currentAssignment === project.id))
                    .forEach(member => window.adjustMemberMorale(member, moraleDelta));
                window.recalculateTeamMorale();
            }
        });
    }

    function cloneClientProfile(profile = window.DEFAULT_CLIENT_PROFILE) {
        return Utils.cloneObject(profile);
    }

    function calculatePhaseHours(complexity, phaseType) {
        const multipliers = {
            management: 3,
            design: 4,
            development: 5,
            review: 3
        };
        return complexity * (multipliers[phaseType] || 3);
    }

    function createPhaseStructure(complexity) {
        return {
            management: {
                progress: 0,
                status: 'active',
                hoursRequired: calculatePhaseHours(complexity, 'management'),
                hoursCompleted: 0,
                teamAssigned: [],
                freelancerHired: false
            },
            design: {
                progress: 0,
                status: 'waiting',
                hoursRequired: calculatePhaseHours(complexity, 'design'),
                hoursCompleted: 0,
                teamAssigned: [],
                freelancerHired: false
            },
            development: {
                progress: 0,
                status: 'waiting',
                hoursRequired: calculatePhaseHours(complexity, 'development'),
                hoursCompleted: 0,
                teamAssigned: [],
                freelancerHired: false
            },
            review: {
                progress: 0,
                status: 'waiting',
                hoursRequired: calculatePhaseHours(complexity, 'review'),
                hoursCompleted: 0,
                teamAssigned: [],
                freelancerHired: false
            }
        };
    }

    function getEfficiencyForPhase(member, phaseName) {
        if (!member || !member.role) return 0.6;
        
        const role = member.role.toLowerCase();
        
        // Art Director: 90% on everything
        if (role === 'art director') {
            return 0.9;
        }
        
        // Primary role matches: 100%
        if ((role === 'manager' && phaseName === 'management') ||
            (role === 'manager' && phaseName === 'review') ||
            (role === 'designer' && phaseName === 'design') ||
            (role === 'developer' && phaseName === 'development')) {
            return 1.0;
        }
        
        // Cross-role work: 60%
        return 0.6;
    }

    function canStartPhase(project, phaseName) {
        if (!project.phases) return false;
        
        const phases = project.phases;
        
        switch (phaseName) {
            case 'management':
                return true; // Always can start
            case 'design':
                return phases.management.progress >= 0.6; // Can start at 60% management
            case 'development':
                return phases.design.progress >= 0.8; // Can start at 80% design
            case 'review':
                return phases.development.progress >= 1.0; // Requires 100% development
            default:
                return false;
        }
    }

    function getPhaseStatus(project, phaseName) {
        if (!project.phases || !project.phases[phaseName]) {
            return 'waiting';
        }
        
        const phase = project.phases[phaseName];
        
        if (phase.progress >= 1.0) {
            return 'complete';
        }
        
        if (canStartPhase(project, phaseName)) {
            return phase.progress > 0 ? 'active' : 'ready';
        }
        
        return 'waiting';
    }

    function buildProjectFromTemplate(template = {}, overrides = {}) {
        const profile = cloneClientProfile(template.clientProfile || window.DEFAULT_CLIENT_PROFILE);
        const oldComplexity = overrides.complexity ?? template.complexity ?? 1;
        
        // Calculate phase hours (faster pacing: complexity × 15 total instead of × 25)
        const phaseHours = {
            management: calculatePhaseHours(oldComplexity, 'management'),
            design: calculatePhaseHours(oldComplexity, 'design'),
            development: calculatePhaseHours(oldComplexity, 'development'),
            review: calculatePhaseHours(oldComplexity, 'review')
        };
        const totalPhaseHours = phaseHours.management + phaseHours.design + phaseHours.development + phaseHours.review;
        
        // Shorter timelines: 2-6 weeks instead of 6-11
        const weeksByComplexity = Math.max(2, Math.min(6, oldComplexity + 1));
        const totalWeeks = overrides.totalWeeks ?? template.totalWeeks ?? weeksByComplexity;
        
        // Legacy fields for backward compatibility
        const estimatedHours = overrides.estimatedHours ?? totalPhaseHours;
        const hoursCompleted = overrides.hoursCompleted ?? 0;

        // Create phases structure
        const phases = overrides.phases ?? createPhaseStructure(oldComplexity);

        return {
            id: overrides.id || template.id || `proj-${Date.now()}`,
            name: overrides.name || template.name || 'Project',
            client: overrides.client || template.client || 'Client',
            type: overrides.type || template.type || 'custom',
            budget: overrides.budget ?? template.budget ?? 5000,
            complexity: oldComplexity,
            totalWeeks,
            weeksRemaining: overrides.weeksRemaining ?? totalWeeks,
            estimatedHours,
            originalEstimatedHours: overrides.originalEstimatedHours ?? estimatedHours,
            hoursCompleted,
            description: overrides.description || template.description || '',
            requiredSkills: overrides.requiredSkills || template.requiredSkills || [],
            baseClientSatisfaction: template.baseClientSatisfaction || 0.75,
            progress: overrides.progress ?? (hoursCompleted / estimatedHours),
            status: overrides.status || 'active',
            teamAssigned: overrides.teamAssigned || [],
            satisfaction: overrides.satisfaction ?? Math.round((template.baseClientSatisfaction || 0.75) * 100),
            clientProfile: profile,
            lastResponseHours: 24,
            budgetStatus: 1,
            satisfactionTrend: [],
            risk: {},
            phases: phases,
            ...overrides
        };
    }

    function hydrateProject(project = {}) {
        project.clientProfile = cloneClientProfile(project.clientProfile || window.DEFAULT_CLIENT_PROFILE);
    
        // Initialize complexity if missing
        if (!project.complexity) {
            project.complexity = project.estimatedHours ? Math.ceil(project.estimatedHours / 25) : 1;
        }
    
        // Migrate old projects to phase system if needed
        if (!project.phases) {
            project.phases = createPhaseStructure(project.complexity);
            
            // Distribute existing progress across phases (rough estimate)
            const totalProgress = project.progress || 0;
            if (totalProgress > 0) {
                project.phases.management.progress = Math.min(1, totalProgress * 1.5);
                project.phases.management.status = project.phases.management.progress >= 1 ? 'complete' : 'active';
                
                if (project.phases.management.progress >= 0.6) {
                    project.phases.design.progress = Math.min(1, (totalProgress - 0.4) * 1.2);
                    project.phases.design.status = project.phases.design.progress >= 1 ? 'complete' : 
                                                   (project.phases.design.progress > 0 ? 'active' : 'waiting');
                }
                
                if (project.phases.design.progress >= 0.8) {
                    project.phases.development.progress = Math.min(1, (totalProgress - 0.7) * 1.1);
                    project.phases.development.status = project.phases.development.progress >= 1 ? 'complete' : 
                                                        (project.phases.development.progress > 0 ? 'active' : 'waiting');
                }
                
                if (project.phases.development.progress >= 1) {
                    project.phases.review.progress = Math.min(1, (totalProgress - 0.9) * 2);
                    project.phases.review.status = project.phases.review.progress >= 1 ? 'complete' : 
                                                   (project.phases.review.progress > 0 ? 'active' : 'waiting');
                }
            }
        }
    
        // Ensure phase structure is complete
        if (project.phases) {
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                if (!project.phases[phaseName]) {
                    project.phases[phaseName] = {
                        progress: 0,
                        status: phaseName === 'management' ? 'active' : 'waiting',
                        hoursRequired: calculatePhaseHours(project.complexity, phaseName),
                        hoursCompleted: 0,
                        teamAssigned: [],
                        freelancerHired: false
                    };
                }
            });
        }
    
        if (project.complexity && !project.estimatedHours) {
            // Use phase hours if available, otherwise fall back to old calculation
            if (project.phases) {
                project.estimatedHours = project.phases.management.hoursRequired +
                                      project.phases.design.hoursRequired +
                                      project.phases.development.hoursRequired +
                                      project.phases.review.hoursRequired;
            } else {
                project.estimatedHours = project.complexity * 15; // New faster pacing
            }
        }
        if (!project.estimatedHours) {
            project.estimatedHours = 15; // Default smaller
        }
        if (!project.originalEstimatedHours) {
            project.originalEstimatedHours = project.estimatedHours;
        }
        if (project.hoursCompleted === undefined || project.hoursCompleted === null) {
            project.hoursCompleted = project.progress ? project.progress * project.estimatedHours : 0;
        }
    
        // Update total weeks for faster pacing
        if (!project.totalWeeks || project.totalWeeks > 6) {
            project.totalWeeks = Math.max(2, Math.min(6, (project.complexity || 1) + 1));
        }
        if (!project.weeksRemaining || project.weeksRemaining > project.totalWeeks) {
            project.weeksRemaining = project.totalWeeks;
        }
    
        project.lastResponseHours = project.lastResponseHours ?? 24;
        project.budgetStatus = project.budgetStatus ?? 1;
        project.satisfaction = project.satisfaction ?? Math.round((project.baseClientSatisfaction || 0.75) * 100);
        project.risk = project.risk || {};
        if (!project.teamAssigned || !Array.isArray(project.teamAssigned)) {
            project.teamAssigned = [];
        }
    
        // For phase-based projects, calculate progress from phases
        if (project.phases) {
            const totalPhaseHours = project.phases.management.hoursRequired +
                                 project.phases.design.hoursRequired +
                                 project.phases.development.hoursRequired +
                                 project.phases.review.hoursRequired;
            
            if (totalPhaseHours > 0) {
                // Calculate weighted progress: sum of (phase progress * phase hours) / total hours
                const weightedProgress = (
                    (project.phases.management.progress * project.phases.management.hoursRequired) +
                    (project.phases.design.progress * project.phases.design.hoursRequired) +
                    (project.phases.development.progress * project.phases.development.hoursRequired) +
                    (project.phases.review.progress * project.phases.review.hoursRequired)
                ) / totalPhaseHours;
                
                project.progress = Math.min(1.0, weightedProgress);
                
                // Update hours completed from phases
                project.hoursCompleted = project.phases.management.hoursCompleted +
                                       project.phases.design.hoursCompleted +
                                       project.phases.development.hoursCompleted +
                                       project.phases.review.hoursCompleted;
                project.estimatedHours = totalPhaseHours;
            } else {
                project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
            }
        } else {
            project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
        }
    
        updateProjectRisk(project);
        return project;
    }

    function updatePhaseProgress(project, phaseName, isRealTimeMode = false) {
        if (!project.phases || !project.phases[phaseName]) return;
        
        const phase = project.phases[phaseName];
        const previousProgress = phase.progress || 0;
        const previousStatus = phase.status || 'waiting';
        
        // Skip if already complete
        if (phase.progress >= 1.0) {
            phase.status = 'complete';
            return;
        }
        
        // Update phase status (but don't skip if waiting - we need to check activation)
        const newStatus = getPhaseStatus(project, phaseName);
        
        // Check for phase activation (waiting -> active/ready)
        if (previousStatus === 'waiting' && (newStatus === 'active' || newStatus === 'ready')) {
            triggerPhaseActivation(project, phaseName);
            // No auto-assignment - workers contribute to active phase via project assignment
        }
        
        phase.status = newStatus;
        
        // Skip if phase is waiting or complete
        if (phase.status === 'waiting' || phase.status === 'complete') {
            return;
        }
        
        // Get team members assigned to THIS PHASE specifically
        // Initialize teamAssigned array if it doesn't exist
        if (!phase.teamAssigned) {
            phase.teamAssigned = [];
        }
        
        const assignedMembers = window.GameState.team.filter(m => 
            phase.teamAssigned.includes(m.id) && !m.isIll
        );
        
        if (assignedMembers.length === 0 && !phase.freelancerHired) {
            return; // No one working on this phase
        }
        
        // Base progress rates (faster pacing!)
        const baseProgressRates = {
            management: 2.0,    // 10x faster
            design: 1.5,        // 10x faster
            development: 1.0,   // 10x faster
            review: 1.8         // 10x faster
        };
        const baseProgress = baseProgressRates[phaseName] || 0.10;
        
        // Calculate total efficiency from team
        // Hours are split across ALL assignments (projects + phases) for each worker
        let totalEfficiency = 0;
        const baseWeeklyHours = 40;
        const maxDailyHours = 8; // Max hours per day, but tracked weekly
        
        assignedMembers.forEach(member => {
            if (member.hours === undefined || member.hours === null) {
                member.hours = 40;
            }
            
            // Workers at 0 hours don't contribute (they've exhausted their weekly hours)
            // Player can still work in overtime (negative hours)
            if (member.id !== 'player' && member.hours <= 0) {
                return; // Worker is exhausted, skip their contribution
            }
            
            const efficiency = getEfficiencyForPhase(member, phaseName);
            let skillMultiplier = (member.skill || 1) / 5;
            
            const characteristics = member.characteristics || {};
            if (member.specialProperties && member.specialProperties.efficiencyMultiplier) {
                skillMultiplier *= member.specialProperties.efficiencyMultiplier;
            }
            if (characteristics.workSpeedMultiplier) {
                skillMultiplier *= characteristics.workSpeedMultiplier;
            }
            
            const moraleMultiplier = (member.morale?.current || 50) / 100;
            
            // Count total ACTIVE phase assignments across ALL projects
            // A worker assigned to multiple active phases splits their hours
            let totalActivePhaseAssignments = 0;
            window.GameState.projects.forEach(proj => {
                if (!proj.phases) return;
                ['management', 'design', 'development', 'review'].forEach(phName => {
                    const ph = proj.phases[phName];
                    if (ph && ph.teamAssigned && ph.teamAssigned.includes(member.id)) {
                        const phStatus = window.getPhaseStatus ? window.getPhaseStatus(proj, phName) : ph.status;
                        // Only count active/ready phases (not waiting or complete)
                        if (phStatus === 'active' || phStatus === 'ready') {
                            totalActivePhaseAssignments++;
                        }
                    }
                });
            });
            
            if (totalActivePhaseAssignments === 0) {
                return; // No active assignments, worker sits idle
            }
            
            // Calculate time fraction spent on THIS phase
            // Mike on 1 active phase: 100% time (1.0)
            // Mike on 3 active phases: 33% time per phase (0.33)
            const timeFraction = 1 / totalActivePhaseAssignments;
            
            // TRACK WEEKLY HOURS FOR PAYROLL
            // 0.1 is HOURS_PER_TICK (defined below, but hardcoded here for consistency)
            if (!member.weeklyPhaseHours) member.weeklyPhaseHours = {};
            if (!member.weeklyPhaseHours[phaseName]) member.weeklyPhaseHours[phaseName] = 0;
            member.weeklyPhaseHours[phaseName] += (0.1 * timeFraction);
            
            // Handle overtime penalty for non-players
            let overtimePenalty = 1.0;
            if (member.id !== 'player' && member.hours < 0) {
                overtimePenalty = 0.5; // 50% efficiency in overtime
            }
            
            // Calculate efficiency contribution for THIS phase
            // Based on time fraction, skill, morale, and overtime status
            const efficiencyContribution = efficiency * skillMultiplier * moraleMultiplier * timeFraction * overtimePenalty;
            totalEfficiency += efficiencyContribution;
            
            // Hours are deducted in timer.js ONLY - we just READ them here
            // Timer handles hour deduction, overtime penalties, and hoursWorkedThisWeek tracking
        });
        
        // Add freelancer if hired (1.5x speed, skill 3-5)
        if (phase.freelancerHired) {
            const freelancerSkill = 3 + Math.random() * 2; // 3-5
            const freelancerEfficiency = 1.0; // Freelancers are specialists
            totalEfficiency += freelancerEfficiency * (freelancerSkill / 5) * 1.5; // 1.5x multiplier
        }
        
        // Calculate progress per tick (timer ticks every 0.1 seconds = 0.1 hours)
        // Scale daily progress to tick-based: (0.1 hours / 8 hours per day) = 0.0125
        const HOURS_PER_TICK = 0.1;
        const HOURS_PER_DAY = 8;
        const tickMultiplier = HOURS_PER_TICK / HOURS_PER_DAY; // 0.0125
        const tickProgress = baseProgress * totalEfficiency * tickMultiplier;
        phase.progress = Math.min(1.0, phase.progress + tickProgress);
        
        // Update hours completed
        phase.hoursCompleted = phase.progress * phase.hoursRequired;
        
        // Check for phase completion
        if (phase.progress >= 1.0 && previousProgress < 1.0) {
            phase.status = 'complete';
            phase.progress = 1.0;
            phase.hoursCompleted = phase.hoursRequired;
            triggerPhaseCompletion(project, phaseName);
        }
    }

    function triggerPhaseCompletion(project, phaseName) {
        const phaseLabels = {
            management: 'Management',
            design: 'Design',
            development: 'Development',
            review: 'Review'
        };
        
        const label = phaseLabels[phaseName] || phaseName;
        
        // Add to conversation history
        window.GameState.conversationHistory.push({
            title: `Phase Complete: ${label}`,
            message: `${project.name}: ${label} phase completed! ${phaseName === 'review' ? 'Project ready for delivery.' : 'Ready for next phase.'}`,
            type: 'success',
            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
        });
        
        // Boost satisfaction slightly for completing phases on time
        if (project.weeksRemaining > 0) {
            project.satisfaction = Math.min(100, project.satisfaction + 2);
        }
        
        // Check if next phase can start
        if (phaseName === 'management' && project.phases.design.status === 'waiting') {
            if (canStartPhase(project, 'design')) {
                project.phases.design.status = 'ready';
            }
        } else if (phaseName === 'design' && project.phases.development.status === 'waiting') {
            if (canStartPhase(project, 'development')) {
                project.phases.development.status = 'ready';
            }
        } else if (phaseName === 'development' && project.phases.review.status === 'waiting') {
            if (canStartPhase(project, 'review')) {
                project.phases.review.status = 'ready';
            }
        }
    }

    function triggerPhaseActivation(project, phaseName) {
        const phaseLabels = {
            management: 'Management',
            design: 'Design',
            development: 'Development',
            review: 'Review'
        };
        
        const label = phaseLabels[phaseName] || phaseName;
        
        // Check if this is a risky overlap
        let isRisky = false;
        if (phaseName === 'design' && project.phases.management.progress < 1.0) {
            isRisky = true;
        } else if (phaseName === 'development' && project.phases.design.progress < 1.0) {
            isRisky = true;
        }
        
        if (isRisky) {
            window.GameState.conversationHistory.push({
                title: `⚠️ Risky Phase Overlap`,
                message: `${project.name}: ${label} phase started early. This is faster but risky - may need rework if previous phase changes.`,
                type: 'warning',
                timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
            });
        }
    }

    function updateProjects() {
        // Check if real-time timer is running - if so, skip hour deduction (timer handles it)
        const isRealTimeMode = window.isTimerRunning && window.isTimerRunning();
        
        // Reset hours deduction flag at start of project updates (once per day)
        // Only reset if not in real-time mode (real-time mode doesn't use this flag)
        if (!isRealTimeMode) {
            window.GameState.team.forEach(member => {
                member._hoursDeductedToday = false;
            });
        }
        
        window.GameState.projects.forEach(project => {
        if (project.status === 'active' || project.status === 'ok' || project.status === 'warning' || project.status === 'crisis') {
            // If project has phases, use phase-based system
            if (project.phases) {
                // Update each phase
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    updatePhaseProgress(project, phaseName, isRealTimeMode);
                });
                
                // Calculate overall project progress from phases (weighted by hours required)
                const totalPhaseHours = project.phases.management.hoursRequired +
                                     project.phases.design.hoursRequired +
                                     project.phases.development.hoursRequired +
                                     project.phases.review.hoursRequired;
                
                const completedPhaseHours = project.phases.management.hoursCompleted +
                                          project.phases.design.hoursCompleted +
                                          project.phases.development.hoursCompleted +
                                          project.phases.review.hoursCompleted;
                
                // Calculate weighted progress: sum of (phase progress * phase hours) / total hours
                const weightedProgress = (
                    (project.phases.management.progress * project.phases.management.hoursRequired) +
                    (project.phases.design.progress * project.phases.design.hoursRequired) +
                    (project.phases.development.progress * project.phases.development.hoursRequired) +
                    (project.phases.review.progress * project.phases.review.hoursRequired)
                ) / totalPhaseHours;
                
                project.hoursCompleted = completedPhaseHours;
                project.estimatedHours = totalPhaseHours;
                project.progress = Math.min(1.0, weightedProgress);
                
                // Check if all phases complete
                const allPhasesComplete = project.phases.management.progress >= 1.0 &&
                                        project.phases.design.progress >= 1.0 &&
                                        project.phases.development.progress >= 1.0 &&
                                        project.phases.review.progress >= 1.0;
                
                if (allPhasesComplete) {
                    completeProject(project.id);
                    return;
                }
                
                if (!project._lastWeeksRemainingUpdateDay || project._lastWeeksRemainingUpdateDay !== window.GameState.currentDay) {
                    project.weeksRemaining = Math.max(0, project.weeksRemaining - (1 / 7));
                    project._lastWeeksRemainingUpdateDay = window.GameState.currentDay;
                }
                updateProjectSatisfaction(project);
                return;
            }
            
            // Legacy system (for old projects without phases)
            const assignedMembers = window.GameState.team.filter(m =>
                ((m.assignedProjects && m.assignedProjects.includes(project.id)) || (m.currentAssignment === project.id)) && !m.isIll
            );

            if (assignedMembers.length === 0) {
                updateProjectSatisfaction(project);
                return;
            }

            let statusMultiplier = 1.0;
            if (project.status === 'crisis') {
                statusMultiplier = 0;
            } else if (project.status === 'warning') {
                statusMultiplier = 0.5;
            }

            const playerProjects = window.GameState.projects.filter(p =>
                p.id !== project.id && window.GameState.team.some(m => m.currentAssignment === p.id && m.id === 'player')
            ).length;
            const playerOnMultipleProjects = playerProjects > 0;

            assignedMembers.forEach(member => {
                if (member.hours === undefined || member.hours === null) {
                    member.hours = 40;
                }
                
                let hoursToSpend = 0;
                const baseWeeklyHours = 40;
                const maxDailyHours = 8;
                const hoursWorkedThisWeek = member.hoursWorkedThisWeek || 0;
                const currentHours = member.hours || 0;
                
                if (isRealTimeMode) {
                    // In real-time mode, calculate progress based on hours already worked
                    // Timer ticks every 0.1 seconds (100ms) and advances 0.1 hours per tick
                    // So we should add 0.1 hours of work per tick, not 1.0
                    const HOURS_PER_TICK = 0.1; // Match timer.js HOURS_PER_TICK
                    hoursToSpend = HOURS_PER_TICK * statusMultiplier;
                } else {
                    // Legacy mode: calculate hours to spend based on available hours
                    if (member.id === 'player') {
                        const totalPlayerProjects = playerProjects + 1;
                        // Player can work even with 0 or negative hours (overtime)
                        if (currentHours > 0) {
                            const hoursPerProject = currentHours / totalPlayerProjects;
                            hoursToSpend = Math.min(hoursPerProject, currentHours) * statusMultiplier;
                        } else {
                            // Overtime: player can still work at full efficiency, but gets burnout penalty
                            hoursToSpend = (maxDailyHours / totalPlayerProjects) * statusMultiplier;
                        }
                    } else {
                        const maxHoursToSpend = maxDailyHours * statusMultiplier;
                        if (currentHours > 0) {
                            hoursToSpend = Math.min(currentHours, maxHoursToSpend);
                        } else {
                            hoursToSpend = maxHoursToSpend * 0.5;
                        }
                    }
                }
                
                if (hoursToSpend > 0) {
                    // Hours are deducted in timer.js ONLY - we just READ them here
                    // Timer handles hour deduction, overtime penalties, and hoursWorkedThisWeek tracking
                    const availableHours = member.hours;
                    
                    project.hoursCompleted = (project.hoursCompleted || 0) + hoursToSpend;
                }
            });

            project.hoursCompleted = Math.min(project.hoursCompleted, project.estimatedHours);
            project.progress = project.hoursCompleted / project.estimatedHours;

            if (project.hoursCompleted >= project.estimatedHours) {
                project.progress = 1.0;
                completeProject(project.id);
            }

            if (!project._lastWeeksRemainingUpdateDay || project._lastWeeksRemainingUpdateDay !== window.GameState.currentDay) {
                project.weeksRemaining = Math.max(0, project.weeksRemaining - (1 / 7));
                project._lastWeeksRemainingUpdateDay = window.GameState.currentDay;
            }

            updateProjectSatisfaction(project);
        }
    });
}

    function checkProjectDeadlines() {
        window.GameState.projects.forEach(project => {
        if (project.status === 'complete') return;

        const status = getProjectStatus(project.id);
        const oldStatus = project.status;
        project.status = status;

            // PENALTY 1: First-time overdue penalties
            if (oldStatus !== 'crisis' && status === 'crisis') {
                window.GameState.gameStats.deadlinesMissed++;
                window.recordKeyMoment('Project Crisis!', `${project.name} is in crisis`, 'crisis');
                
                // PENALTY 2: Team morale hit when project goes overdue
                if (project.weeksRemaining < 0 && !project.overdueNotified) {
                    project.overdueNotified = true;
                    const assignedMembers = window.GameState.team.filter(m => 
                        (m.assignedProjects && m.assignedProjects.includes(project.id)) || 
                        (m.currentAssignment === project.id)
                    );
                    assignedMembers.forEach(member => {
                        window.adjustMemberMorale(member, -10);
                    });
                    window.recalculateTeamMorale();
                    
                    window.GameState.conversationHistory.push({
                        title: `⚠️ Deadline Missed: ${project.name}`,
                        message: `${project.name} is now overdue. Team morale has dropped. Client is losing patience.`,
                        type: 'warning',
                        timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                    });
                }
            }
            
            // PENALTY 1: Daily satisfaction penalty for overdue projects (HARSH)
            if (project.weeksRemaining < 0) {
                const daysOverdue = Math.abs(project.weeksRemaining) * 7;
                const dailyPenalty = 5; // -5% satisfaction per day overdue
                
                if (!project._lastOverduePenaltyDay || project._lastOverduePenaltyDay !== window.GameState.currentDay) {
                    project.satisfaction = Math.max(0, project.satisfaction - dailyPenalty);
                    project._lastOverduePenaltyDay = window.GameState.currentDay;
                }
                
                // PENALTY 4: Automatic scope reduction if severely overdue (>2 weeks)
                if (daysOverdue > 14 && !project.scopeReduced) {
                    project.scopeReduced = true;
                    const originalBudget = project.budget;
                    project.budget = Math.round(project.budget * 0.7); // 30% budget cut
                    project.estimatedHours = Math.round(project.estimatedHours * 0.8); // 20% scope cut
                    
                    window.GameState.conversationHistory.push({
                        title: `🚨 Scope Cut: ${project.name}`,
                        message: `${project.client} has cut features and budget due to severe delays. Budget reduced from $${originalBudget.toLocaleString()} to $${project.budget.toLocaleString()}.`,
                        type: 'error',
                        timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                    });
                    
                    window.recordKeyMoment('Scope Reduction', `${project.name}: Client cut budget by 30% due to delays`, 'crisis');
                }
            }

            if (project.weeksRemaining < 0 && project.satisfaction < 20 && !project.failureLogged) {
                project.failureLogged = true;
                window.GameState.gameStats.projectsFailed++;
                window.recordKeyMoment('Project Failed', `${project.name} collapsed due to low reputation and missed deadline`, 'failure');
            }
        });
    }

    function getProjectStatus(projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
    if (!project) return 'active';

    if (project.hoursCompleted >= project.estimatedHours) {
        return 'complete';
    }

    const weeksOverdue = project.weeksRemaining < 0;
    const veryLowSatisfaction = project.satisfaction < 30;

    if (weeksOverdue || veryLowSatisfaction) {
        return 'crisis';
    }

    const approachingDeadline = project.weeksRemaining < 2;
    const lowProgress = project.progress < 0.7;

    if (approachingDeadline && lowProgress) {
        return 'warning';
    }

    return 'ok';
}

    function completeProject(projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project) return;

        // For phase-based projects, ensure all phases are complete
        if (project.phases) {
            const allComplete = project.phases.management.progress >= 1.0 &&
                              project.phases.design.progress >= 1.0 &&
                              project.phases.development.progress >= 1.0 &&
                              project.phases.review.progress >= 1.0;
            if (!allComplete) {
                return; // Not ready to complete yet
            }
        }

        project.status = 'complete';

        const budget = project.budget || 5000;
        const satisfactionMultiplier = project.satisfaction / 100;
        let payment = Math.round(budget * satisfactionMultiplier);
        
        // PENALTY 5: Late fee deduction if completed after deadline
        let lateFee = 0;
        if (project.weeksRemaining < 0) {
            const weeksLate = Math.abs(project.weeksRemaining);
            lateFee = Math.round(budget * 0.1 * weeksLate); // 10% per week late
            lateFee = Math.min(lateFee, payment * 0.5); // Cap at 50% of payment
            payment = Math.max(0, payment - lateFee);
            
            window.GameState.conversationHistory.push({
                title: `💸 Late Fee Applied: ${project.name}`,
                message: `${project.client} deducted $${lateFee.toLocaleString()} in late fees (${Math.round(weeksLate * 7)} days overdue). Payment reduced to $${payment.toLocaleString()}.`,
                type: 'warning',
                timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
            });
        }
        
        window.GameState.money += payment;

        if (!window.GameState.portfolio) {
            window.GameState.portfolio = { completedProjects: 0, totalEarnings: 0 };
        }
        window.GameState.portfolio.completedProjects++;
        window.GameState.portfolio.totalEarnings += payment;

        window.GameState.gameStats.projectsCompleted++;
        window.GameState.gameStats.totalSatisfactionPoints += project.satisfaction;
        
        if (project.satisfaction >= 90 && project.weeksRemaining > 0) {
            window.GameState.gameStats.perfectDeliveries++;
            window.recordKeyMoment('Perfect Delivery!', `${project.name} completed with ${project.satisfaction}% reputation`, 'success');
        } else if (project.satisfaction >= 80) {
            window.recordKeyMoment('Great Work!', `${project.name} completed successfully`, 'success');
        }

        window.GameState.team.forEach(member => {
            if ((member.assignedProjects && member.assignedProjects.includes(projectId)) || (member.currentAssignment === projectId)) {
                if (member.assignedProjects) {
                    member.assignedProjects = member.assignedProjects.filter(id => id !== projectId);
                }
                if (member.currentAssignment === projectId) {
                    member.currentAssignment = null;
                }
                if ((!member.assignedProjects || member.assignedProjects.length === 0) && !member.currentAssignment) {
                    member.daysOnAssignment = 0;
                }
                if (member.morale) {
                    member.morale.current = Math.min(100, member.morale.current + 2);
                }
            }
        });

        window.celebrateProjectCompletion(project.name);

        let completionMessage = `You've completed ${project.name} for ${project.client}. Payment received: $${payment.toLocaleString()} (${Math.round(satisfactionMultiplier * 100)}% of budget)`;
        if (lateFee > 0) {
            completionMessage += ` - Late fees: $${lateFee.toLocaleString()}`;
        }
        
        window.GameState.conversationHistory.push({
            title: `Project Completed: ${project.name}`,
            message: completionMessage,
            type: lateFee > 0 ? 'warning' : 'success',
            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
        });

        window.showProjectCompletion(project);

        console.log(`Project ${project.name} completed! Payment: $${payment.toLocaleString()}`);
    }

    function getTeamMemberStatus(memberId) {
        const member = window.GameState.team.find(m => m.id === memberId);
    if (!member) return null;
    if (!member.morale || typeof member.morale.current !== 'number') {
        return null;
    }

    const morale = member.morale.current;
    let status = 'neutral';
    let mood = 'neutral';

    if (morale < 25) {
        status = 'burned_out';
        mood = 'burned_out';
    } else if (morale < 50) {
        status = 'stressed';
        mood = 'stressed';
    } else if (morale > 85) {
        status = 'excellent';
        mood = 'happy';
    } else if (morale > 70) {
        mood = 'happy';
    }

    // Check if member is assigned to any phase (derive assignment from phases)
    let assignedToProject = null;
    let hasAnyPhaseAssignment = false;
    window.GameState.projects.forEach(project => {
        if (!project.phases) return;
        ['management', 'design', 'development', 'review'].forEach(phaseName => {
            const phase = project.phases[phaseName];
            if (phase && phase.teamAssigned && phase.teamAssigned.includes(memberId)) {
                hasAnyPhaseAssignment = true;
                if (!assignedToProject) {
                    assignedToProject = project; // First project found
                }
            }
        });
    });
    
    let assignmentClass = hasAnyPhaseAssignment ? 'working' : 'available';
    let assignmentLabel = hasAnyPhaseAssignment ? 'Working' : 'Available';
    
    if (status === 'burned_out') {
        assignmentClass = 'burned';
        assignmentLabel = 'Burned Out';
    } else if (status === 'stressed') {
        assignmentClass = 'stressed';
        assignmentLabel = hasAnyPhaseAssignment ? 'Stressed on project' : 'Stressed';
    } else if (status === 'excellent') {
        assignmentClass = 'excellent';
        assignmentLabel = 'Thriving';
    } else if (assignedToProject) {
        assignmentLabel = `On ${assignedToProject.name}`;
    }

    return {
        member,
        status,
        mood,
        assignment: assignedToProject ? assignedToProject.id : null,
        isAvailable: !hasAnyPhaseAssignment,
        assignmentClass,
        assignmentLabel
    };
}

    function assignTeamMember(memberId, projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        const member = window.GameState.team.find(m => m.id === memberId);
        
        if (!project || !member) return false;
        
        // Add to project team
        if (!project.teamAssigned || !Array.isArray(project.teamAssigned)) {
            project.teamAssigned = [];
        }
        if (!project.teamAssigned.includes(memberId)) {
            project.teamAssigned.push(memberId);
        }
        
        // Add to member's project list
        if (!member.assignedProjects) {
            member.assignedProjects = [];
        }
        if (!member.assignedProjects.includes(projectId)) {
            member.assignedProjects.push(projectId);
        }
        
        if (member.daysOnAssignment === undefined) {
            member.daysOnAssignment = 0;
        }
        
        // Recalculate hour splits (based on number of projects, not phases)
        if (window.recalculateHourSplits) {
            window.recalculateHourSplits();
        }
        
        console.log(`Assigned ${member.name} to ${project.name}`);
        window.displayGameState();
        window.highlightTeamMemberCard(memberId);
        window.saveState();
        return true;
    }

    function getAvailableTeamMembers() {
        return window.GameState.team.filter(m => {
            if (m.id === 'player') return true;
            const assignedCount = (m.assignedProjects && m.assignedProjects.length) || 0;
            return assignedCount === 0;
        });
    }

    function autoAssignAvailableWorkers() {
        console.log('[Auto-Assign] Starting auto-assignment...');
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');
        console.log(`[Auto-Assign] Found ${activeProjects.length} active projects`);
        
        if (activeProjects.length === 0) {
            window.showWarningToast('No active projects to assign workers to', 2000);
            return { assigned: 0, message: 'No active projects' };
        }

        const availableMembers = window.GameState.team.filter(m => {
            if (m.hasQuit || m.isIll) return false;
            if (m.id === 'player') {
                const playerBurnout = m.burnout || 0;
                return playerBurnout < 80;
            }
            
            // Check if worker is already assigned to any active phase
            let hasActivePhaseAssignment = false;
            window.GameState.projects.forEach(proj => {
                if (!proj.phases) return;
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    const phase = proj.phases[phaseName];
                    if (phase && phase.teamAssigned && phase.teamAssigned.includes(m.id)) {
                        const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(proj, phaseName) : phase.status;
                        if (phaseStatus === 'active' || phaseStatus === 'ready') {
                            hasActivePhaseAssignment = true;
                        }
                    }
                });
            });
            
            return !hasActivePhaseAssignment;
        });

        console.log(`[Auto-Assign] Found ${availableMembers.length} available workers:`, availableMembers.map(m => m.name));
        
        if (availableMembers.length === 0) {
            window.showWarningToast('⚠️ No available workers to assign (all team members are already on active phases)', 2000);
            return { assigned: 0, message: 'No available workers' };
        }

        // SKILL-AWARE ASSIGNMENT ALGORITHM
        // 1. Calculate urgency score for each project
        const projectsWithScores = activeProjects.map(project => {
            let urgencyScore = 0;
            
            // Crisis projects get highest priority
            if (project.status === 'crisis') urgencyScore += 1000;
            
            // Projects with no workers on active phase
            let activePhaseHasWorkers = false;
            if (project.phases) {
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    const phase = project.phases[phaseName];
                    if (phase) {
                        const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(project, phaseName) : phase.status;
                        if ((phaseStatus === 'active' || phaseStatus === 'ready') && 
                            phase.teamAssigned && phase.teamAssigned.length > 0) {
                            activePhaseHasWorkers = true;
                        }
                    }
                });
            }
            if (!activePhaseHasWorkers) urgencyScore += 500;
            
            // Approaching deadline (< 2 weeks)
            if (project.weeksRemaining < 2) urgencyScore += 200;
            
            // Low progress relative to time remaining
            const progressRatio = project.progress / (1 - (project.weeksRemaining / project.totalWeeks));
            if (progressRatio < 0.5) urgencyScore += 100;
            
            // Determine active phase
            let activePhase = 'management'; // default
            if (project.phases) {
                if (project.phases.review.status === 'active' || project.phases.review.status === 'ready') {
                    activePhase = 'review';
                } else if (project.phases.development.status === 'active' || project.phases.development.status === 'ready') {
                    activePhase = 'development';
                } else if (project.phases.design.status === 'active' || project.phases.design.status === 'ready') {
                    activePhase = 'design';
                }
            }
            
            return {
                project,
                urgencyScore,
                activePhase
            };
        });
        
        // 2. Sort by urgency (highest first)
        projectsWithScores.sort((a, b) => b.urgencyScore - a.urgencyScore);
        
        // 3. Greedy assignment: best worker for each project's active phase
        const assignedWorkers = new Set();
        const assignedDetails = [];
        const remainingWorkers = [...availableMembers];
        
        // First pass: assign best-fit worker to each project
        for (const { project, activePhase } of projectsWithScores) {
            if (remainingWorkers.length === 0) break;
            
            // Calculate efficiency score for each available worker for this phase
            const workerScores = remainingWorkers.map(member => {
                const efficiency = getEfficiencyForPhase(member, activePhase);
                const skill = (member.skill || 1) / 5;
                const morale = (member.morale?.current || 50) / 100;
                
                // Prefer workers who match the phase role
                let roleBonus = 0;
                const role = (member.role || '').toLowerCase();
                if ((role === 'manager' && (activePhase === 'management' || activePhase === 'review')) ||
                    (role === 'designer' && activePhase === 'design') ||
                    (role === 'developer' && activePhase === 'development')) {
                    roleBonus = 0.5;
                }
                
                const score = efficiency * skill * morale + roleBonus;
                return { member, score };
            });
            
            // Sort by score (highest first)
            workerScores.sort((a, b) => b.score - a.score);
            
            // Assign the best worker to the ACTIVE PHASE
            const bestWorker = workerScores[0].member;
            const phase = project.phases[activePhase];
            
            if (phase) {
                // Initialize teamAssigned if needed
                if (!phase.teamAssigned) {
                    phase.teamAssigned = [];
                }
                
                // Add worker to phase if not already assigned
                if (!phase.teamAssigned.includes(bestWorker.id)) {
                    phase.teamAssigned.push(bestWorker.id);
                    assignedWorkers.add(bestWorker.id);
                    assignedDetails.push(`${bestWorker.name} → ${project.name} (${activePhase})`);
                    console.log(`[Auto-Assign] Assigned ${bestWorker.name} to ${project.name} ${activePhase} phase`);
                    
                    // Remove from available pool
                    const index = remainingWorkers.findIndex(m => m.id === bestWorker.id);
                    if (index !== -1) remainingWorkers.splice(index, 1);
                }
            }
        }
        
        // 4. Second pass: distribute remaining workers to projects that need help
        if (remainingWorkers.length > 0) {
            // Re-sort projects by those who need more help (low progress + tight deadline)
            const needHelpScores = projectsWithScores.map(({ project, activePhase }) => {
                // Count workers on the active phase
                let activePhaseWorkerCount = 0;
                const phase = project.phases[activePhase];
                if (phase && phase.teamAssigned) {
                    activePhaseWorkerCount = phase.teamAssigned.length;
                }
                
                const helpScore = (1 - project.progress) * 100 + 
                                (project.weeksRemaining < 3 ? 50 : 0) +
                                (activePhaseWorkerCount < 2 ? 30 : 0);
                return { project, activePhase, helpScore };
            });
            
            needHelpScores.sort((a, b) => b.helpScore - a.helpScore);
            
            for (const { project, activePhase } of needHelpScores) {
                if (remainingWorkers.length === 0) break;
                
                const phase = project.phases[activePhase];
                if (!phase) continue;
                
                // Initialize teamAssigned if needed
                if (!phase.teamAssigned) {
                    phase.teamAssigned = [];
                }
                
                // Just take the next available worker (they're all extras at this point)
                const worker = remainingWorkers[0];
                if (!phase.teamAssigned.includes(worker.id)) {
                    phase.teamAssigned.push(worker.id);
                    assignedWorkers.add(worker.id);
                    assignedDetails.push(`${worker.name} → ${project.name} (${activePhase} backup)`);
                    console.log(`[Auto-Assign] Assigned ${worker.name} to ${project.name} ${activePhase} phase (backup)`);
                    remainingWorkers.shift();
                }
            }
        }

        const uniqueWorkersAssigned = assignedWorkers.size;
        console.log(`[Auto-Assign] Completed. Total workers assigned: ${uniqueWorkersAssigned}`);
        console.log('[Auto-Assign] Assignment details:', assignedDetails);

        if (uniqueWorkersAssigned > 0) {
            // Show detailed feedback
            const detailMessage = assignedDetails.length <= 3 
                ? `\n${assignedDetails.join('\n')}`
                : '';
            window.showSuccessToast(`✅ Smart-assigned ${uniqueWorkersAssigned} worker(s) to active phases!${detailMessage}`, 3000);
            window.displayGameState();
            window.saveState(); // Persist the changes
        } else {
            console.log('[Auto-Assign] No workers were assigned');
            window.showWarningToast('⚠️ No workers assigned - either all workers are busy or all active phases already have team members', 2000);
        }

        return { assigned: uniqueWorkersAssigned, details: assignedDetails };
    }


    function removeTeamMemberFromProject(memberId, projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        const member = window.GameState.team.find(m => m.id === memberId);
        
        if (!project || !member) return false;
        
        // Remove from project team
        if (project.teamAssigned && Array.isArray(project.teamAssigned)) {
            project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
        }
        
        // Remove from member's project list
        if (member.assignedProjects && Array.isArray(member.assignedProjects)) {
            member.assignedProjects = member.assignedProjects.filter(id => id !== projectId);
        }
        
        // Reset daysOnAssignment if no projects left
        if (member.assignedProjects && member.assignedProjects.length === 0) {
            member.daysOnAssignment = 0;
        }
        
        // Recalculate hour splits
        if (window.recalculateHourSplits) {
            window.recalculateHourSplits();
        }
        
        console.log(`Removed ${member.name} from ${project.name}`);
        return true;
    }

    function hireFreelancer(projectId, phaseName) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project || !project.phases || !project.phases[phaseName]) {
            return { success: false, message: 'Project or phase not found' };
        }
        
        const phase = project.phases[phaseName];
        if (phase.freelancerHired) {
            return { success: false, message: 'Freelancer already hired for this phase' };
        }
        
        const cost = (project.complexity || 1) * 200;
        if (window.GameState.money < cost) {
            return { success: false, message: `Not enough money. Need $${cost}, have $${window.GameState.money}` };
        }
        
        window.GameState.money -= cost;
        phase.freelancerHired = true;
        
        const phaseLabels = { management: 'Management', design: 'Design', development: 'Development', review: 'Review' };
        const phaseLabel = phaseLabels[phaseName] || phaseName;
        
        window.GameState.conversationHistory.push({
            title: 'Freelancer Hired',
            message: `Hired a freelancer for ${phaseLabel} phase on ${project.name}. Cost: $${cost.toLocaleString()}`,
            type: 'info',
            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
        });
        
        return { success: true, message: `Freelancer hired for $${cost.toLocaleString()}` };
    }

    function callInSick() {
        const player = window.GameState.team.find(m => m.id === 'player');
        if (!player) return;

        if (window.currentConversation !== null) {
            window.showWarningToast('⏸️ Please respond to the active conversation before calling in sick', 3000);
            return;
        }

        if (window.GameState.gameOver) {
            return;
        }

        const oldBurnout = player.burnout || 0;
        // REDUCED RELIEF: Reduced from 25 to 15 for urgency (40% reduction)
        // Taking a sick day helps, but doesn't completely solve burnout
        const burnoutReduction = Math.min(15, oldBurnout);
        
        // Use centralized burnout adjustment
        if (window.adjustBurnout && burnoutReduction > 0) {
            window.adjustBurnout(player.id, -burnoutReduction, 'Called in sick');
        }

        player.hours = Math.max(0, (player.hours || 40) - 8);

        const deferredCount = window.GameState.conversationQueue.length;
        if (deferredCount > 0) {
            window.GameState.deferredConversations = window.GameState.deferredConversations || {};
            
            let targetDay = window.GameState.currentDay + 1;
            let targetWeek = window.GameState.currentWeek;
            
            if (targetDay > 7) {
                targetDay = 1;
                targetWeek = targetWeek + 1;
            }
            
            window.GameState.conversationQueue.forEach(convId => {
                window.GameState.deferredConversations[convId] = {
                    week: targetWeek,
                    day: targetDay
                };
            });
            window.GameState.conversationQueue = [];
        }

        window.GameState.conversationHistory.push({
            title: 'Called in Sick',
            message: `You called in sick to recover. Burnout reduced by ${Math.round(burnoutReduction)}%. ${deferredCount > 0 ? `${deferredCount} conversation(s) deferred to tomorrow.` : ''}`,
            type: 'info',
            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
        });

        window.recordKeyMoment('Called in Sick', `Took a mental health day. Burnout reduced by ${Math.round(burnoutReduction)}%.`, 'info');

        window.displayGameState();
        window.saveState();

        window.showSuccessToast(`Called in sick. Burnout reduced by ${Math.round(burnoutReduction)}%. ${deferredCount > 0 ? `${deferredCount} conversation(s) will be waiting tomorrow.` : ''}`, 4000);
    }

    function recalculateHourSplits() {
        window.GameState.team.forEach(member => {
            const count = (member.assignedProjects && member.assignedProjects.length) || 0;
            
            if (count === 0) {
                member.hourSplitRatio = 1.0;
                member.hoursPerProject = member.hours || 40;
            } else {
                member.hourSplitRatio = 1 / count;
                member.hoursPerProject = (member.hours || 40) * member.hourSplitRatio;
            }
        });
    }

    return {
        checkForIllness,
        showIllnessPopup,
        updatePlayerBurnout,
        updateTeamMorale,
        callInSick,
        getClientProfile,
        updateProjectRisk,
        calculateSatisfactionScores,
        updateProjectSatisfaction,
        handleScopeCreepRequest,
        generateWeeklyClientFeedback,
        cloneClientProfile,
        buildProjectFromTemplate,
        hydrateProject,
        updateProjects,
        checkProjectDeadlines,
        getProjectStatus,
        completeProject,
        getTeamMemberStatus,
        assignTeamMember,
        getAvailableTeamMembers,
        autoAssignAvailableWorkers,
        calculatePhaseHours,
        createPhaseStructure,
        getEfficiencyForPhase,
        canStartPhase,
        getPhaseStatus,
        updatePhaseProgress,
        removeTeamMemberFromProject,
        hireFreelancer,
        triggerPhaseCompletion,
        triggerPhaseActivation,
        recalculateHourSplits
    };
})();

// Expose on window for backward compatibility
try {
    if (typeof ProjectsModule === 'object' && ProjectsModule !== null) {
        window.checkForIllness = ProjectsModule.checkForIllness;
        window.showIllnessPopup = ProjectsModule.showIllnessPopup;
        window.updatePlayerBurnout = ProjectsModule.updatePlayerBurnout;
        window.updateTeamMorale = ProjectsModule.updateTeamMorale;
        window.callInSick = ProjectsModule.callInSick;
        window.getClientProfile = ProjectsModule.getClientProfile;
        window.updateProjectRisk = ProjectsModule.updateProjectRisk;
        window.calculateSatisfactionScores = ProjectsModule.calculateSatisfactionScores;
        window.updateProjectSatisfaction = ProjectsModule.updateProjectSatisfaction;
        window.handleScopeCreepRequest = ProjectsModule.handleScopeCreepRequest;
        window.generateWeeklyClientFeedback = ProjectsModule.generateWeeklyClientFeedback;
        window.cloneClientProfile = ProjectsModule.cloneClientProfile;
        window.buildProjectFromTemplate = ProjectsModule.buildProjectFromTemplate;
        window.hydrateProject = ProjectsModule.hydrateProject;
        window.updateProjects = ProjectsModule.updateProjects;
        window.checkProjectDeadlines = ProjectsModule.checkProjectDeadlines;
        window.getProjectStatus = ProjectsModule.getProjectStatus;
        window.completeProject = ProjectsModule.completeProject;
        window.getTeamMemberStatus = ProjectsModule.getTeamMemberStatus;
        window.assignTeamMember = ProjectsModule.assignTeamMember;
        window.getAvailableTeamMembers = ProjectsModule.getAvailableTeamMembers;
        window.autoAssignAvailableWorkers = ProjectsModule.autoAssignAvailableWorkers;
        window.calculatePhaseHours = ProjectsModule.calculatePhaseHours;
        window.createPhaseStructure = ProjectsModule.createPhaseStructure;
        window.getEfficiencyForPhase = ProjectsModule.getEfficiencyForPhase;
        window.canStartPhase = ProjectsModule.canStartPhase;
        window.getPhaseStatus = ProjectsModule.getPhaseStatus;
        window.updatePhaseProgress = ProjectsModule.updatePhaseProgress;
        window.removeTeamMemberFromProject = ProjectsModule.removeTeamMemberFromProject;
        window.hireFreelancer = ProjectsModule.hireFreelancer;
        window.triggerPhaseCompletion = ProjectsModule.triggerPhaseCompletion;
        window.triggerPhaseActivation = ProjectsModule.triggerPhaseActivation;
        window.recalculateHourSplits = ProjectsModule.recalculateHourSplits;
        
        console.log('ProjectsModule functions exposed to window');
    } else {
        console.error('ProjectsModule failed to initialize. Type:', typeof ProjectsModule);
    }
} catch (error) {
    console.error('Error exposing ProjectsModule functions:', error);
}

