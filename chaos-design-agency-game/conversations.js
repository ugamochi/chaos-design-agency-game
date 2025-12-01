// Conversation management logic

const ConversationsModule = (function() {
    'use strict';

    let currentConversation = null;
    let selectedChoiceId = null;
    let currentConversationStartTime = null;
    let currentConversationMeta = null;

    function recordConversationResponse(conversation) {
        if (!conversation || window.currentConversationStartTime === null) return;
        const elapsedHours = (Date.now() - window.currentConversationStartTime) / (1000 * 60 * 60);
        const meta = window.currentConversationMeta || {};
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
        Object.entries(window.GameState.deferredConversations).forEach(([id, entry]) => {
            if (entry.week !== window.GameState.currentWeek || entry.day !== window.GameState.currentDay) {
                delete window.GameState.deferredConversations[id];
            }
        });
    }

    function getCurrentConversations() {
        return window.AllConversations.filter(conv => {
            if (conv.week === 0 && conv.day === 0) return false;

            const matchesTime = conv.week === window.GameState.currentWeek && conv.day === window.GameState.currentDay;

            const notResolved = !window.GameState.resolvedConversations.includes(conv.id);

            return matchesTime && notResolved;
        });
    }

    function checkForConversations() {
        const conversations = getCurrentConversations().filter(conv => !isConversationDeferred(conv.id));

        if (conversations.length > 0) {
            conversations.slice(1).forEach(conv => {
                queueConversation(conv.id);
            });

            window.displayConversation(conversations[0]);
        } else if (window.GameState.conversationQueue.length > 0 && window.currentConversation === null) {
            const nextConvId = window.GameState.conversationQueue.shift();
            const nextConv = window.AllConversations.find(c => c.id === nextConvId);
            if (nextConv) {
                window.displayConversation(nextConv);
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
        if (player && player.hours > 0) {
            const hoursSpent = Math.min(player.hours, 0.5);
            player.hours = Math.max(0, player.hours - hoursSpent);
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

        if (consequences.projectProgress) {
            const project = window.GameState.projects.find(p => p.id === (consequences.projectProgress.projectId || conversation?.linkedProjectId));
            if (project && project.status !== 'complete') {
                const oldProgress = project.progress;
                project.progress = Math.max(0, Math.min(1, project.progress + (consequences.projectProgress.delta || 0)));
                window.updateProjectSatisfaction(project);
                window.highlightProject(project.id);
                console.log(`Project progress updated for ${project.name}: ${Math.round(oldProgress * 100)}% -> ${Math.round(project.progress * 100)}%`);
            }
        }

        if (consequences.clientSatisfaction) {
            const project = window.GameState.projects.find(p => p.id === (consequences.clientSatisfaction.projectId || conversation?.linkedProjectId));
            if (project) {
                const delta = consequences.clientSatisfaction.delta || 0;
                project.satisfaction = Math.max(0, Math.min(100, project.satisfaction + delta));
                window.updateProjectSatisfaction(project);
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
            const template = window.AllProjectTemplates.find(t => t.id === templateId);
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

    function checkTeamPulse() {
        const lowMoraleMembers = window.GameState.team.filter(m =>
            m.id !== 'player' && m.morale.current < 40
        );

        const burnedOutMembers = window.GameState.team.filter(m =>
            m.id !== 'player' && m.morale.current < 5
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
            const pulseConv = window.AllConversations.find(c => c.id === 'team_pulse_check');
            if (pulseConv) {
                const dynamicConv = {
                    ...pulseConv,
                    week: window.GameState.currentWeek,
                    day: window.GameState.currentDay,
                    body: `
                    It's the end of the week and a few folks look worn down:<br>
                    ${lowMoraleMembers.map(m => `• <strong>${m.name}</strong> (${m.morale.current}%)`).join('<br>')}<br><br>
                    How do you want to respond?`
                };
                window.displayConversation(dynamicConv);
            }
        }
    }

    return {
        getCurrentConversation: () => currentConversation,
        setCurrentConversation: (conv) => { currentConversation = conv; },
        getSelectedChoiceId: () => selectedChoiceId,
        setSelectedChoiceId: (id) => { selectedChoiceId = id; },
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
        checkTeamPulse
    };
})();

// Expose on window for backward compatibility
window.currentConversation = null;
window.currentConversationStartTime = null;
window.currentConversationMeta = null;
window.selectedChoiceId = null;
Object.defineProperty(window, 'currentConversation', {
    get: () => ConversationsModule.getCurrentConversation(),
    set: (val) => ConversationsModule.setCurrentConversation(val)
});
Object.defineProperty(window, 'selectedChoiceId', {
    get: () => ConversationsModule.getSelectedChoiceId(),
    set: (val) => ConversationsModule.setSelectedChoiceId(val)
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

