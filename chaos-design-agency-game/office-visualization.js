// Office Visualization Module - Mini Metro Style
// Illustrative visualization of office layout and team activity

const OfficeVisualizationModule = (function() {
    'use strict';

    const COLORS = {
        background: '#FFFFFF',
        wall: '#000000',
        floor: '#F5F5F5',
        desk: '#FFFFFF',
        deskStroke: '#000000',
        meetingRoom: '#E8F4E8',
        meetingRoomStroke: '#000000',
        playerDesk: '#FFE8CC',
        playerDeskStroke: '#000000',
        toilet: '#E8F0FF',
        toiletStroke: '#000000',
        window: '#FFFFFF',
        windowStroke: '#000000',
        door: '#FFFFFF',
        doorStroke: '#000000',
        teamMember: '#FF6B6B',
        teamMemberWorking: '#51CF66',
        teamMemberMeeting: '#FFA94D',
        player: '#845EF7',
        progress: '#51CF66',
        tension: '#FF6B6B',
        celebration: '#FFD43B',
        crisis: '#868E96',
        text: '#000000',
        textLight: '#868E96'
    };

    const LAYOUT = {
        // Room dimensions (800x500)
        room: { x: 20, y: 20, width: 760, height: 460 },
        // Walls
        walls: [
            { x1: 20, y1: 20, x2: 780, y2: 20 }, // Top wall
            { x1: 780, y1: 20, x2: 780, y2: 480 }, // Right wall
            { x1: 780, y1: 480, x2: 20, y2: 480 }, // Bottom wall
            { x1: 20, y1: 480, x2: 20, y2: 20 } // Left wall
        ],
        // Windows on top wall
        windows: [
            { x: 100, y: 20, width: 150, height: 8 },
            { x: 300, y: 20, width: 150, height: 8 },
            { x: 500, y: 20, width: 150, height: 8 }
        ],
        // Door on left wall
        door: { x: 20, y: 200, width: 8, height: 80 },
        // Work desks area (open plan)
        workersDesk: { x: 100, y: 100, width: 300, height: 120, rx: 0 },
        // Meeting room (enclosed)
        meetingRoom: { x: 550, y: 100, width: 180, height: 150 },
        // Manager desk (your desk)
        playerDesk: { x: 450, y: 100, width: 80, height: 120, rx: 0 },
        // Bathroom
        toilet: { x: 550, y: 300, width: 180, height: 130 },
        // Coffee area
        coffeeArea: { x: 100, y: 350, width: 100, height: 80 },
        // Sofa for unassigned workers
        sofa: { x: 250, y: 350, width: 150, height: 60 }
    };

    let svg = null;
    let animationFrame = null;
    let teamPositions = new Map();
    let lastUpdateTime = 0;
    let projectCompletionTimes = new Map();
    let deskSeatAssignments = new Map();
    let memberActivities = new Map(); // Track current activity for each member
    let activityTimers = new Map(); // Track when to change activity
    let activityTargets = new Map(); // Stable target positions per member/activity

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

        // Draw floor
        const floor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        floor.setAttribute('x', LAYOUT.room.x);
        floor.setAttribute('y', LAYOUT.room.y);
        floor.setAttribute('width', LAYOUT.room.width);
        floor.setAttribute('height', LAYOUT.room.height);
        floor.setAttribute('fill', COLORS.floor);
        g.appendChild(floor);

        // Draw walls (bold black lines)
        LAYOUT.walls.forEach(wall => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', wall.x1);
            line.setAttribute('y1', wall.y1);
            line.setAttribute('x2', wall.x2);
            line.setAttribute('y2', wall.y2);
            line.setAttribute('stroke', COLORS.wall);
            line.setAttribute('stroke-width', '4');
            line.setAttribute('stroke-linecap', 'square');
            g.appendChild(line);
        });

        // Draw windows
        LAYOUT.windows.forEach(window => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', window.x);
            rect.setAttribute('y', window.y);
            rect.setAttribute('width', window.width);
            rect.setAttribute('height', window.height);
            rect.setAttribute('fill', COLORS.window);
            rect.setAttribute('stroke', COLORS.windowStroke);
            rect.setAttribute('stroke-width', '3');
            g.appendChild(rect);
        });

        // Draw door
        const door = LAYOUT.door;
        const doorRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        doorRect.setAttribute('x', door.x);
        doorRect.setAttribute('y', door.y);
        doorRect.setAttribute('width', door.width);
        doorRect.setAttribute('height', door.height);
        doorRect.setAttribute('fill', COLORS.door);
        doorRect.setAttribute('stroke', COLORS.doorStroke);
        doorRect.setAttribute('stroke-width', '3');
        g.appendChild(doorRect);

        // Draw meeting room (enclosed space)
        const meetingRoom = LAYOUT.meetingRoom;
        const meetingRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        meetingRect.setAttribute('x', meetingRoom.x);
        meetingRect.setAttribute('y', meetingRoom.y);
        meetingRect.setAttribute('width', meetingRoom.width);
        meetingRect.setAttribute('height', meetingRoom.height);
        meetingRect.setAttribute('fill', COLORS.meetingRoom);
        meetingRect.setAttribute('stroke', COLORS.meetingRoomStroke);
        meetingRect.setAttribute('stroke-width', '3');
        g.appendChild(meetingRect);
        
        // Meeting room label
        const meetingLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        meetingLabel.setAttribute('x', meetingRoom.x + meetingRoom.width / 2);
        meetingLabel.setAttribute('y', meetingRoom.y + meetingRoom.height / 2);
        meetingLabel.setAttribute('text-anchor', 'middle');
        meetingLabel.setAttribute('font-size', '12');
        meetingLabel.setAttribute('font-weight', '600');
        meetingLabel.setAttribute('fill', COLORS.text);
        meetingLabel.textContent = 'MEETING';
        g.appendChild(meetingLabel);

        // Draw toilet
        const toilet = LAYOUT.toilet;
        const toiletRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        toiletRect.setAttribute('x', toilet.x);
        toiletRect.setAttribute('y', toilet.y);
        toiletRect.setAttribute('width', toilet.width);
        toiletRect.setAttribute('height', toilet.height);
        toiletRect.setAttribute('fill', COLORS.toilet);
        toiletRect.setAttribute('stroke', COLORS.toiletStroke);
        toiletRect.setAttribute('stroke-width', '3');
        g.appendChild(toiletRect);
        
        // Toilet label
        const toiletLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        toiletLabel.setAttribute('x', toilet.x + toilet.width / 2);
        toiletLabel.setAttribute('y', toilet.y + toilet.height / 2);
        toiletLabel.setAttribute('text-anchor', 'middle');
        toiletLabel.setAttribute('font-size', '12');
        toiletLabel.setAttribute('font-weight', '600');
        toiletLabel.setAttribute('fill', COLORS.text);
        toiletLabel.textContent = 'RESTROOM';
        g.appendChild(toiletLabel);

        // Draw coffee area
        const coffee = LAYOUT.coffeeArea;
        const coffeeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        coffeeRect.setAttribute('x', coffee.x);
        coffeeRect.setAttribute('y', coffee.y);
        coffeeRect.setAttribute('width', coffee.width);
        coffeeRect.setAttribute('height', coffee.height);
        coffeeRect.setAttribute('fill', '#FFF5E6');
        coffeeRect.setAttribute('stroke', COLORS.deskStroke);
        coffeeRect.setAttribute('stroke-width', '2');
        g.appendChild(coffeeRect);
        
        // Coffee label
        const coffeeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        coffeeLabel.setAttribute('x', coffee.x + coffee.width / 2);
        coffeeLabel.setAttribute('y', coffee.y + coffee.height / 2);
        coffeeLabel.setAttribute('text-anchor', 'middle');
        coffeeLabel.setAttribute('font-size', '10');
        coffeeLabel.setAttribute('font-weight', '600');
        coffeeLabel.setAttribute('fill', COLORS.text);
        coffeeLabel.textContent = '☕ COFFEE';
        g.appendChild(coffeeLabel);

        // Draw sofa
        const sofa = LAYOUT.sofa;
        const sofaRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        sofaRect.setAttribute('x', sofa.x);
        sofaRect.setAttribute('y', sofa.y);
        sofaRect.setAttribute('width', sofa.width);
        sofaRect.setAttribute('height', sofa.height);
        sofaRect.setAttribute('fill', '#C9ADA7');
        sofaRect.setAttribute('stroke', COLORS.deskStroke);
        sofaRect.setAttribute('stroke-width', '2');
        g.appendChild(sofaRect);
        
        // Sofa cushions (decorative)
        for (let i = 0; i < 3; i++) {
            const cushion = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            cushion.setAttribute('x', sofa.x + 10 + (i * 45));
            cushion.setAttribute('y', sofa.y + 10);
            cushion.setAttribute('width', 35);
            cushion.setAttribute('height', 40);
            cushion.setAttribute('fill', '#A8948C');
            cushion.setAttribute('stroke', COLORS.deskStroke);
            cushion.setAttribute('stroke-width', '1');
            g.appendChild(cushion);
        }
        
        // Sofa label
        const sofaLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sofaLabel.setAttribute('x', sofa.x + sofa.width / 2);
        sofaLabel.setAttribute('y', sofa.y - 8);
        sofaLabel.setAttribute('text-anchor', 'middle');
        sofaLabel.setAttribute('font-size', '10');
        sofaLabel.setAttribute('font-weight', '600');
        sofaLabel.setAttribute('fill', COLORS.textLight);
        sofaLabel.textContent = 'IDLE AREA';
        g.appendChild(sofaLabel);

        // Draw work desks
        const workersDesk = LAYOUT.workersDesk;
        const deskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        deskRect.setAttribute('x', workersDesk.x);
        deskRect.setAttribute('y', workersDesk.y);
        deskRect.setAttribute('width', workersDesk.width);
        deskRect.setAttribute('height', workersDesk.height);
        deskRect.setAttribute('fill', COLORS.desk);
        deskRect.setAttribute('stroke', COLORS.deskStroke);
        deskRect.setAttribute('stroke-width', '3');
        g.appendChild(deskRect);
        
        // Work desks label
        const deskLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        deskLabel.setAttribute('x', workersDesk.x + workersDesk.width / 2);
        deskLabel.setAttribute('y', workersDesk.y + workersDesk.height / 2);
        deskLabel.setAttribute('text-anchor', 'middle');
        deskLabel.setAttribute('font-size', '11');
        deskLabel.setAttribute('font-weight', '600');
        deskLabel.setAttribute('fill', COLORS.textLight);
        deskLabel.textContent = 'TEAM DESKS';
        g.appendChild(deskLabel);

        // Draw manager desk
        const playerDesk = LAYOUT.playerDesk;
        const playerDeskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        playerDeskRect.setAttribute('x', playerDesk.x);
        playerDeskRect.setAttribute('y', playerDesk.y);
        playerDeskRect.setAttribute('width', playerDesk.width);
        playerDeskRect.setAttribute('height', playerDesk.height);
        playerDeskRect.setAttribute('fill', COLORS.playerDesk);
        playerDeskRect.setAttribute('stroke', COLORS.playerDeskStroke);
        playerDeskRect.setAttribute('stroke-width', '3');
        g.appendChild(playerDeskRect);
        
        // Manager desk label
        const managerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        managerLabel.setAttribute('x', playerDesk.x + playerDesk.width / 2);
        managerLabel.setAttribute('y', playerDesk.y + playerDesk.height / 2);
        managerLabel.setAttribute('text-anchor', 'middle');
        managerLabel.setAttribute('font-size', '10');
        managerLabel.setAttribute('font-weight', '600');
        managerLabel.setAttribute('fill', COLORS.text);
        managerLabel.textContent = 'YOU';
        g.appendChild(managerLabel);

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

    function getRandomActivity(isUnassigned) {
        const rand = Math.random();

        if (isUnassigned) {
            // Idle workers: mostly sofa, sometimes coffee/restroom
            if (rand < 0.70) return 'sofa';
            if (rand < 0.85) return 'coffee';
            return 'bathroom';
        }

        // Assigned workers: mostly at desk
        if (rand < 0.80) return 'desk';
        if (rand < 0.90) return 'bathroom';
        if (rand < 0.95) return 'coffee';
        return 'meeting';
    }

    function getActivityDuration(activity) {
        switch (activity) {
            case 'desk': return 20000 + Math.random() * 40000;      // 20-60s
            case 'bathroom': return 3000 + Math.random() * 5000;    // 3-8s
            case 'coffee': return 5000 + Math.random() * 10000;     // 5-15s
            case 'meeting': return 10000 + Math.random() * 20000;   // 10-30s
            case 'sofa': return 30000 + Math.random() * 60000;      // Idle on sofa
            default: return 20000;
        }
    }

    function getActivityPosition(activity, member, memberIndex, allIdleWorkers) {
        const meeting = LAYOUT.meetingRoom;
        const coffee = LAYOUT.coffeeArea;
        const bathroom = LAYOUT.toilet;
        const sofa = LAYOUT.sofa;

        switch (activity) {
            case 'sofa': {
                const idleIndex = allIdleWorkers ? allIdleWorkers.findIndex(m => m.id === member.id) : 0;
                const spacing = sofa.width / Math.max((allIdleWorkers ? allIdleWorkers.length + 1 : 2), 2);
                return {
                    x: sofa.x + spacing * (idleIndex + 1),
                    y: sofa.y + sofa.height / 2
                };
            }
            case 'bathroom':
                return {
                    x: bathroom.x + 30 + Math.random() * (bathroom.width - 60),
                    y: bathroom.y + 30 + Math.random() * (bathroom.height - 60)
                };
            case 'coffee': {
                const angle = Math.random() * Math.PI * 2;
                const dist = 15 + Math.random() * 20;
                return {
                    x: coffee.x + coffee.width / 2 + Math.cos(angle) * dist,
                    y: coffee.y + coffee.height / 2 + Math.sin(angle) * dist
                };
            }
            case 'meeting': {
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 30;
                return {
                    x: meeting.x + meeting.width / 2 + Math.cos(angle) * dist,
                    y: meeting.y + meeting.height / 2 + Math.sin(angle) * dist
                };
            }
            case 'desk':
            default:
                return getDeskSeatPosition(member.id, memberIndex, 8);
        }
    }

    function getOrCreateActivityTarget(activity, member, seatIndex, idleWorkers) {
        const prev = activityTargets.get(member.id);
        if (prev && prev.activity === activity) {
            return { x: prev.x, y: prev.y };
        }
        const pos = getActivityPosition(activity, member, seatIndex, idleWorkers);
        activityTargets.set(member.id, { activity, x: pos.x, y: pos.y });
        return pos;
    }

    function isWorkerAssigned(member) {
        let hasAssignment = false;
        if (window.GameState && window.GameState.projects) {
            window.GameState.projects.forEach(project => {
                if (!project.phases) return;
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    const phase = project.phases[phaseName];
                    if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                        hasAssignment = true;
                    }
                });
            });
        }
        return hasAssignment;
    }

    function updateMemberActivity(member) {
        const unassigned = !isWorkerAssigned(member);

        const now = Date.now();
        const currentActivity = memberActivities.get(member.id) || 'desk';
        const activityTimer = activityTimers.get(member.id) || 0;

        if (now > activityTimer) {
            const newActivity = getRandomActivity(unassigned);
            memberActivities.set(member.id, newActivity);
            activityTimers.set(member.id, now + getActivityDuration(newActivity));
            return newActivity;
        }

        return currentActivity;
    }

    function isWorkerAssigned(member) {
        // Check if worker is assigned to any project phase
        let hasAssignment = false;
        if (window.GameState && window.GameState.projects) {
            window.GameState.projects.forEach(project => {
                if (!project.phases) return;
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    const phase = project.phases[phaseName];
                    if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                        hasAssignment = true;
                    }
                });
            });
        }
        return hasAssignment;
    }

    function getTeamMemberLocation(member) {
        if (!member || member.hasQuit || member.isIll) {
            return null;
        }

        if (member.id === 'player') {
            return {
                type: 'playerDesk',
                x: LAYOUT.playerDesk.x + LAYOUT.playerDesk.width / 2,
                y: LAYOUT.playerDesk.y + 20
            };
        }

        const activeWorkers = window.GameState.team.filter(m => !m.hasQuit && !m.isIll && m.id !== 'player');
        const seatIndex = deskSeatAssignments.get(member.id) ?? activeWorkers.indexOf(member);
        
        if (seatIndex < 0 || !deskSeatAssignments.has(member.id)) {
            deskSeatAssignments.set(member.id, activeWorkers.indexOf(member));
        }

        // Get all idle workers for sofa positioning
        const idleWorkers = activeWorkers.filter(m => !isWorkerAssigned(m));

        // Update activity based on timer and assignment
        const currentActivity = updateMemberActivity(member);
        const position = getOrCreateActivityTarget(currentActivity, member, seatIndex, idleWorkers);

        return {
            type: currentActivity,
            x: position.x,
            y: position.y
        };
    }

    function getTeamMemberColor(member, location) {
        if (member.id === 'player') {
            return COLORS.player;
        }

        // Color based on activity
        if (location.type === 'sofa') {
            return COLORS.teamMember; // Red for idle on sofa
        }

        if (location.type === 'meeting' || location.type === 'coffee') {
            return COLORS.teamMemberMeeting; // Orange for socializing
        }

        if (location.type === 'bathroom') {
            return COLORS.textLight; // Gray for bathroom
        }

        // At desk - color based on work status
        if (isWorkerAssigned(member)) {
            return COLORS.teamMemberWorking; // Green for working
        }

        return COLORS.teamMember; // Red for idle at desk
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

            // Smooth movement for all locations
            let x, y;
            const smoothing = location.type === 'desk' ? 0.2 : 0.05; // Slower movement when walking
            x = currentPos.x + (targetPos.x - currentPos.x) * smoothing;
            y = currentPos.y + (targetPos.y - currentPos.y) * smoothing;

            teamPositions.set(member.id, { x, y, ...targetPos });

            const color = getTeamMemberColor(member, location);
            const radius = member.id === 'player' ? 8 : 6;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', COLORS.wall);
            circle.setAttribute('stroke-width', '2');

            // Visual effects based on activity
            if (location.type === 'desk' && member.currentAssignment) {
                const pulse = 1 + Math.sin(Date.now() / 500) * 0.1;
                circle.setAttribute('r', radius * pulse);
                circle.setAttribute('opacity', 0.95);
            } else if (location.type === 'coffee' || location.type === 'meeting') {
                circle.setAttribute('opacity', 0.9);
            } else if (location.type === 'bathroom') {
                circle.setAttribute('opacity', 0.7);
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

