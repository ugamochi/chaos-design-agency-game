// Project and team management logic

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

        let burnoutChange = 0;

        const assignedProjects = window.GameState.projects.filter(p => 
            p.teamAssigned && Array.isArray(p.teamAssigned) && p.teamAssigned.includes('player')
        ).length;

        if (assignedProjects > 0) {
            burnoutChange += assignedProjects * 2;
        }

        if (player.hours < 4) {
            burnoutChange += 1;
        }

        const crisisProjects = window.GameState.projects.filter(p => 
            p.status === 'crisis' && p.teamAssigned && Array.isArray(p.teamAssigned) && p.teamAssigned.includes('player')
        ).length;
        if (crisisProjects > 0) {
            burnoutChange += crisisProjects * 3;
        }

        if (window.GameState.teamMorale < 50) {
            burnoutChange += 1;
        }

        // Burnout reduction conditions - these can stack (independent if statements)
        // When no projects assigned, rest reduces burnout more (mutually exclusive)
        if (assignedProjects === 0 && player.hours >= 7) {
            burnoutChange -= 3;
        } else if (assignedProjects === 0 && player.hours >= 6) {
            burnoutChange -= 2;
        } else if (assignedProjects === 0 && player.hours >= 5) {
            burnoutChange -= 1;
        }
        // When only 1 project assigned and well-rested, small reduction
        if (assignedProjects === 1 && player.hours >= 7) {
            burnoutChange -= 2;
        }

        player.burnout = Math.max(0, Math.min(100, player.burnout + burnoutChange));

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
                member.daysOnAssignment++;
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

        window.adjustMemberMorale(member, moraleChange);
        
        if (member.morale && typeof member.morale.current === 'number') {
            const gradualDecay = -0.5;
            window.adjustMemberMorale(member, gradualDecay);
        }

        if (member.currentAssignment) {
            member.daysOnAssignment++;
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
            const playerMoraleChange = -1;
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

    risk.scopeLabel = hoursDelta > 0 ? `+${Math.round(hoursDelta)}h` : hoursDelta < 0 ? `${Math.round(hoursDelta)}h` : 'On estimate';
    risk.timelineLabel = project.weeksRemaining <= 0 ? 'Overdue' : `${Math.ceil(project.weeksRemaining)} wk left`;
    risk.satisfactionLabel = `${Math.round(project.satisfaction)}% happy`;

    project.risk = risk;
}

    function calculateSatisfactionScores(project) {
        const profile = getClientProfile(project);
        const assignedMembers = window.GameState.team.filter(m => m.currentAssignment === project.id);

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

            if (entry.timelineWeeks) {
                project.totalWeeks += entry.timelineWeeks;
                project.weeksRemaining += entry.timelineWeeks;
            }

            if (entry.budgetDelta) {
                project.budget += entry.budgetDelta;
                // Money will be added to balance when project is completed
            }

            if (entry.teamStress && entry.teamStress !== 0) {
                window.GameState.team
                    .filter(m => m.currentAssignment === project.id)
                    .forEach(member => window.adjustMemberMorale(member, entry.teamStress));
                window.recalculateTeamMorale();
            }

            project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
            updateProjectSatisfaction(project);
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
                    .filter(m => m.currentAssignment === project.id)
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

    function updatePhaseProgress(project, phaseName) {
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
            // Auto-assign project team members to newly activated phases
            if (!phase.teamAssigned) {
                phase.teamAssigned = [];
            }
            (project.teamAssigned || []).forEach(memberId => {
                if (!phase.teamAssigned.includes(memberId)) {
                    phase.teamAssigned.push(memberId);
                }
            });
        }
        
        phase.status = newStatus;
        
        // Skip if phase is waiting or complete
        if (phase.status === 'waiting' || phase.status === 'complete') {
            return;
        }
        
        // Get team members assigned to this phase
        const phaseTeam = phase.teamAssigned || [];
        const assignedMembers = window.GameState.team.filter(m => 
            phaseTeam.includes(m.id) && !m.isIll
        );
        
        if (assignedMembers.length === 0 && !phase.freelancerHired) {
            return; // No one working on this phase
        }
        
        // Base progress rates (faster pacing!)
        const baseProgressRates = {
            management: 0.20,
            design: 0.15,
            development: 0.12,
            review: 0.10
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
            
            // Count total active assignments across ALL projects and phases for this member
            const totalAssignments = window.GameState.projects.reduce((count, p) => {
                if (!p.phases || p.status === 'complete') return count;
                const activePhases = ['management', 'design', 'development', 'review'].filter(ph => {
                    const phase = p.phases[ph];
                    return phase && 
                           phase.teamAssigned && 
                           phase.teamAssigned.includes(member.id) && 
                           phase.status !== 'complete' && 
                           phase.status !== 'waiting';
                });
                return count + activePhases.length;
            }, 0);
            
            if (totalAssignments === 0) {
                return; // No assignments, skip
            }
            
            // Calculate hours per assignment (split evenly across all assignments)
            const currentHours = member.hours || 0;
            let hoursPerAssignment = 0;
            
            if (member.id === 'player') {
                // Player can work even with 0 or negative hours (overtime)
                if (currentHours > 0) {
                    hoursPerAssignment = currentHours / totalAssignments;
                } else {
                    // Overtime: player can still work at full efficiency, but gets burnout penalty
                    hoursPerAssignment = maxDailyHours / totalAssignments;
                }
            } else {
                // Non-player members: can't work overtime efficiently
                if (currentHours > 0) {
                    hoursPerAssignment = Math.max(0, currentHours) / totalAssignments;
                } else {
                    // Overtime: split base hours across assignments at 50% efficiency
                    hoursPerAssignment = (maxDailyHours / totalAssignments) * 0.5;
                }
            }
            
            // Calculate efficiency contribution for THIS phase
            // Efficiency is based on the fraction of daily hours spent on this specific phase
            const efficiencyContribution = efficiency * skillMultiplier * moraleMultiplier * (hoursPerAssignment / maxDailyHours);
            totalEfficiency += efficiencyContribution;
            
            // Deduct hours for this member (only once per day, not per phase)
            // We'll track this per member to avoid double-deducting
            if (!member._hoursDeductedToday) {
                const hoursWorkedThisWeek = member.hoursWorkedThisWeek || 0;
                let totalHoursToDeduct = 0;
                
                if (member.id === 'player') {
                    // Player can work up to maxDailyHours even if hours are 0 or negative
                    totalHoursToDeduct = Math.min(currentHours > 0 ? currentHours : maxDailyHours, maxDailyHours);
                } else {
                    // Non-player members: limited by available hours
                    totalHoursToDeduct = Math.min(currentHours > 0 ? currentHours : maxDailyHours * 0.5, maxDailyHours);
                }
                
                const newHoursWorked = hoursWorkedThisWeek + totalHoursToDeduct;
                member.hoursWorkedThisWeek = newHoursWorked;
                
                const wasOvertime = currentHours <= 0;
                if (currentHours > 0) {
                    member.hours = currentHours - totalHoursToDeduct;
                } else if (member.id === 'player') {
                    // Player can go negative hours (overtime)
                    member.hours = currentHours - totalHoursToDeduct;
                }
                
                if (member.id === 'player') {
                    // Player can work beyond 40 hours, but each extra hour costs 5% burnout
                    if (newHoursWorked > baseWeeklyHours || wasOvertime) {
                        const overtimeHours = wasOvertime ? totalHoursToDeduct : (newHoursWorked - baseWeeklyHours);
                        const previousOvertime = Math.max(0, hoursWorkedThisWeek - baseWeeklyHours);
                        const newOvertime = overtimeHours - previousOvertime;
                        
                        if (newOvertime > 0 || wasOvertime) {
                            const burnoutIncrease = Math.floor((wasOvertime ? totalHoursToDeduct : newOvertime) * 5);
                            if (member.burnout !== undefined) {
                                member.burnout = Math.min(100, (member.burnout || 0) + burnoutIncrease);
                            }
                        }
                    }
                } else {
                    // Non-player members: overtime affects morale
                    if (newHoursWorked > baseWeeklyHours || wasOvertime) {
                        const overtimeHours = wasOvertime ? totalHoursToDeduct : (newHoursWorked - baseWeeklyHours);
                        const previousOvertime = Math.max(0, hoursWorkedThisWeek - baseWeeklyHours);
                        const newOvertime = overtimeHours - previousOvertime;
                        
                        if (newOvertime > 0 || wasOvertime) {
                            const moralePenalty = Math.floor((wasOvertime ? totalHoursToDeduct : newOvertime) * 3);
                            if (member.morale && typeof member.morale.current === 'number') {
                                window.adjustMemberMorale(member, -moralePenalty);
                            }
                        }
                    }
                }
                
                member._hoursDeductedToday = true;
            }
        });
        
        // Add freelancer if hired (1.5x speed, skill 3-5)
        if (phase.freelancerHired) {
            const freelancerSkill = 3 + Math.random() * 2; // 3-5
            const freelancerEfficiency = 1.0; // Freelancers are specialists
            totalEfficiency += freelancerEfficiency * (freelancerSkill / 5) * 1.5; // 1.5x multiplier
        }
        
        // Calculate daily progress
        const dailyProgress = baseProgress * totalEfficiency;
        phase.progress = Math.min(1.0, phase.progress + dailyProgress);
        
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
        
        // Check if next phase can start and auto-assign team members who are assigned to the project
        if (phaseName === 'management' && project.phases.design.status === 'waiting') {
            if (canStartPhase(project, 'design')) {
                project.phases.design.status = 'ready';
                // Auto-assign project team members to the new phase
                (project.teamAssigned || []).forEach(memberId => {
                    if (!project.phases.design.teamAssigned.includes(memberId)) {
                        project.phases.design.teamAssigned.push(memberId);
                    }
                });
            }
        } else if (phaseName === 'design' && project.phases.development.status === 'waiting') {
            if (canStartPhase(project, 'development')) {
                project.phases.development.status = 'ready';
                // Auto-assign project team members to the new phase
                (project.teamAssigned || []).forEach(memberId => {
                    if (!project.phases.development.teamAssigned.includes(memberId)) {
                        project.phases.development.teamAssigned.push(memberId);
                    }
                });
            }
        } else if (phaseName === 'development' && project.phases.review.status === 'waiting') {
            if (canStartPhase(project, 'review')) {
                project.phases.review.status = 'ready';
                // Auto-assign project team members to the new phase
                (project.teamAssigned || []).forEach(memberId => {
                    if (!project.phases.review.teamAssigned.includes(memberId)) {
                        project.phases.review.teamAssigned.push(memberId);
                    }
                });
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
        // Reset hours deduction flag at start of project updates (once per day)
        window.GameState.team.forEach(member => {
            member._hoursDeductedToday = false;
        });
        
        window.GameState.projects.forEach(project => {
        if (project.status === 'active' || project.status === 'ok' || project.status === 'warning' || project.status === 'crisis') {
            // If project has phases, use phase-based system
            if (project.phases) {
                // Update each phase
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    updatePhaseProgress(project, phaseName);
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
                
                project.weeksRemaining = Math.max(0, project.weeksRemaining - (1 / 7));
                updateProjectSatisfaction(project);
                return;
            }
            
            // Legacy system (for old projects without phases)
            const assignedMembers = window.GameState.team.filter(m =>
                m.currentAssignment === project.id && !m.isIll
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
                
                if (hoursToSpend > 0) {
                    const newHoursWorked = hoursWorkedThisWeek + hoursToSpend;
                    member.hoursWorkedThisWeek = newHoursWorked;
                    
                    const wasOvertime = currentHours <= 0;
                    const hoursBefore = currentHours;
                    member.hours = currentHours - hoursToSpend;
                    
                    if (member.id === 'player') {
                        // Player can work beyond 40 hours, but each extra hour costs 5% burnout
                        if (newHoursWorked > baseWeeklyHours || wasOvertime) {
                            const overtimeHours = wasOvertime ? hoursToSpend : (newHoursWorked - baseWeeklyHours);
                            const previousOvertime = Math.max(0, hoursWorkedThisWeek - baseWeeklyHours);
                            const newOvertime = overtimeHours - previousOvertime;
                            
                            if (newOvertime > 0 || wasOvertime) {
                                const burnoutIncrease = Math.floor((wasOvertime ? hoursToSpend : newOvertime) * 5);
                                if (member.burnout !== undefined) {
                                    member.burnout = Math.min(100, (member.burnout || 0) + burnoutIncrease);
                                }
                            }
                        }
                    } else {
                        // Non-player members: overtime affects morale
                        if (newHoursWorked > baseWeeklyHours || wasOvertime) {
                            const overtimeHours = wasOvertime ? hoursToSpend : (newHoursWorked - baseWeeklyHours);
                            const previousOvertime = Math.max(0, hoursWorkedThisWeek - baseWeeklyHours);
                            const newOvertime = overtimeHours - previousOvertime;
                            
                            if (newOvertime > 0 || wasOvertime) {
                                const moralePenalty = Math.floor((wasOvertime ? hoursToSpend : newOvertime) * 3);
                                if (member.morale && typeof member.morale.current === 'number') {
                                    window.adjustMemberMorale(member, -moralePenalty);
                                }
                            }
                        }
                    }
                    
                    project.hoursCompleted = (project.hoursCompleted || 0) + hoursToSpend;
                }
            });

            project.hoursCompleted = Math.min(project.hoursCompleted, project.estimatedHours);
            project.progress = project.hoursCompleted / project.estimatedHours;

            if (project.hoursCompleted >= project.estimatedHours) {
                project.progress = 1.0;
                completeProject(project.id);
            }

            project.weeksRemaining = Math.max(0, project.weeksRemaining - (1 / 7));

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

            if (oldStatus !== 'crisis' && status === 'crisis') {
                window.GameState.gameStats.deadlinesMissed++;
                window.recordKeyMoment('Project Crisis!', `${project.name} is in crisis`, 'crisis');
            }

            if (project.weeksRemaining < 0 && project.satisfaction < 20 && !project.failureLogged) {
                project.failureLogged = true;
                window.GameState.gameStats.projectsFailed++;
                window.recordKeyMoment('Project Failed', `${project.name} collapsed due to low satisfaction and missed deadline`, 'failure');
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
        const payment = Math.round(budget * satisfactionMultiplier);
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
            window.recordKeyMoment('Perfect Delivery!', `${project.name} completed with ${project.satisfaction}% satisfaction`, 'success');
        } else if (project.satisfaction >= 80) {
            window.recordKeyMoment('Great Work!', `${project.name} completed successfully`, 'success');
        }

        window.GameState.team.forEach(member => {
            if (member.currentAssignment === projectId) {
                member.currentAssignment = null;
                member.daysOnAssignment = 0;
                if (member.morale) {
                    member.morale.current = Math.min(100, member.morale.current + 2);
                }
            }
        });

        window.celebrateProjectCompletion(project.name);

        window.GameState.conversationHistory.push({
            title: `Project Completed: ${project.name}`,
            message: `You've completed ${project.name} for ${project.client}. Payment received: $${payment.toLocaleString()} (${Math.round(satisfactionMultiplier * 100)}% of budget)`,
            type: 'success',
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

    let assignmentClass = member.currentAssignment ? 'working' : 'available';
    let assignmentLabel = member.currentAssignment ? 'Working' : 'Available';
    if (status === 'burned_out') {
        assignmentClass = 'burned';
        assignmentLabel = 'Burned Out';
    } else if (status === 'stressed') {
        assignmentClass = 'stressed';
        assignmentLabel = member.currentAssignment ? 'Stressed on project' : 'Stressed';
    } else if (status === 'excellent') {
        assignmentClass = 'excellent';
        assignmentLabel = 'Thriving';
        } else if (member.currentAssignment) {
            const project = window.GameState.projects.find(p => p.id === member.currentAssignment);
        if (project) {
            assignmentLabel = `On ${project.name}`;
        }
    }

    return {
        member,
        status,
        mood,
        assignment: member.currentAssignment,
        isAvailable: !member.currentAssignment,
        assignmentClass,
        assignmentLabel
    };
}

    function assignTeamMember(memberId, projectId) {
        const member = window.GameState.team.find(m => m.id === memberId);
    if (!member) return false;

    if (member.currentAssignment && member.currentAssignment !== projectId) {
        if (member.id !== 'player') {
            member.currentAssignment = null;
            member.daysOnAssignment = 0;
        }
    }

    if (projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        
        // For phase-based projects, assign to all phases that can be started
        if (project && project.phases) {
            const phaseNames = ['management', 'design', 'development', 'review'];
            phaseNames.forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && canStartPhase(project, phaseName)) {
                    if (!phase.teamAssigned) {
                        phase.teamAssigned = [];
                    }
                    if (!phase.teamAssigned.includes(memberId)) {
                        phase.teamAssigned.push(memberId);
                    }
                }
            });
        }
        
        member.currentAssignment = projectId;
        if (member.daysOnAssignment === undefined) {
            member.daysOnAssignment = 0;
        }
    } else {
        member.currentAssignment = null;
        member.daysOnAssignment = 0;
    }

        window.GameState.projects.forEach(project => {
            if (!project.teamAssigned || !Array.isArray(project.teamAssigned)) {
                project.teamAssigned = [];
            }
            if (project.id === projectId) {
                if (!project.teamAssigned.includes(memberId)) {
                    project.teamAssigned.push(memberId);
                }
            } else {
                project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
            }
        });

        window.displayGameState();
        window.highlightTeamMemberCard(memberId);
        window.saveState();
        return true;
    }

    function getAvailableTeamMembers() {
        return window.GameState.team.filter(m => !m.currentAssignment || m.id === 'player');
    }

    function autoAssignAvailableWorkers() {
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');
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
            return !m.currentAssignment;
        });

        if (availableMembers.length === 0) {
            window.showWarningToast('No available workers to assign', 2000);
            return { assigned: 0, message: 'No available workers' };
        }

        const targetWorkersPerProject = Math.ceil(availableMembers.length / activeProjects.length);
        const assignedWorkers = new Set();
        const assignedDetails = [];
        
        let memberIndex = 0;
        let rounds = 0;
        const maxRounds = targetWorkersPerProject * 2;
        
        while (rounds < maxRounds) {
            let anyAssignmentThisRound = false;
            
            for (const project of activeProjects) {
                const currentAssigned = project.teamAssigned || [];
                const needed = Math.max(0, targetWorkersPerProject - currentAssigned.length);
                
                if (needed === 0) continue;
                
                const member = availableMembers[memberIndex % availableMembers.length];
                
                if (currentAssigned.includes(member.id)) {
                    memberIndex++;
                    continue;
                }
                
                const playerBurnout = member.id === 'player' ? (member.burnout || 0) : 0;
                if (member.id === 'player' && playerBurnout >= 80) {
                    memberIndex++;
                    continue;
                }
                
                if (assignTeamMember(member.id, project.id)) {
                    assignedWorkers.add(member.id);
                    assignedDetails.push(`${member.name} → ${project.name}`);
                    anyAssignmentThisRound = true;
                }
                
                memberIndex++;
            }
            
            if (!anyAssignmentThisRound) {
                break;
            }
            
            rounds++;
        }

        const uniqueWorkersAssigned = assignedWorkers.size;

        if (uniqueWorkersAssigned > 0) {
            window.showSuccessToast(`Auto-assigned ${uniqueWorkersAssigned} worker(s) to projects`, 3000);
            window.displayGameState();
        } else {
            window.showWarningToast('All projects already have workers assigned', 2000);
        }

        return { assigned: uniqueWorkersAssigned, details: assignedDetails };
    }

    function assignTeamMemberToPhase(memberId, projectId, phaseName) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project || !project.phases || !project.phases[phaseName]) return false;
        
        const phase = project.phases[phaseName];
        if (!phase.teamAssigned) {
            phase.teamAssigned = [];
        }
        
        if (!phase.teamAssigned.includes(memberId)) {
            phase.teamAssigned.push(memberId);
        }
        
        // Also add to legacy teamAssigned for backward compatibility
        if (!project.teamAssigned || !Array.isArray(project.teamAssigned)) {
            project.teamAssigned = [];
        }
        if (!project.teamAssigned.includes(memberId)) {
            project.teamAssigned.push(memberId);
        }
        
        // Set currentAssignment if not already set to another project (or if player)
        const member = window.GameState.team.find(m => m.id === memberId);
        if (member) {
            if (!member.currentAssignment || member.id === 'player') {
                member.currentAssignment = projectId;
            }
        }
        
        return true;
    }

    function assignTeamMemberToAllPhases(memberId, projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project || !project.phases) return false;
        
        const phaseNames = ['management', 'design', 'development', 'review'];
        let assigned = false;
        
        phaseNames.forEach(phaseName => {
            if (assignTeamMemberToPhase(memberId, projectId, phaseName)) {
                assigned = true;
            }
        });
        
        return assigned;
    }

    function removeTeamMemberFromPhase(memberId, projectId, phaseName) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project || !project.phases || !project.phases[phaseName]) return false;
        
        const phase = project.phases[phaseName];
        if (phase.teamAssigned) {
            phase.teamAssigned = phase.teamAssigned.filter(id => id !== memberId);
        }
        
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
        const burnoutReduction = Math.min(25, oldBurnout);
        player.burnout = Math.max(0, oldBurnout - burnoutReduction);

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
        assignTeamMemberToPhase,
        assignTeamMemberToAllPhases,
        removeTeamMemberFromPhase,
        hireFreelancer,
        triggerPhaseCompletion,
        triggerPhaseActivation
    };
})();

// Expose on window for backward compatibility
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
window.assignTeamMemberToPhase = ProjectsModule.assignTeamMemberToPhase;
window.removeTeamMemberFromPhase = ProjectsModule.removeTeamMemberFromPhase;
window.hireFreelancer = ProjectsModule.hireFreelancer;
window.triggerPhaseCompletion = ProjectsModule.triggerPhaseCompletion;
window.triggerPhaseActivation = ProjectsModule.triggerPhaseActivation;
window.assignTeamMemberToAllPhases = ProjectsModule.assignTeamMemberToAllPhases;

