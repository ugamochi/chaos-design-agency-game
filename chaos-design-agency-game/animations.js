// Game Feel Animations and Effects

function screenShake(intensity = 'medium') {
    const container = document.querySelector('.game-container');
    if (!container) return;

    const intensityMap = {
        light: 'screen-shake-light',
        medium: 'screen-shake-medium',
        heavy: 'screen-shake-heavy'
    };

    const className = intensityMap[intensity] || intensityMap.medium;
    container.classList.add(className);
    
    setTimeout(() => {
        container.classList.remove(className);
    }, 500);
}

function showConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#6bcf7f', '#a78bfa'];
    const confettiCount = 50;
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';
        container.appendChild(confetti);
    }

    setTimeout(() => {
        container.remove();
    }, 4000);
}

function pulseElement(selector, duration = 1000) {
    const element = document.querySelector(selector);
    if (!element) return;

    element.classList.add('pulse-animation');
    setTimeout(() => {
        element.classList.remove('pulse-animation');
    }, duration);
}

function flashElement(selector, color = 'success') {
    const element = document.querySelector(selector);
    if (!element) return;

    element.classList.add(`flash-${color}`);
    setTimeout(() => {
        element.classList.remove(`flash-${color}`);
    }, 600);
}

function fadeInElement(selector) {
    const element = document.querySelector(selector);
    if (!element) return;

    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 10);
}

function showFloatingText(text, x, y, type = 'info') {
    const floating = document.createElement('div');
    floating.className = `floating-text floating-${type}`;
    floating.textContent = text;
    floating.style.left = x + 'px';
    floating.style.top = y + 'px';
    
    document.body.appendChild(floating);
    
    setTimeout(() => {
        floating.remove();
    }, 2000);
}

function animateNumber(element, start, end, duration = 1000) {
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        
        if (element.textContent.includes('$')) {
            element.textContent = '$' + Math.round(current).toLocaleString();
        } else if (element.textContent.includes('%')) {
            element.textContent = Math.round(current) + '%';
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

function celebrateProjectCompletion(projectName) {
    showConfetti();
    screenShake('light');
    
    const toast = document.createElement('div');
    toast.className = 'celebration-toast';
    toast.innerHTML = `
        <div class="celebration-icon">🎉</div>
        <div class="celebration-text">
            <strong>Project Complete!</strong>
            <p>${projectName}</p>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    playSound('completion');
}

function showCrisisWarning(message) {
    screenShake('heavy');
    
    const warning = document.createElement('div');
    warning.className = 'crisis-warning';
    warning.innerHTML = `
        <div class="crisis-icon">⚠️</div>
        <div class="crisis-text">${message}</div>
    `;
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
        warning.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        warning.classList.remove('show');
        setTimeout(() => warning.remove(), 300);
    }, 3000);
    
    playSound('warning');
}

function showSuccessToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <div class="toast-icon">✓</div>
        <div class="toast-text">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showWarningToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'warning-toast';
    toast.innerHTML = `
        <div class="toast-icon">!</div>
        <div class="toast-text">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

const soundHooks = {
    completion: () => {},
    warning: () => {},
    conversation: () => {},
    money: () => {},
    click: () => {}
};

function playSound(soundType) {
    if (soundHooks[soundType]) {
        soundHooks[soundType]();
    }
}

function celebrateVictory(victoryPath) {
    if (victoryPath === 'rockstar') {
        showConfetti();
        setTimeout(() => showConfetti(), 500);
        setTimeout(() => showConfetti(), 1000);
    } else if (victoryPath === 'professional' || victoryPath === 'survivor') {
        showConfetti();
    }
    
    screenShake('medium');
    playSound('completion');
}

function showLoadingAnimation(message = 'Processing...') {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.id = 'loadingOverlay';
    loader.innerHTML = `
        <div class="loading-spinner"></div>
        <p>${message}</p>
    `;
    
    document.body.appendChild(loader);
    
    return {
        remove: () => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.remove();
        }
    };
}

function rippleEffect(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function initButtonAnimations() {
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', rippleEffect);
    });
}

