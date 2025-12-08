// Office Visualization Module - Mini Metro Style
// Illustrative visualization of office layout and team activity

const OfficeVisualizationModule = (function() {
    'use strict';

    const COLORS = {
        background: '#f7f6f3',
        desk: '#34495e',
        deskStroke: '#2c3e50',
        meetingRoom: '#ecf0f1',
        meetingRoomStroke: '#95a5a6',
        playerDesk: '#3498db',
        playerDeskStroke: '#2980b9',
        toilet: '#ecf0f1',
        toiletStroke: '#95a5a6',
        window: '#34495e',
        door: '#2c3e50',
        teamMember: '#e74c3c',
        teamMemberWorking: '#27ae60',
        teamMemberMeeting: '#f39c12',
        player: '#9b59b6',
        progress: '#2ecc71',
        tension: '#e74c3c',
        celebration: '#f1c40f',
        crisis: '#7f8c8d',
        text: '#2c3e50',
        textLight: '#7f8c8d'
    };

    const LAYOUT = {
        window: { x: 60, y: 40, width: 680, height: 6 },
        workersDesk: { x: 120, y: 140, width: 320, height: 110, rx: 2 },
        meetingRoom: { x: 60, y: 360, width: 200, height: 110 },
        playerDesk: { x: 480, y: 140, width: 90, height: 110, rx: 2 },
        toilet: { x: 280, y: 360, width: 110, height: 110 }
    };

    let svg = null;
    let animationFrame = null;
    let teamPositions = new Map();
    let lastUpdateTime = 0;
    let projectCompletionTimes = new Map();
    let deskSeatAssignments = new Map();

    function init() {
        svg = document.getElementById('officeSvg');
        if (!svg) return;
        
        clearOffice();
        drawOfficeLayout();
        updateOfficeVisualization();
    }

    function clearOffice() {
        if (!svg) return;
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    function drawOfficeLayout() {
        if (!svg) return;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'office-layout');

        const window = LAYOUT.window;
        const windowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        windowRect.setAttribute('x', window.x);
        windowRect.setAttribute('y', window.y);
        windowRect.setAttribute('width', window.width);
        windowRect.setAttribute('height', window.height);
        windowRect.setAttribute('fill', COLORS.window);
        g.appendChild(windowRect);

        const workersDesk = LAYOUT.workersDesk;
        const deskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        deskRect.setAttribute('x', workersDesk.x);
        deskRect.setAttribute('y', workersDesk.y);
        deskRect.setAttribute('width', workersDesk.width);
        deskRect.setAttribute('height', workersDesk.height);
        deskRect.setAttribute('rx', workersDesk.rx);
        deskRect.setAttribute('fill', COLORS.desk);
        deskRect.setAttribute('stroke', COLORS.deskStroke);
        deskRect.setAttribute('stroke-width', '1.5');
        g.appendChild(deskRect);

        const playerDesk = LAYOUT.playerDesk;
        const playerDeskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        playerDeskRect.setAttribute('x', playerDesk.x);
        playerDeskRect.setAttribute('y', playerDesk.y);
        playerDeskRect.setAttribute('width', playerDesk.width);
        playerDeskRect.setAttribute('height', playerDesk.height);
        playerDeskRect.setAttribute('rx', playerDesk.rx);
        playerDeskRect.setAttribute('fill', COLORS.playerDesk);
        playerDeskRect.setAttribute('stroke', COLORS.playerDeskStroke);
        playerDeskRect.setAttribute('stroke-width', '1.5');
        g.appendChild(playerDeskRect);

        const meetingRoom = LAYOUT.meetingRoom;
        const meetingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        meetingRect.setAttribute('x', meetingRoom.x);
        meetingRect.setAttribute('y', meetingRoom.y);
        meetingRect.setAttribute('width', meetingRoom.width);
        meetingRect.setAttribute('height', meetingRoom.height);
        meetingRect.setAttribute('rx', '2');
        meetingRect.setAttribute('fill', COLORS.meetingRoom);
        meetingRect.setAttribute('stroke', COLORS.meetingRoomStroke);
        meetingRect.setAttribute('stroke-width', '1.5');
        g.appendChild(meetingRect);

        const meetingDoor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        meetingDoor.setAttribute('x', meetingRoom.x + meetingRoom.width / 2 - 10);
        meetingDoor.setAttribute('y', meetingRoom.y);
        meetingDoor.setAttribute('width', '20');
        meetingDoor.setAttribute('height', '6');
        meetingDoor.setAttribute('rx', '1');
        meetingDoor.setAttribute('fill', COLORS.door);
        g.appendChild(meetingDoor);

        const toilet = LAYOUT.toilet;
        const toiletRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        toiletRect.setAttribute('x', toilet.x);
        toiletRect.setAttribute('y', toilet.y);
        toiletRect.setAttribute('width', toilet.width);
        toiletRect.setAttribute('height', toilet.height);
        toiletRect.setAttribute('rx', '2');
        toiletRect.setAttribute('fill', COLORS.toilet);
        toiletRect.setAttribute('stroke', COLORS.toiletStroke);
        toiletRect.setAttribute('stroke-width', '1.5');
        g.appendChild(toiletRect);

        const toiletDoor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        toiletDoor.setAttribute('x', toilet.x + toilet.width);
        toiletDoor.setAttribute('y', toilet.y + toilet.height / 2 - 10);
        toiletDoor.setAttribute('width', '6');
        toiletDoor.setAttribute('height', '20');
        toiletDoor.setAttribute('rx', '1');
        toiletDoor.setAttribute('fill', COLORS.door);
        g.appendChild(toiletDoor);

        const mainDoor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mainDoor.setAttribute('x', 690);
        mainDoor.setAttribute('y', 420);
        mainDoor.setAttribute('width', '20');
        mainDoor.setAttribute('height', '6');
        mainDoor.setAttribute('rx', '1');
        mainDoor.setAttribute('fill', COLORS.door);
        g.appendChild(mainDoor);

        const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelsGroup.setAttribute('class', 'space-labels');

        const windowLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        windowLabel.setAttribute('x', window.x + window.width / 2);
        windowLabel.setAttribute('y', window.y + window.height + 16);
        windowLabel.setAttribute('text-anchor', 'middle');
        windowLabel.setAttribute('font-size', '10');
        windowLabel.setAttribute('font-weight', '400');
        windowLabel.setAttribute('fill', COLORS.textLight);
        windowLabel.textContent = 'Window';
        labelsGroup.appendChild(windowLabel);

        const deskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        deskLabel.setAttribute('x', workersDesk.x + workersDesk.width / 2);
        deskLabel.setAttribute('y', workersDesk.y + workersDesk.height / 2 + 4);
        deskLabel.setAttribute('text-anchor', 'middle');
        deskLabel.setAttribute('font-size', '10');
        deskLabel.setAttribute('font-weight', '400');
        deskLabel.setAttribute('fill', '#ecf0f1');
        deskLabel.textContent = 'working desk';
        labelsGroup.appendChild(deskLabel);

        const playerDeskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        playerDeskLabel.setAttribute('x', playerDesk.x + playerDesk.width / 2);
        playerDeskLabel.setAttribute('y', playerDesk.y + playerDesk.height / 2 + 4);
        playerDeskLabel.setAttribute('text-anchor', 'middle');
        playerDeskLabel.setAttribute('font-size', '9');
        playerDeskLabel.setAttribute('font-weight', '400');
        playerDeskLabel.setAttribute('fill', '#ecf0f1');
        playerDeskLabel.textContent = 'art director desk';
        labelsGroup.appendChild(playerDeskLabel);

        const meetingLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        meetingLabel.setAttribute('x', meetingRoom.x + meetingRoom.width / 2);
        meetingLabel.setAttribute('y', meetingRoom.y + meetingRoom.height / 2);
        meetingLabel.setAttribute('text-anchor', 'middle');
        meetingLabel.setAttribute('font-size', '11');
        meetingLabel.setAttribute('font-weight', '300');
        meetingLabel.setAttribute('fill', COLORS.text);
        meetingLabel.textContent = 'meeting room';
        labelsGroup.appendChild(meetingLabel);

        const meetingDoorLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        meetingDoorLabel.setAttribute('x', meetingRoom.x + meetingRoom.width / 2);
        meetingDoorLabel.setAttribute('y', meetingRoom.y - 5);
        meetingDoorLabel.setAttribute('text-anchor', 'middle');
        meetingDoorLabel.setAttribute('font-size', '9');
        meetingDoorLabel.setAttribute('font-weight', '300');
        meetingDoorLabel.setAttribute('fill', COLORS.textLight);
        meetingDoorLabel.textContent = 'door';
        labelsGroup.appendChild(meetingDoorLabel);

        const toiletLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        toiletLabel.setAttribute('x', toilet.x + toilet.width / 2);
        toiletLabel.setAttribute('y', toilet.y + toilet.height / 2);
        toiletLabel.setAttribute('text-anchor', 'middle');
        toiletLabel.setAttribute('font-size', '11');
        toiletLabel.setAttribute('font-weight', '300');
        toiletLabel.setAttribute('fill', COLORS.text);
        toiletLabel.textContent = 'toilet';
        labelsGroup.appendChild(toiletLabel);

        const toiletDoorLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        toiletDoorLabel.setAttribute('x', toilet.x + toilet.width + 12);
        toiletDoorLabel.setAttribute('y', toilet.y + toilet.height / 2);
        toiletDoorLabel.setAttribute('text-anchor', 'middle');
        toiletDoorLabel.setAttribute('font-size', '9');
        toiletDoorLabel.setAttribute('font-weight', '300');
        toiletDoorLabel.setAttribute('fill', COLORS.textLight);
        toiletDoorLabel.textContent = 'door';
        labelsGroup.appendChild(toiletDoorLabel);

        const mainDoorLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        mainDoorLabel.setAttribute('x', 700 + 8);
        mainDoorLabel.setAttribute('y', 420 - 5);
        mainDoorLabel.setAttribute('text-anchor', 'middle');
        mainDoorLabel.setAttribute('font-size', '9');
        mainDoorLabel.setAttribute('font-weight', '300');
        mainDoorLabel.setAttribute('fill', COLORS.textLight);
        mainDoorLabel.textContent = 'door';
        labelsGroup.appendChild(mainDoorLabel);

        g.appendChild(labelsGroup);
        svg.appendChild(g);
    }

    function getDeskSeatPosition(memberId, index, totalSeats) {
        const desk = LAYOUT.workersDesk;
        const padding = 12;
        
        const corners = [
            { x: desk.x + padding, y: desk.y - padding },
            { x: desk.x + desk.width - padding, y: desk.y - padding },
            { x: desk.x + desk.width - padding, y: desk.y + desk.height + padding },
            { x: desk.x + padding, y: desk.y + desk.height + padding }
        ];
        
        const cornerIndex = index % corners.length;
        return corners[cornerIndex];
    }

    function getTeamMemberLocation(member) {
        if (!member || member.hasQuit) return null;

        if (member.id === 'player') {
            return {
                type: 'playerDesk',
                x: LAYOUT.playerDesk.x + LAYOUT.playerDesk.width / 2,
                y: LAYOUT.playerDesk.y + 20
            };
        }

        // Check if member is assigned to any project phase
        let assignedToProject = null;
        window.GameState.projects.forEach(project => {
            if (!project.phases) return;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                    if (!assignedToProject) {
                        assignedToProject = project;
                    }
                }
            });
        });
        
        if (assignedToProject && assignedToProject.status === 'crisis') {
            return {
                type: 'meeting',
                x: LAYOUT.meetingRoom.x + LAYOUT.meetingRoom.width / 2,
                y: LAYOUT.meetingRoom.y + LAYOUT.meetingRoom.height / 2
            };
        }

        const activeWorkers = window.GameState.team
            .filter(m => {
                if (m.hasQuit || m.id === 'player') return false;
                
                // Check if assigned to any crisis project
                let hasCrisisProject = false;
                window.GameState.projects.forEach(project => {
                    if (!project.phases) return;
                    ['management', 'design', 'development', 'review'].forEach(phaseName => {
                        const phase = project.phases[phaseName];
                        if (phase && phase.teamAssigned && phase.teamAssigned.includes(m.id)) {
                            if (project.status === 'crisis') {
                                hasCrisisProject = true;
                            }
                        }
                    });
                });
                
                return !hasCrisisProject;
            })
            .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

        if (!deskSeatAssignments.has(member.id)) {
            const memberIndex = activeWorkers.findIndex(m => m.id === member.id);
            if (memberIndex >= 0) {
                deskSeatAssignments.set(member.id, memberIndex);
            } else {
                const nextAvailableIndex = activeWorkers.length;
                deskSeatAssignments.set(member.id, nextAvailableIndex);
            }
        }

        const seatIndex = deskSeatAssignments.get(member.id);
        const seatPos = getDeskSeatPosition(member.id, seatIndex, Math.max(activeWorkers.length, 1));

        return {
            type: 'desk',
            x: seatPos.x,
            y: seatPos.y
        };
    }

    function getTeamMemberColor(member, location) {
        if (member.id === 'player') {
            return COLORS.player;
        }

        if (location.type === 'meeting') {
            return COLORS.teamMemberMeeting;
        }

        if (member.currentAssignment) {
            return COLORS.teamMemberWorking;
        }

        return COLORS.teamMember;
    }

    function drawTeamMembers() {
        if (!svg) return;

        const teamGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        teamGroup.setAttribute('class', 'team-members');

        const activeTeam = window.GameState.team.filter(m => !m.hasQuit);
        
        activeTeam.forEach((member, index) => {
            const location = getTeamMemberLocation(member);
            if (!location) return;

            const currentPos = teamPositions.get(member.id) || location;
            const targetPos = location;

            let x, y;
            if (location.type === 'desk') {
                x = targetPos.x;
                y = targetPos.y;
            } else {
                x = currentPos.x + (targetPos.x - currentPos.x) * 0.1;
                y = currentPos.y + (targetPos.y - currentPos.y) * 0.1;
            }

            teamPositions.set(member.id, { x, y, ...targetPos });

            const color = getTeamMemberColor(member, location);
            const radius = member.id === 'player' ? 8 : 6;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', '#ecf0f1');
            circle.setAttribute('stroke-width', '1.5');

            if (location.type === 'desk' && member.currentAssignment) {
                const pulse = 1 + Math.sin(Date.now() / 500) * 0.1;
                circle.setAttribute('r', radius * pulse);
                circle.setAttribute('opacity', 0.9);
            }

            teamGroup.appendChild(circle);

            const nameText = member.name || member.id;
            const textLength = nameText.length;
            const textWidth = textLength * 6;
            const textHeight = 14;
            const padding = 4;

            const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            nameBg.setAttribute('x', x - textWidth / 2 - padding);
            nameBg.setAttribute('y', y + radius + 8);
            nameBg.setAttribute('width', textWidth + padding * 2);
            nameBg.setAttribute('height', textHeight);
            nameBg.setAttribute('rx', '3');
            nameBg.setAttribute('fill', '#f5f5f0');
            nameBg.setAttribute('opacity', '0.9');
            nameBg.setAttribute('stroke', COLORS.text);
            nameBg.setAttribute('stroke-width', '0.5');
            teamGroup.appendChild(nameBg);

            const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nameLabel.setAttribute('x', x);
            nameLabel.setAttribute('y', y + radius + 19);
            nameLabel.setAttribute('text-anchor', 'middle');
            nameLabel.setAttribute('font-size', '10');
            nameLabel.setAttribute('font-weight', '300');
            nameLabel.setAttribute('fill', COLORS.text);
            nameLabel.textContent = nameText;
            teamGroup.appendChild(nameLabel);
        });

        const existingTeamGroup = svg.querySelector('.team-members');
        if (existingTeamGroup) {
            svg.replaceChild(teamGroup, existingTeamGroup);
        } else {
            svg.appendChild(teamGroup);
        }
    }

    function drawVisualIndicators() {
        if (!svg) return;

        const indicatorsGroup = svg.querySelector('.visual-indicators');
        if (indicatorsGroup) {
            svg.removeChild(indicatorsGroup);
        }

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'visual-indicators');

        const projects = window.GameState.projects.filter(p => p.status !== 'complete');
        const team = window.GameState.team.filter(m => !m.hasQuit);

        projects.forEach(project => {
            if (project.status === 'crisis') {
                const cloud = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                cloud.setAttribute('cx', LAYOUT.workersDesk.x + LAYOUT.workersDesk.width / 2);
                cloud.setAttribute('cy', LAYOUT.workersDesk.y - 30);
                cloud.setAttribute('r', 20);
                cloud.setAttribute('fill', COLORS.crisis);
                cloud.setAttribute('opacity', '0.3');
                g.appendChild(cloud);
            }

            const assignedMembers = team.filter(m => m.currentAssignment === project.id);
            assignedMembers.forEach(member => {
                const memberPos = teamPositions.get(member.id) || { x: LAYOUT.workersDesk.x, y: LAYOUT.workersDesk.y };
                
                const progressParticle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                const offsetX = Math.sin(Date.now() / 1000 + member.id.charCodeAt(0)) * 15;
                const offsetY = Math.cos(Date.now() / 1000 + member.id.charCodeAt(0)) * 15;
                progressParticle.setAttribute('cx', memberPos.x + offsetX);
                progressParticle.setAttribute('cy', memberPos.y + offsetY);
                progressParticle.setAttribute('r', 2);
                progressParticle.setAttribute('fill', COLORS.progress);
                progressParticle.setAttribute('opacity', '0.6');
                g.appendChild(progressParticle);
            });
        });

        if (window.GameState.teamMorale < 30) {
            const tensionWave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            tensionWave.setAttribute('cx', LAYOUT.workersDesk.x + LAYOUT.workersDesk.width / 2);
            tensionWave.setAttribute('cy', LAYOUT.workersDesk.y - 40);
            const waveSize = 20;
            tensionWave.setAttribute('r', waveSize);
            tensionWave.setAttribute('fill', 'none');
            tensionWave.setAttribute('stroke', COLORS.tension);
            tensionWave.setAttribute('stroke-width', '2');
            tensionWave.setAttribute('opacity', '0.4');
            g.appendChild(tensionWave);
        }

        const completedProjects = window.GameState.projects.filter(p => p.status === 'complete');
        const now = Date.now();
        
        completedProjects.forEach(project => {
            if (!projectCompletionTimes.has(project.id)) {
                projectCompletionTimes.set(project.id, now);
            }
        });
        
        const recentlyCompleted = completedProjects.filter(p => {
            const completionTime = projectCompletionTimes.get(p.id);
            return completionTime && (now - completionTime) < 3000;
        });
        
        if (recentlyCompleted.length > 0) {
            const mostRecent = recentlyCompleted.reduce((latest, current) => {
                const latestTime = projectCompletionTimes.get(latest.id);
                const currentTime = projectCompletionTimes.get(current.id);
                return currentTime > latestTime ? current : latest;
            });
            
            const elapsed = now - projectCompletionTimes.get(mostRecent.id);
            const progress = Math.min(elapsed / 3000, 1);
            
            const celebration = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            celebration.setAttribute('cx', LAYOUT.workersDesk.x + LAYOUT.workersDesk.width / 2);
            celebration.setAttribute('cy', LAYOUT.workersDesk.y - 60);
            celebration.setAttribute('r', 30);
            celebration.setAttribute('fill', COLORS.celebration);
            celebration.setAttribute('opacity', (0.4 * (1 - progress)).toString());
            g.appendChild(celebration);
        }
        
        projectCompletionTimes.forEach((time, projectId) => {
            if (now - time > 3000) {
                projectCompletionTimes.delete(projectId);
            }
        });

        svg.appendChild(g);
    }

    function updateOfficeVisualization() {
        if (!svg) return;

        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        
        if (timeSinceLastUpdate < 100) {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            animationFrame = requestAnimationFrame(() => {
                updateOfficeVisualization();
            });
            return;
        }
        
        lastUpdateTime = now;
        drawTeamMembers();
        drawVisualIndicators();

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }

        animationFrame = requestAnimationFrame(() => {
            updateOfficeVisualization();
        });
    }

    function stopAnimation() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function reset() {
        teamPositions.clear();
        projectCompletionTimes.clear();
        deskSeatAssignments.clear();
        lastUpdateTime = 0;
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        
        if (svg) {
            clearOffice();
            drawOfficeLayout();
        }
    }

    return {
        init,
        update: updateOfficeVisualization,
        stop: stopAnimation,
        reset
    };
})();

window.OfficeVisualization = OfficeVisualizationModule;

