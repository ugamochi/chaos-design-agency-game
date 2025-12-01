// Conversation management logic

const ConversationsModule = (function() {
    'use strict';

    let currentConversation = null;
    let selectedChoiceId = null;
    let currentConversationStartTime = null;
    let currentConversationMeta = null;

    function recordConversationResponse(conversation) {
        if (!conversation || currentConversationStartTime === null) return;
        const elapsedHours = (Date.now() - currentConversationStartTime) / (1000 * 60 * 60);
        const meta = currentConversationMeta || {};
        const linkedProjectId = meta.linkedProjectId || conversation.linkedProjectId || conversation.projectId;
        if (linkedProjectId) {
            const project = window.GameState.projects.find(p => p.id === linkedProjectId);
            if (project) {
                project.lastResponseHours = elapsedHours;
                const responseDeadline = meta.responseDeadlineHours || conversation.responseDeadlineHours;
                if (responseDeadline) {
                    const delta = elapsedHours - responseDeadline;
                    if (delta > 0) {
                        project.satisfaction = Math.max(0, project.satisfaction - Math.round(delta * 1.5));
                    } else {
                        project.satisfaction = Math.min(100, project.satisfaction + 3);
                    }
                }
                window.updateProjectSatisfaction(project);
            }
        }
        currentConversationStartTime = null;
        currentConversationMeta = null;
        window.currentConversationStartTime = null;
        window.currentConversationMeta = null;
    }

    function triggerClientEvent(projectId, eventType) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project) return;

        const eventMap = {
            scope_warning: 'scope_creep_techcorp',
            payment_issue: 'payment_delayed'
        };

        const conversationId = eventMap[eventType];
        if (conversationId) {
            queueConversation(conversationId);
        } else {
            console.log(`Client event (${eventType}) logged for ${project.name}`);
        }
    }

    function deferConversation(conversationId) {
        window.GameState.deferredConversations[conversationId] = {
            week: window.GameState.currentWeek,
            day: window.GameState.currentDay
        };
    }

    function isConversationDeferred(conversationId) {
        const entry = window.GameState.deferredConversations[conversationId];
        if (!entry) return false;
        return entry.week === window.GameState.currentWeek && entry.day === window.GameState.currentDay;
    }

    function purgeDeferredConversations() {
        const toRestore = [];
        Object.entries(window.GameState.deferredConversations).forEach(([id, entry]) => {
            if (entry.week === window.GameState.currentWeek && entry.day === window.GameState.currentDay) {
                toRestore.push(id);
                delete window.GameState.deferredConversations[id];
            } else if (entry.week < window.GameState.currentWeek || (entry.week === window.GameState.currentWeek && entry.day < window.GameState.currentDay)) {
                delete window.GameState.deferredConversations[id];
            }
        });
        
        toRestore.forEach(convId => {
            if (!window.GameState.resolvedConversations.includes(convId)) {
                queueConversation(convId);
            }
        });
    }

    function getCurrentConversations() {
        if (!Array.isArray(window.AllConversations)) {
            return [];
        }
        return window.AllConversations.filter(conv => {
            if (!conv || conv.week === 0 && conv.day === 0) return false;

            const matchesTime = conv.week === window.GameState.currentWeek && conv.day === window.GameState.currentDay;

            const notResolved = !window.GameState.resolvedConversations.includes(conv.id);

            return matchesTime && notResolved;
        });
    }

    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function checkForConversations() {
        let conversations = getCurrentConversations().filter(conv => !isConversationDeferred(conv.id));

        if (conversations.length > 0) {
            conversations = shuffleArray(conversations);
            
            conversations.slice(1).forEach(conv => {
                queueConversation(conv.id);
            });

            window.displayConversation(conversations[0]);
        } else if (window.GameState.conversationQueue.length > 0 && window.currentConversation === null) {
            const nextConvId = window.GameState.conversationQueue.shift();
            if (Array.isArray(window.AllConversations)) {
                const nextConv = window.AllConversations.find(c => c && c.id === nextConvId);
                if (nextConv) {
                    window.displayConversation(nextConv);
                }
            }
        }
    }

    function queueConversation(conversationId) {
        if (!window.GameState.conversationQueue.includes(conversationId)) {
            window.GameState.conversationQueue.push(conversationId);
            window.updateNotificationBadge();
        }
    }

    function handleChoice(conversationId, choiceId) {
        if (!currentConversation || currentConversation.id !== conversationId) {
            console.warn('Conversation mismatch or no active conversation');
            return;
        }

        selectedChoiceId = choiceId;
    const choiceButtons = document.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
        if (btn.dataset.choiceId === choiceId) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    const sendBtn = document.querySelector('.send-response-btn');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
}

    function submitConversationChoice() {
        if (!currentConversation || !selectedChoiceId) return;

    const choice = currentConversation.choices.find(c => c.id === selectedChoiceId);
    if (!choice) return;

        const player = window.GameState.team.find(m => m.id === 'player');
        if (player) {
            const hoursSpent = 1.5;
            const hoursBefore = player.hours || 0;
            player.hours = (player.hours || 0) - hoursSpent;
            
            if (player.hours < 0) {
                const overtimeHours = Math.abs(player.hours);
                const burnoutIncrease = Math.floor(overtimeHours * 3);
                if (player.burnout !== undefined) {
                    player.burnout = Math.min(100, (player.burnout || 0) + burnoutIncrease);
                }
            }
            
            window.displayGameState();
        }

        recordConversationResponse(currentConversation);
        applyConsequences(choice.consequences || {}, currentConversation);
        window.showConsequenceFeedback(choice.flavorText || '', choice.consequences || {});

        window.GameState.resolvedConversations.push(currentConversation.id);
        window.currentConversation = null;
        window.selectedChoiceId = null;

        window.displayGameState();
        window.saveState();

        setTimeout(() => {
            window.checkForConversations();
        }, 600);
    }

    function applyConsequences(consequences, conversation) {
        if (!consequences) return;

        const chanceResults = { success: [], failure: [] };

        const player = window.GameState.team.find(m => m.id === 'player');
        const playerBurnout = player ? (player.burnout || 0) : 0;

        if (playerBurnout >= 90 && Math.random() < 0.4) {
            const penaltyType = Math.random();
            if (penaltyType < 0.33) {
                const moralePenalty = Math.floor(Math.random() * 5) + 3;
                window.GameState.teamMorale = Math.max(0, window.GameState.teamMorale - moralePenalty);
                window.showWarningToast(`⚠️ Extreme burnout caused a mistake. Team morale -${moralePenalty}%`, 3000);
            } else if (penaltyType < 0.66) {
                const moneyLoss = Math.floor(Math.random() * 200) + 100;
                window.GameState.money -= moneyLoss;
                window.showWarningToast(`⚠️ Extreme burnout led to a costly error. Lost $${moneyLoss}`, 3000);
            } else {
                const burnoutIncrease = Math.floor(Math.random() * 3) + 2;
                if (player) {
                    player.burnout = Math.min(100, (player.burnout || 0) + burnoutIncrease);
                }
                window.showWarningToast(`⚠️ Extreme burnout is making everything worse. Burnout +${burnoutIncrease}%`, 3000);
            }
        }

        if (typeof consequences.money === 'number') {
            const oldMoney = window.GameState.money;
            window.GameState.money += consequences.money;
            window.animateResourceChange('money', oldMoney, window.GameState.money);
        }

        if (consequences.teamMorale !== undefined) {
            const oldMorale = window.GameState.teamMorale;
            window.applyTeamMoraleConsequence(consequences.teamMorale);
            window.animateResourceChange('teamMorale', oldMorale, window.GameState.teamMorale);
        }

        if (typeof consequences.playerBurnout === 'number') {
            const player = window.GameState.team.find(m => m.id === 'player');
            if (player) {
                const oldBurnout = player.burnout || 0;
                player.burnout = Math.max(0, Math.min(100, (player.burnout || 0) + consequences.playerBurnout));
                if (Math.abs(player.burnout - oldBurnout) > 0.1) {
                    console.log(`Player burnout: ${Math.round(oldBurnout)}% -> ${Math.round(player.burnout)}%`);
                }
            }
        }

        if (typeof consequences.playerHours === 'number') {
            const player = window.GameState.team.find(m => m.id === 'player');
            if (player) {
                const oldHours = player.hours || 40;
                player.hours = Math.max(0, Math.min(40, (player.hours || 40) + consequences.playerHours));
                if (Math.abs(player.hours - oldHours) > 0.1) {
                    console.log(`Player hours: ${oldHours.toFixed(1)} -> ${player.hours.toFixed(1)}`);
                }
            }
        }

        if (consequences.projectProgress) {
            const chance = consequences.projectProgress.chance;
            let shouldApply = true;
            
            if (chance !== undefined) {
                const roll = Math.random();
                const success = roll <= chance;
                if (success) {
                    chanceResults.success.push(`Progress roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                } else {
                    chanceResults.failure.push(`Progress roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                    shouldApply = false;
                }
            }
            
            if (shouldApply) {
                const project = window.GameState.projects.find(p => p.id === (consequences.projectProgress.projectId || conversation?.linkedProjectId));
                if (project && project.status !== 'complete') {
                    const oldProgress = project.progress;
                    project.progress = Math.max(0, Math.min(1, project.progress + (consequences.projectProgress.delta || 0)));
                    window.updateProjectSatisfaction(project);
                    window.highlightProject(project.id);
                    console.log(`Project progress updated for ${project.name}: ${Math.round(oldProgress * 100)}% -> ${Math.round(project.progress * 100)}%`);
                }
            }
        }

        if (consequences.clientSatisfaction) {
            const projectId = consequences.clientSatisfaction.projectId || conversation?.linkedProjectId;
            const delta = consequences.clientSatisfaction.delta || 0;
            const chance = consequences.clientSatisfaction.chance;
            let shouldApply = true;
            
            if (chance !== undefined) {
                const roll = Math.random();
                const success = roll <= chance;
                if (success) {
                    chanceResults.success.push(`Client satisfaction roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                } else {
                    chanceResults.failure.push(`Client satisfaction roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                    shouldApply = false;
                }
            }
            
            if (shouldApply) {
                if (projectId === "*" || projectId === "all") {
                    window.GameState.projects.forEach(project => {
                        if (project.status !== 'complete') {
                            project.satisfaction = Math.max(0, Math.min(100, project.satisfaction + delta));
                            window.updateProjectSatisfaction(project);
                        }
                    });
                } else {
                    const project = window.GameState.projects.find(p => p.id === projectId);
                    if (project) {
                        project.satisfaction = Math.max(0, Math.min(100, project.satisfaction + delta));
                        window.updateProjectSatisfaction(project);
                    }
                }
            }
        }

        if (consequences.scopeChange) {
            window.handleScopeCreepRequest(consequences.scopeChange);
        }

        if (consequences.spawnConversations) {
            consequences.spawnConversations.forEach(convId => queueConversation(convId));
        }

        if (consequences.addProject) {
            const templateId = consequences.addProject.templateId;
            if (Array.isArray(window.AllProjectTemplates)) {
                const template = window.AllProjectTemplates.find(t => t && t.id === templateId);
                if (template) {
                    const newProject = window.buildProjectFromTemplate(template, {
                        id: `proj-${Date.now()}`,
                        progress: 0,
                        weeksRemaining: template.totalWeeks
                    });
                    window.GameState.projects.push(window.hydrateProject(newProject));
                    window.showSuccessToast(`📋 New project added: ${template.name}`, 3000);
                }
            }
        }

        if (consequences.removeTeamMember) {
            const memberId = consequences.removeTeamMember;
            const member = window.GameState.team.find(m => m.id === memberId);
            if (member && member.id !== 'player') {
                member.hasQuit = true;
                member.currentAssignment = null;
                window.GameState.gameStats.teamMemberQuits++;
                window.recordKeyMoment('Team Member Quit', `${member.name} left the agency`, 'failure');
                window.GameState.conversationHistory.push({
                    title: `${member.name} Quit`,
                    message: `${member.name} left the agency.`,
                    type: 'error',
                    timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                });
                window.GameState.projects.forEach(project => {
                    if (project.teamAssigned && project.teamAssigned.includes(memberId)) {
                        project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
                    }
                });
                window.recalculateTeamMorale();
                window.showWarningToast(`👋 ${member.name} has left the agency`, 4000);
            }
        }

        if (consequences.teamMemberHours) {
            const memberId = consequences.teamMemberHours.memberId;
            const delta = consequences.teamMemberHours.delta || 0;
            const chance = consequences.teamMemberHours.chance;
            let shouldApply = true;
            
            if (chance !== undefined) {
                const roll = Math.random();
                const success = roll <= chance;
                if (success) {
                    chanceResults.success.push(`Hours loss roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                } else {
                    chanceResults.failure.push(`Hours loss roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                    shouldApply = false;
                }
            }
            
            if (shouldApply) {
                const member = window.GameState.team.find(m => m.id === memberId);
                if (member && member.id !== 'player') {
                    const oldHours = member.hours || 8;
                    member.hours = Math.max(0, (member.hours || 8) + delta);
                    if (Math.abs(member.hours - oldHours) > 0.1) {
                        console.log(`Team member ${member.name} hours: ${oldHours.toFixed(1)} -> ${member.hours.toFixed(1)}`);
                    }
                }
            }
        }

        if (consequences.portfolioBonus) {
            const chance = consequences.portfolioBonus.chance || 1;
            const value = consequences.portfolioBonus.value || 0;
            
            const roll = Math.random();
            const success = roll <= chance;
            if (success) {
                chanceResults.success.push(`Portfolio bonus roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                window.showSuccessToast(`🏆 Portfolio piece! This work stands out.`, 3000);
            } else {
                chanceResults.failure.push(`Portfolio bonus roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                window.showWarningToast(`⚠️ The extra work didn't pan out as hoped.`, 3000);
            }
        }

        if (consequences.paymentReceived) {
            const chance = consequences.paymentReceived.chance || 1;
            const amount = consequences.paymentReceived.amount || 0;
            
            const roll = Math.random();
            const success = roll <= chance;
            if (success) {
                chanceResults.success.push(`Payment received roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                window.GameState.money += amount;
                window.showSuccessToast(`💰 Payment received: $${amount}`, 3000);
            } else {
                chanceResults.failure.push(`Payment received roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                window.showWarningToast(`⏳ Payment still pending...`, 3000);
            }
        }

        if (consequences.relationshipDamage) {
            const chance = consequences.relationshipDamage.chance || 1;
            const projectId = consequences.relationshipDamage.projectId;
            const severity = consequences.relationshipDamage.severity || 'medium';
            
            const roll = Math.random();
            const success = roll <= chance;
            if (success) {
                chanceResults.failure.push(`Relationship damage roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✗`);
                const project = window.GameState.projects.find(p => p.id === projectId);
                if (project) {
                    const damage = severity === 'high' ? -25 : severity === 'medium' ? -15 : -10;
                    project.satisfaction = Math.max(0, project.satisfaction + damage);
                    window.updateProjectSatisfaction(project);
                    window.showWarningToast(`💔 Relationship strained with ${project.client}`, 3000);
                }
            } else {
                chanceResults.success.push(`Relationship damage roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✓`);
                window.showSuccessToast(`🤝 They understand. Relationship intact.`, 3000);
            }
        }

        if (consequences.projectCancellation) {
            const chance = consequences.projectCancellation.chance || 1;
            const projectId = consequences.projectCancellation.projectId;
            
            const roll = Math.random();
            const success = roll <= chance;
            if (success) {
                chanceResults.failure.push(`Project cancellation roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✗`);
                const project = window.GameState.projects.find(p => p.id === projectId);
                if (project) {
                    project.status = 'cancelled';
                    window.GameState.gameStats.projectsFailed++;
                    window.recordKeyMoment('Project Cancelled', `${project.name} was cancelled by the client`, 'failure');
                    window.showWarningToast(`❌ ${project.client} cancelled the project`, 4000);
                }
            } else {
                chanceResults.success.push(`Project cancellation roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✓`);
                window.showSuccessToast(`✓ They're frustrated but staying.`, 3000);
            }
        }

        if (consequences.futureOpportunity) {
            const chance = consequences.futureOpportunity.chance || 1;
            const type = consequences.futureOpportunity.type || 'project';
            const value = consequences.futureOpportunity.value || 10000;
            
            const roll = Math.random();
            const success = roll <= chance;
            if (success) {
                chanceResults.success.push(`Future opportunity roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                window.showSuccessToast(`🌟 Great connection! They want to work with you.`, 3000);
            } else {
                chanceResults.failure.push(`Future opportunity roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
                console.log('No meaningful connections made this time.');
            }
        }

        if (chanceResults.success.length > 0 || chanceResults.failure.length > 0) {
            const messages = [...chanceResults.success, ...chanceResults.failure];
            console.log('🎲 Chance rolls:', messages.join(' | '));
            if (chanceResults.success.length > 0 && chanceResults.failure.length === 0) {
                window.showSuccessToast(`🎲 Everything worked out!`, 2000);
            } else if (chanceResults.failure.length > 0 && chanceResults.success.length === 0) {
                window.showWarningToast(`🎲 Didn't work out this time`, 2000);
            } else if (chanceResults.success.length > 0 && chanceResults.failure.length > 0) {
                window.showInfoToast(`🎲 Mixed results`, 2000);
            }
        }
    }

    function triggerTeamEvent(target, eventType) {
        const member = typeof target === 'string' ? window.getTeamMemberById(target) : target;
        if (!member) return;

        const eventMap = {
            low_morale: `team_low_morale_${member.id}`,
            high_morale: `team_high_morale_${member.id}`,
            perfectionist_polish: 'mike_extension_request',
            pragmatic_scope: 'sarah_scope_suggestion',
            eager_help: 'alex_needs_help',
            eager_conflict: 'team_conflict',
            eager_brilliant: 'alex_brilliant_idea'
        };

        const conversationId = eventMap[eventType];
        if (!conversationId) {
            console.log(`Team event triggered without conversation: ${eventType}`);
            return;
        }
        queueConversation(conversationId);
    }

    function checkTeamEvents() {
        window.GameState.team.forEach(member => {
            if (member.id === 'player') return;
            if (!member.personality || !member.personality.type) return;

            if (member.personality.type === 'perfectionist' && member.currentAssignment && Math.random() < 0.05) {
                triggerTeamEvent(member, 'perfectionist_polish');
            }

            if (member.personality.type === 'pragmatic' && member.currentAssignment && Math.random() < 0.05) {
                triggerTeamEvent(member, 'pragmatic_scope');
            }

            if (member.personality.type === 'eager' && member.currentAssignment && Math.random() < 0.08) {
                triggerTeamEvent(member, 'eager_help');
            }

            if (member.personality.type === 'eager' && member.currentAssignment && Math.random() < 0.04) {
                triggerTeamEvent(member, 'eager_brilliant');
            }
        });

        const mike = window.getTeamMemberById('mike_designer');
        const alex = window.getTeamMemberById('alex_junior');
        if (mike && alex && mike.currentAssignment && mike.currentAssignment === alex.currentAssignment && Math.random() < 0.03) {
            triggerTeamEvent(mike, 'eager_conflict');
        }
    }

    function getAverageClientSatisfaction() {
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete' && p.satisfaction !== undefined);
        if (activeProjects.length === 0) return 0;
        const total = activeProjects.reduce((sum, p) => sum + (p.satisfaction || 0), 0);
        return total / activeProjects.length;
    }

    function checkConditionalConversations() {
        if (!Array.isArray(window.AllConversations)) return;
        if (window.currentConversation !== null) return;

        const player = window.GameState.team.find(m => m.id === 'player');
        const playerBurnout = player ? (player.burnout || 0) : 0;
        const avgSatisfaction = getAverageClientSatisfaction();
        const resolved = window.GameState.resolvedConversations;

        const conditionalConversations = [];

        if (window.GameState.currentHour === 13 && player && player.hours > 4) {
            if (!resolved.includes('lunch_break_reminder')) {
                conditionalConversations.push('lunch_break_reminder');
            }
        }

        if (window.GameState.currentHour >= 22 && player && player.hours !== undefined && player.hours !== null) {
            if (!resolved.includes('bedtime_reminder')) {
                conditionalConversations.push('bedtime_reminder');
            }
        }

        if (playerBurnout >= 60 && Math.random() < 0.35) {
            if (!resolved.includes('bedtime_reminder')) {
                conditionalConversations.push('bedtime_reminder');
            }
        } else if (playerBurnout >= 40 && Math.random() < 0.25) {
            if (!resolved.includes('bedtime_reminder')) {
                conditionalConversations.push('bedtime_reminder');
            }
        }

        if (playerBurnout >= 60 && Math.random() < 0.30) {
            if (!resolved.includes('exercise_reminder')) {
                conditionalConversations.push('exercise_reminder');
            }
        } else if (playerBurnout > 40 && Math.random() < 0.15) {
            if (!resolved.includes('exercise_reminder')) {
                conditionalConversations.push('exercise_reminder');
            }
        }

        if (Math.random() < 0.08) {
            const randomNonProject = [
                'electricity_bill',
                'office_supplies_order',
                'software_subscription'
            ].filter(id => !resolved.includes(id));
            if (randomNonProject.length > 0) {
                conditionalConversations.push(randomNonProject[Math.floor(Math.random() * randomNonProject.length)]);
            }
        }

        if (window.GameState.currentWeek >= 3 && window.GameState.currentWeek <= 10 && Math.random() < 0.05) {
            if (!resolved.includes('design_conference_invite')) {
                conditionalConversations.push('design_conference_invite');
            }
        }

        if (window.GameState.currentWeek >= 4 && window.GameState.currentWeek <= 11 && Math.random() < 0.04) {
            if (!resolved.includes('networking_event')) {
                conditionalConversations.push('networking_event');
            }
        }

        if (avgSatisfaction > 50 && window.GameState.currentWeek >= 2 && window.GameState.currentWeek <= 10) {
            const projectRequests = [
                { id: 'new_project_request_enterprise', prob: 0.08, minWeek: 3, maxWeek: 9 },
                { id: 'new_project_request_small_business', prob: 0.12, minWeek: 2, maxWeek: 10 },
                { id: 'new_project_request_startup', prob: 0.10, minWeek: 3, maxWeek: 8 },
                { id: 'new_project_request_rebrand', prob: 0.09, minWeek: 4, maxWeek: 9 }
            ];

            projectRequests.forEach(req => {
                if (window.GameState.currentWeek >= req.minWeek && 
                    window.GameState.currentWeek <= req.maxWeek &&
                    !resolved.includes(req.id) &&
                    Math.random() < req.prob) {
                    conditionalConversations.push(req.id);
                }
            });
        }

        conditionalConversations.forEach(convId => {
            if (!window.GameState.conversationQueue.includes(convId) && !resolved.includes(convId)) {
                queueConversation(convId);
            }
        });
    }

    function checkTeamPulse() {
        const lowMoraleMembers = window.GameState.team.filter(m =>
            m.id !== 'player' && m.morale && typeof m.morale.current === 'number' && m.morale.current < 40
        );

        const burnedOutMembers = window.GameState.team.filter(m =>
            m.id !== 'player' && m.morale && typeof m.morale.current === 'number' && m.morale.current < 5
        );

        if (burnedOutMembers.length > 0) {
            burnedOutMembers.forEach(member => {
                if (!member.hasQuit) {
                    member.hasQuit = true;
                    window.GameState.gameStats.teamMemberQuits++;
                    window.recordKeyMoment('Team Member Quit', `${member.name} left the agency due to burnout`, 'failure');
                    window.GameState.conversationHistory.push({
                        title: `${member.name} Quit`,
                        message: `${member.name} couldn't take it anymore and left the agency.`,
                        type: 'error',
                        timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                    });
                }
            });
        }

        if (lowMoraleMembers.length > 0 && burnedOutMembers.length === 0) {
            if (Array.isArray(window.AllConversations)) {
                const pulseConv = window.AllConversations.find(c => c && c.id === 'team_pulse_check');
                if (pulseConv) {
                    const dynamicConv = {
                        ...pulseConv,
                        week: window.GameState.currentWeek,
                        day: window.GameState.currentDay,
                        body: `
                        It's the end of the week and a few folks look worn down:<br>
                        ${lowMoraleMembers.map(m => {
                            const morale = m.morale && typeof m.morale.current === 'number' ? m.morale.current : 0;
                            return `• <strong>${m.name}</strong> (${morale}%)`;
                        }).join('<br>')}<br><br>
                        How do you want to respond?`
                    };
                    window.displayConversation(dynamicConv);
                }
            }
        }
    }

    return {
        getCurrentConversation: () => currentConversation,
        setCurrentConversation: (conv) => { currentConversation = conv; },
        getSelectedChoiceId: () => selectedChoiceId,
        setSelectedChoiceId: (id) => { selectedChoiceId = id; },
        getCurrentConversationStartTime: () => currentConversationStartTime,
        setCurrentConversationStartTime: (time) => { currentConversationStartTime = time; },
        getCurrentConversationMeta: () => currentConversationMeta,
        setCurrentConversationMeta: (meta) => { currentConversationMeta = meta; },
        recordConversationResponse,
        triggerClientEvent,
        deferConversation,
        isConversationDeferred,
        purgeDeferredConversations,
        getCurrentConversations,
        checkForConversations,
        queueConversation,
        handleChoice,
        submitConversationChoice,
        applyConsequences,
        triggerTeamEvent,
        checkTeamEvents,
        checkTeamPulse,
        getAverageClientSatisfaction,
        checkConditionalConversations
    };
})();

// Expose on window for backward compatibility
Object.defineProperty(window, 'currentConversation', {
    get: () => ConversationsModule.getCurrentConversation(),
    set: (val) => ConversationsModule.setCurrentConversation(val)
});
Object.defineProperty(window, 'selectedChoiceId', {
    get: () => ConversationsModule.getSelectedChoiceId(),
    set: (val) => ConversationsModule.setSelectedChoiceId(val)
});
Object.defineProperty(window, 'currentConversationStartTime', {
    get: () => ConversationsModule.getCurrentConversationStartTime(),
    set: (val) => ConversationsModule.setCurrentConversationStartTime(val)
});
Object.defineProperty(window, 'currentConversationMeta', {
    get: () => ConversationsModule.getCurrentConversationMeta(),
    set: (val) => ConversationsModule.setCurrentConversationMeta(val)
});
window.recordConversationResponse = ConversationsModule.recordConversationResponse;
window.triggerClientEvent = ConversationsModule.triggerClientEvent;
window.deferConversation = ConversationsModule.deferConversation;
window.isConversationDeferred = ConversationsModule.isConversationDeferred;
window.purgeDeferredConversations = ConversationsModule.purgeDeferredConversations;
window.getCurrentConversations = ConversationsModule.getCurrentConversations;
window.checkForConversations = ConversationsModule.checkForConversations;
window.queueConversation = ConversationsModule.queueConversation;
window.handleChoice = ConversationsModule.handleChoice;
window.submitConversationChoice = ConversationsModule.submitConversationChoice;
window.applyConsequences = ConversationsModule.applyConsequences;
window.triggerTeamEvent = ConversationsModule.triggerTeamEvent;
window.checkTeamEvents = ConversationsModule.checkTeamEvents;
window.checkTeamPulse = ConversationsModule.checkTeamPulse;
window.getAverageClientSatisfaction = ConversationsModule.getAverageClientSatisfaction;
window.checkConditionalConversations = ConversationsModule.checkConditionalConversations;

