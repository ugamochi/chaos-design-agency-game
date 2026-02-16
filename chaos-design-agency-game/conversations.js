// Conversation management logic
// BURNOUT RULE: Never write to member.burnout directly!
// ALWAYS use adjustBurnout() from state.js

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
                
                // Track client response timestamp for silence detection
                if (!window.GameState.lastClientResponseTime) {
                    window.GameState.lastClientResponseTime = {};
                }
                window.GameState.lastClientResponseTime[linkedProjectId] = Date.now();
                
                // Track client check-in frequency
                if (!window.GameState.clientCheckInsPerProject) {
                    window.GameState.clientCheckInsPerProject = {};
                }
                window.GameState.clientCheckInsPerProject[linkedProjectId] = 
                    (window.GameState.clientCheckInsPerProject[linkedProjectId] || 0) + 1;
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

    const ALLOWED_REPEAT_CONVERSATIONS = [
        'lunch_break_reminder',
        'bedtime_reminder',
        'exercise_reminder'
    ];

    function getCurrentConversations() {
        if (!Array.isArray(window.AllConversations)) {
            return [];
        }
        return window.AllConversations.filter(conv => {
            if (!conv || conv.week === 0 && conv.day === 0) return false;

            const matchesTime = conv.week === window.GameState.currentWeek && conv.day === window.GameState.currentDay;

            const notResolved = !window.GameState.resolvedConversations.includes(conv.id);

            const notShownToday = !window.GameState.shownConversationsToday || 
                                 !window.GameState.shownConversationsToday.includes(conv.id) ||
                                 ALLOWED_REPEAT_CONVERSATIONS.includes(conv.id);

            return matchesTime && notResolved && notShownToday;
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

    function markConversationAsShown(conversationId) {
        if (!window.GameState.shownConversationsToday) {
            window.GameState.shownConversationsToday = [];
        }
        if (!window.GameState.shownConversationsToday.includes(conversationId)) {
            window.GameState.shownConversationsToday.push(conversationId);
        }
    }

    function checkForConversations() {
        let conversations = getCurrentConversations().filter(conv => !isConversationDeferred(conv.id));

        if (conversations.length > 0) {
            conversations = shuffleArray(conversations);
            
            conversations.slice(1).forEach(conv => {
                queueConversation(conv.id);
            });

            const conversationToShow = conversations[0];
            markConversationAsShown(conversationToShow.id);
            window.displayConversation(conversationToShow);
        } else if (window.GameState.conversationQueue.length > 0 && window.currentConversation === null) {
            const nextConvId = window.GameState.conversationQueue.shift();
            if (Array.isArray(window.AllConversations)) {
                const nextConv = window.AllConversations.find(c => c && c.id === nextConvId);
                if (nextConv) {
                    markConversationAsShown(nextConv.id);
                    window.displayConversation(nextConv);
                }
            }
        }
    }

    function queueConversation(conversationId) {
        if (!window.GameState.conversationQueue.includes(conversationId) && 
            !window.GameState.resolvedConversations.includes(conversationId)) {
            window.GameState.conversationQueue.push(conversationId);
            window.updateNotificationBadge();
        }
    }

    function handleChoice(conversationId, choiceId) {
        if (!currentConversation || currentConversation.id !== conversationId) {
            console.warn('Conversation mismatch or no active conversation');
            return;
        }

        // Prevent changing choice if response is already sent
        if (isSubmitting) {
            return;
        }
        
        const conversationContainer = document.querySelector('.conversation-container');
        if (conversationContainer && conversationContainer.classList.contains('response-sent')) {
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

    let isSubmitting = false;

    function submitConversationChoice() {
        // STEP 1: LOCK IMMEDIATELY (FIRST LINE!)
        if (isSubmitting) {
            console.warn('Already submitting, ignoring click');
            return;
        }
        isSubmitting = true;
        
        // STEP 2: DISABLE ALL BUTTONS IMMEDIATELY
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
        });
        
        const sendBtn = document.querySelector('.send-response-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
        }
        
        // STEP 3: VISUAL FEEDBACK (early)
        const conversationContainer = document.querySelector('.conversation-container');
        if (conversationContainer) {
            conversationContainer.classList.add('response-sent');
        }
        
        // STEP 4: VALIDATION (after locking)
        if (!currentConversation || !selectedChoiceId) {
            isSubmitting = false;
            // Re-enable buttons if validation fails
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
            if (conversationContainer) {
                conversationContainer.classList.remove('response-sent');
            }
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            return;
        }

        try {
            const choice = currentConversation.choices.find(c => c.id === selectedChoiceId);
            if (!choice) {
                isSubmitting = false;
                // Re-enable buttons if choice not found
                document.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                if (sendBtn) {
                    sendBtn.disabled = false;
                }
                return;
            }

            // Advance time by 0.5 hours when replying to message
            // This deducts hours from player and workers, and moves clock forward
            if (window.advanceTimeByHours) {
                window.advanceTimeByHours(0.5);
            } else {
                // Fallback if timer not initialized
                // Use same burnout calculation as timer (0.1x per hour) for consistency
                const player = window.GameState.team.find(m => m.id === 'player');
                if (player) {
                    const hoursSpent = 0.5;
                    const hoursBefore = player.hours || 0;
                    const wasInOvertime = hoursBefore < 0;
                    player.hours = hoursBefore - hoursSpent;
                    
                    const isNowInOvertime = player.hours < 0;
                    if (isNowInOvertime) {
                        // Calculate burnout only for new overtime hours
                        let hoursInOvertime = 0;
                        if (!wasInOvertime) {
                            // Just entered overtime - calculate for hours that pushed into negative
                            hoursInOvertime = Math.abs(player.hours);
                        } else {
                            // Already in overtime - calculate only for additional hours
                            hoursInOvertime = hoursSpent;
                        }
                        
                        // Use centralized burnout calculation (5% per hour)
                        if (window.calculateOvertimeBurnout && hoursInOvertime > 0) {
                            window.calculateOvertimeBurnout(player.id, hoursInOvertime);
                        }
                    }
                }
                // Update time using minutes to avoid decimal hours
                if (window.GameState.currentMinute === undefined) {
                    window.GameState.currentMinute = 0;
                }
                window.GameState.currentMinute += 30; // 0.5 hours = 30 minutes
                if (window.GameState.currentMinute >= 60) {
                    const hoursToAdd = Math.floor(window.GameState.currentMinute / 60);
                    window.GameState.currentMinute = window.GameState.currentMinute % 60;
                    window.GameState.currentHour = Math.floor((window.GameState.currentHour || 9) + hoursToAdd);
                } else {
                    window.GameState.currentHour = Math.floor(window.GameState.currentHour || 9);
                }
                window.updateClock();
            }

            // Update UI to show response is sent and locked (buttons already disabled early)
            if (conversationContainer) {
                // Mark selected choice button
                const choiceButtons = document.querySelectorAll('.choice-btn');
                choiceButtons.forEach(btn => {
                    if (btn.dataset.choiceId === selectedChoiceId) {
                        btn.classList.add('sent-choice');
                        btn.style.opacity = '0.6';
                    } else {
                        btn.style.opacity = '0.4';
                    }
                });
                
                // Update send button to show sent state
                if (sendBtn) {
                    sendBtn.textContent = '✓ Response Sent';
                    sendBtn.classList.add('response-sent-btn');
                    sendBtn.style.cursor = 'default';
                }
                
                // Disable remind button
                const remindBtn = document.querySelector('.remind-btn');
                if (remindBtn) {
                    remindBtn.disabled = true;
                    remindBtn.style.opacity = '0.6';
                    remindBtn.style.cursor = 'not-allowed';
                }
                
                // Add visual indicator
                const responseIndicator = document.createElement('div');
                responseIndicator.className = 'response-sent-indicator';
                responseIndicator.innerHTML = '⏱️ Response sent - Clock is running';
                conversationContainer.insertBefore(responseIndicator, conversationContainer.querySelector('.conversation-actions'));
            }

            recordConversationResponse(currentConversation);
            applyConsequences(choice.consequences || {}, currentConversation);
            window.showConsequenceFeedback(choice.flavorText || '', choice.consequences || {});

            // Mark as resolved IMMEDIATELY
            const conversationId = currentConversation.id;
            window.GameState.resolvedConversations.push(conversationId);
            
            // Remove conversation from queue if it's there
            const queueIndex = window.GameState.conversationQueue.indexOf(conversationId);
            if (queueIndex > -1) {
                window.GameState.conversationQueue.splice(queueIndex, 1);
            }
            
            // Clear current conversation state IMMEDIATELY
            window.currentConversation = null;
            window.selectedChoiceId = null;
            currentConversation = null;
            selectedChoiceId = null;

            // Remove conversation container from DOM IMMEDIATELY
            if (conversationContainer) {
                conversationContainer.style.opacity = '0';
                conversationContainer.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    conversationContainer.remove();
                }, 300);
            }

            window.displayGameState();
            window.saveState();

            setTimeout(() => {
                isSubmitting = false;
                window.checkForConversations();
            }, 600);
        } catch (error) {
            console.error('Error submitting conversation choice:', error);
            isSubmitting = false;
            // Re-enable buttons on error
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
            if (sendBtn) {
                sendBtn.disabled = false;
            }
        }
    }

    function replaceConsequencePlaceholders(consequences, conversation) {
        if (!consequences || typeof consequences !== 'object') {
            return consequences;
        }

        // BUG FIX #7: Validate conversationMemberMap exists and has mapping
        const memberId = conversation && window.GameState.conversationMemberMap && 
                         window.GameState.conversationMemberMap[conversation.id];
        
        // BUG FIX #7: If no mapping found, use fallback
        let fallbackMemberId = null;
        if (!memberId && conversation) {
            console.warn(`No member mapping for conversation ${conversation.id}, using fallback`);
            // Fallback to first non-player team member
            const fallbackMember = window.GameState.team.find(m => m.id !== 'player' && !m.hasQuit);
            if (fallbackMember) {
                fallbackMemberId = fallbackMember.id;
                console.log(`Using fallback member: ${fallbackMemberId}`);
            } else {
                console.error('No team members available for placeholder replacement');
            }
        }
        
        const effectiveMemberId = memberId || fallbackMemberId;
        
        // Get linked project ID
        const linkedProjectId = conversation?.linkedProjectId;

        // Recursively replace placeholders in the consequences object
        const replaced = Array.isArray(consequences) ? [...consequences] : { ...consequences };
        
        for (const key in replaced) {
            if (replaced.hasOwnProperty(key)) {
                const value = replaced[key];
                
                if (typeof value === 'string') {
                    // Replace {{MEMBER}} with actual member ID
                    if (value === '{{MEMBER}}') {
                        if (effectiveMemberId) {
                            replaced[key] = effectiveMemberId;
                        } else {
                            console.error(`Cannot replace {{MEMBER}} placeholder - no member ID available`);
                        }
                    }
                    // Replace {{LINKED}} with linked project ID
                    else if (value === '{{LINKED}}') {
                        if (linkedProjectId) {
                            replaced[key] = linkedProjectId;
                        } else {
                            console.error(`Cannot replace {{LINKED}} placeholder - no linked project ID`);
                        }
                    }
                } else if (typeof value === 'object' && value !== null) {
                    // BUG FIX #7: Recursively process both objects AND arrays
                    replaced[key] = replaceConsequencePlaceholders(value, conversation);
                }
            }
        }
        
        return replaced;
    }

    function applyConsequences(consequences, conversation) {
        if (!consequences) return;

        // Replace placeholders in consequences before applying
        consequences = replaceConsequencePlaceholders(consequences, conversation);

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
                if (player && window.adjustBurnout) {
                    window.adjustBurnout(player.id, burnoutIncrease, 'Extreme burnout penalty');
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
            if (player && window.adjustBurnout) {
                const conversationSubject = conversation?.subject || conversation?.title || 'Unknown conversation';
                // BUG FIX #6: Use constant for burnout relief effectiveness
                const C = window.GameConstants || {};
                const reliefEffectiveness = C.BURNOUT_RELIEF_EFFECTIVENESS || 0.60;
                
                // REDUCED RELIEF: Make burnout relief less effective for urgency
                // Burnout is harder to reduce - player must make strategic choices
                const reliefAmount = consequences.playerBurnout < 0 
                    ? Math.round(consequences.playerBurnout * reliefEffectiveness) // 60% effectiveness for relief
                    : consequences.playerBurnout; // Keep increases as-is
                window.adjustBurnout(
                    player.id,
                    reliefAmount,
                    `Conversation: ${conversationSubject}`
                );
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
                    chanceResults.success.push(`Client reputation roll: ${Math.round(roll * 100)}% <= ${Math.round(chance * 100)}% ✓`);
                } else {
                    chanceResults.failure.push(`Client reputation roll: ${Math.round(roll * 100)}% > ${Math.round(chance * 100)}% ✗`);
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
                    // PENALTY 3: Client reputation damage - reduce budget based on deadline history
                    let budgetMultiplier = 1.0;
                    const stats = window.GameState.gameStats;
                    const deadlinesMissed = stats.deadlinesMissed || 0;
                    const projectsCompleted = stats.projectsCompleted || 0;
                    
                    if (projectsCompleted > 0 && deadlinesMissed > 0) {
                        const missRatio = deadlinesMissed / projectsCompleted;
                        if (missRatio >= 0.5) {
                            budgetMultiplier = 0.7; // 30% budget cut if 50%+ deadline miss rate
                        } else if (missRatio >= 0.3) {
                            budgetMultiplier = 0.85; // 15% budget cut if 30%+ deadline miss rate
                        } else if (missRatio >= 0.1) {
                            budgetMultiplier = 0.95; // 5% budget cut if 10%+ deadline miss rate
                        }
                    }
                    
                    const adjustedBudget = Math.round(template.budget * budgetMultiplier);
                    
                    const newProject = window.buildProjectFromTemplate(template, {
                        id: `proj-${Date.now()}`,
                        progress: 0,
                        weeksRemaining: template.totalWeeks,
                        budget: adjustedBudget
                    });
                    window.GameState.projects.push(window.hydrateProject(newProject));
                    
                    if (budgetMultiplier < 1.0) {
                        window.showWarningToast(`📋 New project added: ${template.name} (Budget reduced to $${adjustedBudget.toLocaleString()} due to reputation damage)`, 4000);
                        window.GameState.conversationHistory.push({
                            title: `⚠️ Reputation Impact`,
                            message: `${template.client} offered lower budget ($${adjustedBudget.toLocaleString()} vs usual $${template.budget.toLocaleString()}) due to your history of missed deadlines.`,
                            type: 'warning',
                            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
                        });
                    } else {
                        window.showSuccessToast(`📋 New project added: ${template.name}`, 3000);
                    }
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
                // Remove from all projects and their phases
                window.GameState.projects.forEach(project => {
                    if (window.removeTeamMemberFromProject) {
                        window.removeTeamMemberFromProject(memberId, project.id);
                    } else {
                        // Fallback if function not available
                        if (project.teamAssigned && project.teamAssigned.includes(memberId)) {
                            project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
                        }
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
            perfectionist_polish: `team_extension_request_${member.id}`,
            pragmatic_scope: `team_scope_suggestion_${member.id}`,
            eager_help: `team_needs_help_${member.id}`,
            eager_conflict: 'team_conflict',
            eager_brilliant: `team_brilliant_idea_${member.id}`
        };

        const fallbackMap = {
            perfectionist_polish: 'team_extension_request',
            pragmatic_scope: 'team_scope_suggestion',
            eager_help: 'team_needs_help',
            eager_brilliant: 'team_brilliant_idea'
        };

        let conversationId = eventMap[eventType];
        if (!conversationId) {
            console.log(`Team event triggered without conversation: ${eventType}`);
            return;
        }
        
        // Try dynamic ID first, fall back to generic template if not found
        let foundConversation = window.AllConversations && window.AllConversations.find(c => c && c.id === conversationId);
        if (!foundConversation) {
            const fallbackId = fallbackMap[eventType];
            if (fallbackId) {
                // Try generic template first
                foundConversation = window.AllConversations && window.AllConversations.find(c => c && c.id === fallbackId);
                if (foundConversation) {
                    conversationId = fallbackId;
                } else {
                    // Fall back to old hardcoded conversations for backward compatibility
                    const legacyMap = {
                        perfectionist_polish: 'tanue_extension_request',
                        pragmatic_scope: 'pasha_scope_suggestion',
                        eager_help: 'sasha_needs_help',
                        eager_brilliant: 'sasha_brilliant_idea'
                    };
                    const legacyId = legacyMap[eventType];
                    if (legacyId) {
                        foundConversation = window.AllConversations && window.AllConversations.find(c => c && c.id === legacyId);
                        if (foundConversation) {
                            conversationId = legacyId;
                        }
                    }
                }
            }
        }
        
        if (!foundConversation) {
            console.log(`No conversation found for event type: ${eventType}`);
            return;
        }
        
        if (window.GameState.resolvedConversations.includes(conversationId)) {
            return;
        }
        
        // Store member info in GameState for name replacement when conversation is displayed
        // This ensures random team members' names replace hardcoded names in conversations
        if (member && !window.GameState.conversationMemberMap) {
            window.GameState.conversationMemberMap = {};
        }
        if (member) {
            window.GameState.conversationMemberMap[conversationId] = member.id;
        }
        
        queueConversation(conversationId);
    }

    // Helper function to check if member has any phase assignments
    function hasPhaseAssignment(memberId) {
        let hasAssignment = false;
        window.GameState.projects.forEach(project => {
            if (!project.phases) return;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes(memberId)) {
                    hasAssignment = true;
                }
            });
        });
        return hasAssignment;
    }

    // Helper function to get project IDs where member is assigned (from phase assignments)
    function getAssignedProjectIds(memberId) {
        const projectIds = new Set();
        window.GameState.projects.forEach(project => {
            if (!project.phases) return;
            let assignedToThisProject = false;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes(memberId)) {
                    assignedToThisProject = true;
                }
            });
            if (assignedToThisProject) {
                projectIds.add(project.id);
            }
        });
        return Array.from(projectIds);
    }

    function checkTeamEvents() {
        window.GameState.team.forEach(member => {
            if (member.id === 'player') return;
            if (!member.personality || !member.personality.type) return;

            // FIX: Check phase assignments instead of legacy currentAssignment
            const hasAssignment = hasPhaseAssignment(member.id) || 
                                  (member.assignedProjects && member.assignedProjects.length > 0) ||
                                  member.currentAssignment; // Fallback for backward compatibility

            if (member.personality.type === 'perfectionist' && hasAssignment && Math.random() < 0.05) {
                triggerTeamEvent(member, 'perfectionist_polish');
            }

            if (member.personality.type === 'pragmatic' && hasAssignment && Math.random() < 0.05) {
                triggerTeamEvent(member, 'pragmatic_scope');
            }

            if (member.personality.type === 'eager' && hasAssignment && Math.random() < 0.08) {
                triggerTeamEvent(member, 'eager_help');
            }

            if (member.personality.type === 'eager' && hasAssignment && Math.random() < 0.04) {
                triggerTeamEvent(member, 'eager_brilliant');
            }
        });

        // Find all team members on the same project (dynamic conflict check)
        const projectAssignments = {};
        window.GameState.team.forEach(member => {
            if (member.id === 'player') return;
            
            // FIX: Get assignments from phase-specific system, with legacy fallback
            const assignments = getAssignedProjectIds(member.id);
            
            // Fallback to legacy fields for backward compatibility
            if (assignments.length === 0) {
                if (member.assignedProjects && member.assignedProjects.length > 0) {
                    assignments.push(...member.assignedProjects);
                } else if (member.currentAssignment) {
                    assignments.push(member.currentAssignment);
                }
            }
            
            assignments.forEach(projectId => {
                if (!projectAssignments[projectId]) {
                    projectAssignments[projectId] = [];
                }
                projectAssignments[projectId].push(member);
            });
        });

        // Check for conflicts on projects with 2+ members
        Object.entries(projectAssignments).forEach(([projectId, members]) => {
            if (members.length >= 2 && Math.random() < 0.03) {
                // Trigger conflict between first two members
                triggerTeamEvent(members[0], 'eager_conflict');
            }
        });
    }

    function getAverageClientSatisfaction() {
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete' && p.satisfaction !== undefined);
        if (activeProjects.length === 0) return 0;
        const total = activeProjects.reduce((sum, p) => sum + (p.satisfaction || 0), 0);
        return total / activeProjects.length;
    }

    // Check for ghost clients (no communication for 10+ game days)
    function checkClientSilence() {
        const TEN_DAYS_GAME_TIME = 10; // In game days
        const resolved = window.GameState.resolvedConversations || [];
        
        window.GameState.projects.forEach(project => {
            if (project.status === 'complete') return;
            
            const lastResponse = window.GameState.lastClientResponseTime?.[project.id];
            if (!lastResponse) return;
            
            // Calculate days since last response based on game time progression
            const daysSinceResponse = (Date.now() - lastResponse) / (1000 * 60); // Rough approximation
            // Or track via game days elapsed
            
            // Simpler approach: track last interaction week/day
            if (!project.lastClientInteractionWeek) {
                project.lastClientInteractionWeek = window.GameState.currentWeek;
                project.lastClientInteractionDay = window.GameState.currentDay;
            }
            
            const daysPassed = 
                (window.GameState.currentWeek - project.lastClientInteractionWeek) * 7 + 
                (window.GameState.currentDay - project.lastClientInteractionDay);
            
            if (daysPassed >= TEN_DAYS_GAME_TIME) {
                const ghostId = `client_ghost_return_${project.id}`;
                if (!resolved.includes(ghostId) && !resolved.includes('client_ghost_return')) {
                    queueConversation('client_ghost_return', project.id);
                }
            }
        });
    }

    // Check worker morale for character-specific conversations
    function checkWorkerMoraleConversations() {
        const team = window.GameState.team;
        const projects = window.GameState.projects;
        const resolved = window.GameState.resolvedConversations || [];
        const player = team.find(m => m.id === 'player');
        
        // Find workers by role (dynamic - works with random teams)
        const designers = team.filter(m => m.role?.toLowerCase() === 'designer' && m.id !== 'player' && !m.hasQuit);
        const developers = team.filter(m => m.role?.toLowerCase() === 'developer' && m.id !== 'player' && !m.hasQuit);
        const juniors = team.filter(m => m.role?.toLowerCase() === 'junior' && m.id !== 'player' && !m.hasQuit);
        
        // DESIGNER CONVERSATIONS
        designers.forEach(designer => {
            // Kerning Crisis - Design phase >50%, assigned, random chance
            const designerProject = projects.find(p => 
                p.phases?.design?.teamAssigned?.includes(designer.id) &&
                ['active', 'ready'].includes(p.phases?.design?.status) &&
                (p.phases?.design?.progress || 0) > 0.5
            );
            
            if (designerProject && Math.random() < 0.08) { // 8% per check
                const conversationId = `designer_kerning_crisis_${designer.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('designer_kerning_crisis')) {
                    queueConversationWithMember('designer_kerning_crisis', designerProject.id, designer);
                }
            }
            
            // Extension Request - Project in warning, designer assigned
            const warningProject = projects.find(p =>
                p.phases?.design?.teamAssigned?.includes(designer.id) &&
                p.status === 'warning'
            );
            
            if (warningProject) {
                const conversationId = `designer_extension_request_${designer.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('designer_extension_request')) {
                    queueConversationWithMember('designer_extension_request', warningProject.id, designer);
                }
            }
        });
        
        // DEVELOPER CONVERSATIONS
        developers.forEach(developer => {
            // Scope Cut Suggestion - Warning project, <2 weeks remaining
            const devWarningProject = projects.find(p =>
                p.phases?.development?.teamAssigned?.includes(developer.id) &&
                p.status === 'warning' &&
                p.weeksRemaining < 2
            );
            
            if (devWarningProject) {
                const conversationId = `developer_scope_cut_${developer.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('developer_scope_cut')) {
                    queueConversationWithMember('developer_scope_cut', devWarningProject.id, developer);
                }
            }
            
            // LinkedIn Threat - Low morale OR player overtime
            if (developer.morale?.current < 50 || (player && player.hours < -20)) {
                const conversationId = `developer_linkedin_threat_${developer.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('developer_linkedin_threat')) {
                    queueConversationWithMember('developer_linkedin_threat', null, developer);
                }
            }
            
            // Stupid Client Idea - Random during dev phase
            const devProject = projects.find(p =>
                p.phases?.development?.teamAssigned?.includes(developer.id) &&
                ['active', 'ready'].includes(p.phases?.development?.status)
            );
            
            if (devProject && Math.random() < 0.05) { // 5% per check
                const conversationId = `developer_stupid_idea_${developer.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('developer_stupid_idea')) {
                    queueConversationWithMember('developer_stupid_idea', devProject.id, developer);
                }
            }
        });
        
        // JUNIOR CONVERSATIONS
        juniors.forEach(junior => {
            // Needs Help - Any assignment, random
            const hasAssignment = hasPhaseAssignment(junior.id);
            
            if (hasAssignment && Math.random() < 0.06) {
                const conversationId = `junior_needs_help_${junior.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('junior_needs_help')) {
                    queueConversationWithMember('junior_needs_help', null, junior);
                }
            }
            
            // Brilliant Idea - Low probability, high morale
            if (hasAssignment && junior.morale?.current > 70 && Math.random() < 0.04) {
                const conversationId = `junior_brilliant_idea_${junior.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('junior_brilliant_idea')) {
                    queueConversationWithMember('junior_brilliant_idea', null, junior);
                }
            }
        });
    }

    // Check project status for client conversations  
    function checkProjectStatusConversations() {
        const projects = window.GameState.projects;
        const resolved = window.GameState.resolvedConversations || [];
        
        projects.forEach(project => {
            if (project.status === 'complete') return;
            
            // Scope Creep - mid-project (40-80% complete)
            const overallProgress = project.progress || 0;
            if (overallProgress > 0.4 && overallProgress < 0.8 && Math.random() < 0.04) {
                const conversationId = `client_scope_creep_${project.id}`;
                if (!resolved.includes(conversationId) && !resolved.includes('client_scope_creep_generic')) {
                    queueConversation('client_scope_creep_generic', project.id);
                }
            }
        });
        
        // Payment Delay - before payroll week (every 4 weeks)
        if (window.GameState.currentWeek % 4 === 0 && window.GameState.currentDay < 5) {
            if (Math.random() < 0.15) {
                const activeProject = projects.find(p => p.status === 'ok' && p.progress > 0.5);
                if (activeProject && !resolved.includes('client_payment_delay')) {
                    queueConversation('client_payment_delay', activeProject.id);
                }
            }
        }
    }

    // Check burnout levels for wellness conversations
    function checkBurnoutConversations() {
        const player = window.GameState.team.find(m => m.id === 'player');
        if (!player) return;
        
        const hour = window.GameState.currentHour || 9;
        const resolved = window.GameState.resolvedConversations || [];
        
        // High burnout triggers more frequent reminders
        if (player.burnout >= 70 && Math.random() < 0.2) {
            if (!resolved.includes('burnout_critical_warning')) {
                queueConversation('burnout_critical_warning');
            }
        }
        
        // Overtime weeks trigger conversation
        if ((window.GameState.playerOvertimeWeeks || 0) >= 3) {
            if (!resolved.includes('overtime_intervention')) {
                queueConversation('overtime_intervention');
            }
        }
    }

    // Check capacity for project offers
    function checkCapacityConversations() {
        const projects = window.GameState.projects;
        const activeProjects = projects.filter(p => p.status !== 'complete').length;
        const resolved = window.GameState.resolvedConversations || [];
        
        // Quick job offer - under capacity
        if (activeProjects < 3 && Math.random() < 0.08) {
            if (!resolved.includes('quick_project_offer')) {
                queueConversation('quick_project_offer');
            }
        }
    }

    // Helper to queue conversation with member context
    function queueConversationWithMember(conversationId, projectId, member) {
        // Store member mapping for placeholder replacement
        if (!window.GameState.conversationMemberMap) {
            window.GameState.conversationMemberMap = {};
        }
        window.GameState.conversationMemberMap[conversationId] = member.id;
        
        queueConversation(conversationId, projectId);
    }

    function checkConditionalConversations() {
        if (!Array.isArray(window.AllConversations)) return;
        if (window.currentConversation !== null) return;
        
        // Prevent spam - only check once per hour
        const checkKey = `${window.GameState.currentWeek}-${window.GameState.currentDay}-${window.GameState.currentHour}`;
        if (window.GameState._lastConditionalCheck === checkKey) return;
        window.GameState._lastConditionalCheck = checkKey;

        // Run modular conversation checks
        checkClientSilence();
        checkWorkerMoraleConversations();
        checkProjectStatusConversations();
        checkBurnoutConversations();
        checkCapacityConversations();

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

        // Guarantee new project messages in the first 4 days
        if (window.GameState.currentWeek === 1 && window.GameState.currentDay >= 1 && window.GameState.currentDay <= 4) {
            const firstFourDaysProjectRequests = [
                'new_project_request_small_business',
                'new_project_request_startup',
                'new_project_request_enterprise',
                'new_project_request_rebrand'
            ];
            
            // Get the project request for this specific day (day 1 = index 0, day 2 = index 1, etc.)
            const dayIndex = window.GameState.currentDay - 1;
            const projectRequestId = firstFourDaysProjectRequests[dayIndex];
            
            // Only add if not already resolved and not already in queue
            if (projectRequestId && 
                !resolved.includes(projectRequestId) && 
                !window.GameState.conversationQueue.includes(projectRequestId)) {
                conditionalConversations.push(projectRequestId);
            }
        }

        // Regular new project requests (after first week or if satisfaction is good)
        // Also allow in week 1 if satisfaction is good (for edge cases)
        if (avgSatisfaction > 50 && window.GameState.currentWeek >= 1 && window.GameState.currentWeek <= 10) {
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
            const notInQueue = !window.GameState.conversationQueue.includes(convId);
            const notResolved = !resolved.includes(convId);
            const notShownToday = !window.GameState.shownConversationsToday || 
                                 !window.GameState.shownConversationsToday.includes(convId) ||
                                 ALLOWED_REPEAT_CONVERSATIONS.includes(convId);
            
            if (notInQueue && notResolved && notShownToday) {
                queueConversation(convId);
            }
        });
    }

    function replaceHardcodedNames(conversation) {
        if (!conversation) return conversation;

        const replacements = {};

        const getMemberById = (memberId) => {
            return window.GameState.team.find(m => m.id === memberId) || 
                   window.AllTeamMembers.find(m => m.id === memberId);
        };

        // Handle {Worker} placeholder if conversation was triggered by a team member
        const memberId = window.GameState.conversationMemberMap && window.GameState.conversationMemberMap[conversation.id];
        if (memberId) {
            const member = getMemberById(memberId);
            if (member) {
                replacements['{Worker}'] = member.name;
                replacements['{{MEMBER}}'] = member.name; // Double braces for choice text display
                // Also replace common role-based placeholders
                replacements['{WorkerRole}'] = member.role || member.title || '';
            }
        }

        // If we have a member ID from conversationMemberMap, use that member for replacement
        // This handles random teams - replace hardcoded names with actual team member names
        if (memberId) {
            const member = getMemberById(memberId);
            if (member) {
                // Replace hardcoded names that might appear in old conversations
                replacements['Tanue'] = member.name;
                replacements['Pasha'] = member.name;
                replacements['Sasha'] = member.name;
                // Replace "from" field patterns like "Tanue (Designer)" with actual member info
                replacements['Tanue (Designer)'] = `${member.name} (${member.role || member.title || 'Team Member'})`;
                replacements['Pasha (Developer)'] = `${member.name} (${member.role || member.title || 'Team Member'})`;
                replacements['Sasha (Manager)'] = `${member.name} (${member.role || member.title || 'Team Member'})`;
                replacements['Sasha (Junior)'] = `${member.name} (${member.role || member.title || 'Team Member'})`;
            }
        }
        
        // Legacy hardcoded name replacements for backward compatibility (only if no memberId)
        if (!memberId) {
            const tanue = getMemberById('tanue_designer');
            const pasha = getMemberById('pasha_developer');
            const sasha = getMemberById('sasha_junior');

            if (tanue) {
                replacements['Tanue'] = tanue.name;
            }
            if (pasha) {
                replacements['Pasha'] = pasha.name;
            }
            if (sasha) {
                replacements['Sasha'] = sasha.name;
            }
        }

        if (Object.keys(replacements).length === 0) {
            return conversation;
        }

        const result = { ...conversation };
        
        // Escape regex special characters for use in regex patterns
        const escapeRegex = (str) => {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const replaceInText = (text) => {
            if (!text || typeof text !== 'string') return text;
            let replaced = text;
            Object.entries(replacements).forEach(([oldName, newName]) => {
                // Handle placeholder-style replacements (exact match)
                if (oldName.startsWith('{') && oldName.endsWith('}')) {
                    // Properly escape braces for regex
                    const escaped = escapeRegex(oldName);
                    replaced = replaced.replace(new RegExp(escaped, 'g'), newName);
                } else if (oldName.includes('(') || oldName.includes(')')) {
                    // Handle full string replacements with parentheses (exact match only)
                    // Escape all regex special characters
                    const escaped = escapeRegex(oldName);
                    replaced = replaced.replace(new RegExp(escaped, 'g'), newName);
                } else {
                    // Handle word boundary replacements for simple names
                    const escaped = escapeRegex(oldName);
                    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
                    replaced = replaced.replace(regex, newName);
                }
            });
            return replaced;
        };

        // Special handling for "from" field - replace entire field if it matches hardcoded patterns
        if (result.from && memberId) {
            const member = getMemberById(memberId);
            if (member) {
                // Check if "from" field matches hardcoded patterns
                const hardcodedPatterns = [
                    /^Tanue\s*\([^)]*\)/i,
                    /^Pasha\s*\([^)]*\)/i,
                    /^Sasha\s*\([^)]*\)/i
                ];
                let patternMatched = false;
                for (const pattern of hardcodedPatterns) {
                    if (pattern.test(result.from)) {
                        result.from = `${member.name} (${member.role || member.title || 'Team Member'})`;
                        patternMatched = true;
                        break;
                    }
                }
                // Only use regular replacement if no pattern matched
                if (!patternMatched) {
                    result.from = replaceInText(result.from);
                }
            } else {
                result.from = replaceInText(result.from);
            }
        } else if (result.from) {
            result.from = replaceInText(result.from);
        }
        if (result.body) {
            result.body = replaceInText(result.body);
        }
        if (result.subject) {
            result.subject = replaceInText(result.subject);
        }
        if (result.choices && Array.isArray(result.choices)) {
            result.choices = result.choices.map(choice => {
                const processedChoice = {
                    ...choice,
                    text: replaceInText(choice.text),
                    flavorText: replaceInText(choice.flavorText)
                };
                
                // Also replace placeholders in consequences for display
                if (choice.consequences) {
                    processedChoice.consequences = replaceConsequencePlaceholders(choice.consequences, result);
                }
                
                return processedChoice;
            });
        }

        return result;
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
                    markConversationAsShown(pulseConv.id);
                    window.displayConversation(replaceHardcodedNames(dynamicConv));
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
        checkConditionalConversations,
        replaceHardcodedNames
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
window.replaceHardcodedNames = ConversationsModule.replaceHardcodedNames;

