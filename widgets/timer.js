import '../src/config.js';
import { TwitchService } from '../src/services/TwitchService.js';
import { StorageService } from '../src/services/StorageService.js';
import { GlobalCommandBus } from '../src/commands/GlobalCommandBus.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';

// Available fonts for the picker
const AVAILABLE_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
    'Oswald', 'Raleway', 'Ubuntu', 'Nunito', 'Playfair Display', 
    'Merriweather', 'PT Sans', 'Bebas Neue', 'Quicksand', 'Fira Sans'
];

const SOUND_ASSETS = {
    start: {
        'ui-confirm': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        'soft-click': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
        'digital-start': 'https://assets.mixkit.co/active_storage/sfx/2705/2705-preview.mp3'
    },
    end: {
        bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        chime: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
        alarm: 'https://assets.mixkit.co/active_storage/sfx/1001/1001-preview.mp3',
        success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
    },
    longBreak: {
        celesta: 'https://assets.mixkit.co/active_storage/sfx/1940/1940-preview.mp3',
        'ambient-swell': 'https://assets.mixkit.co/active_storage/sfx/2625/2625-preview.mp3',
        'level-up': 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'
    },
    add: {
        pop: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',
        coin: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
        ding: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        sparkle: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
    },
    remove: {
        swish: 'https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3',
        descend: 'https://assets.mixkit.co/active_storage/sfx/2001/2000-preview.mp3',
        'error-buzz': 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'
    }
};

class StreamTimer {
    constructor() {
        this.config = this.parseUrlParams();
        this.timerInterval = null;
        this.currentSeconds = 0;
        this.isPaused = true;
        this.isSettingsMode = false;
        
        // Audio unlock state
        this.audioUnlocked = false;
        
        // Pomodoro state
        this.pomodoroPhase = 'work'; // 'work' or 'break'
        this.pomodoroCompletedCycles = 0;
        
        // Event-driven state
        this.startingValue = 0;
        this.goalProgress = 0;
        
        // Decay state for hype mode
        this.lastDecayTime = Date.now();
        
        this.elements = {
            container: document.getElementById('timer-container'),
            display: document.getElementById('timer-display'),
            label: document.getElementById('timer-label'),
            modeIndicator: document.getElementById('mode-indicator'),
            cycleIndicator: document.getElementById('cycle-indicator'),
            timeAddition: document.getElementById('time-addition')
        };

        this.init();
        this.setupAudioUnlock();
    }

    setupAudioUnlock() {
        // Function to unlock audio on first interaction
        const unlock = () => {
            if (this.audioUnlocked) return;
            
            // Play a silent sound to unlock
            const audio = new Audio();
            audio.play().then(() => {
                this.audioUnlocked = true;
                ErrorHandler.info('Audio unlocked for timer');
                document.removeEventListener('click', unlock);
                document.removeEventListener('keydown', unlock);
            }).catch(() => {});
        };

        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        
        // Also try to unlock immediately (works in some environments like OBS)
        unlock();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const config = {
            mode: params.get('mode') || 'countdown',
            hours: parseInt(params.get('hours')) || 0,
            minutes: parseInt(params.get('minutes')) || 5,
            seconds: parseInt(params.get('seconds')) || 0,
            
            // Pomodoro
            workDuration: parseInt(params.get('workDuration')) || 25,
            breakDuration: parseInt(params.get('breakDuration')) || 5,
            longBreakDuration: parseInt(params.get('longBreakDuration')) || 15,
            cyclesBeforeLong: parseInt(params.get('cyclesBeforeLong')) || 4,
            
            // Subathon
            timePerSub: parseFloat(params.get('timePerSub')) || 2,
            timePerTier2: parseFloat(params.get('timePerTier2')) || 4,
            timePerTier3: parseFloat(params.get('timePerTier3')) || 10,
            timePerGift: parseFloat(params.get('timePerGift')) || 2,
            
            // Tipathon
            timePerCurrency: parseInt(params.get('timePerCurrency')) || 60,
            tipMinimum: parseFloat(params.get('tipMinimum')) || 1,
            
            // Goalathon
            goalType: params.get('goalType') || 'followers',
            milestoneInterval: parseInt(params.get('milestoneInterval')) || 100,
            timePerMilestone: parseInt(params.get('timePerMilestone')) || 5,
            
            // Hype
            decayRate: parseInt(params.get('decayRate')) || 2,
            activityBoost: parseInt(params.get('activityBoost')) || 5,
            followBoost: parseInt(params.get('followBoost')) || 30,
            
            // Universal
            atZero: params.get('atZero') || 'stop',
            autoStart: params.get('autoStart') !== 'false',
            enableCommands: params.get('enableCommands') !== 'false',
            timerName: params.get('timerName') || '',
            maxTime: parseInt(params.get('maxTime')) || 0,
            minTime: parseInt(params.get('minTime')) || 0,
            
            // Display
            showHours: params.get('showHours') !== 'false',
            showMode: params.get('showMode') !== 'false',
            label: params.get('label') || '',
            
            // Style
            fontFamily: params.get('fontFamily') || 'Inter',
            fontSize: parseInt(params.get('fontSize')) || 64,
            color: params.get('color') || '#ffffff',
            theme: params.get('theme') || 'transparent',
            
            // Sounds
            volume: parseInt(params.get('volume')) || 50,
            soundStart: params.get('soundStart') || 'ui-confirm',
            soundEnd: params.get('soundEnd') || 'bell',
            soundLongBreak: params.get('soundLongBreak') || 'celesta',
            soundAdd: params.get('soundAdd') || 'pop',
            soundRemove: params.get('soundRemove') || 'swish',
            
            // Auth
            channelId: params.get('channelId') || '',
            token: params.get('token') || ''
        };

        return config;
    }

    async init() {
        // Check if we're in OBS or settings mode
        this.isSettingsMode = !window.obsstudio && document.querySelector('.obs-control');
        
        if (this.isSettingsMode) {
            this.initializeSettingsPanel();
        }

        // Apply styling
        this.applySettings();
        
        // Initialize timer based on mode
        this.initializeTimer();
        
        // Start if auto-start is enabled
        if (this.config.autoStart && !this.isSettingsMode) {
            this.start();
        }
        
        // Connect to Twitch for chat commands (always, unless in settings mode)
        if (!this.isSettingsMode) {
            await this.connectToTwitch();
        }
    }

    initializeTimer() {
        const mode = this.config.mode;
        
        switch (mode) {
            case 'countdown':
            case 'subathon':
            case 'tipathon':
            case 'goalathon':
            case 'hype':
                this.currentSeconds = (this.config.hours * 3600) + (this.config.minutes * 60) + this.config.seconds;
                break;
            case 'countup':
                this.currentSeconds = (this.config.hours * 3600) + (this.config.minutes * 60) + this.config.seconds;
                break;
            case 'pomodoro':
                this.currentSeconds = this.config.workDuration * 60;
                this.pomodoroPhase = 'work';
                this.pomodoroCompletedCycles = 0;
                break;
        }
        
        this.startingValue = this.currentSeconds;
        this.updateDisplay();
        this.updateModeIndicator();
    }

    requiresTwitchEvents() {
        return ['subathon', 'tipathon', 'goalathon', 'hype'].includes(this.config.mode);
    }

    async connectToTwitch() {
        try {
            if (!this.config.enableCommands && !this.requiresTwitchEvents()) {
                return;
            }
            
            // Initialize Twitch Service
            const twitchService = new TwitchService();
            await twitchService.initialize();
            
            ErrorHandler.info('Timer: Twitch connected', {
                channel: twitchService.getChannel()
            });
            
            // Initialize command bus
            const commandBus = new GlobalCommandBus(twitchService);
            
            // Register timer commands (mod-only)
            this.registerTimerCommands(commandBus);
            
            // Subscribe to commands if other widgets register them
            this.subscribeToCommands(commandBus);
            
            // Listen for messages and execute commands
            twitchService.on('message', async (channel, tags, message, self) => {
                if (self) return; // Ignore own messages
                
                // Handle chat commands
                if (message.startsWith('!timer')) {
                    await commandBus.execute(message, tags, channel);
                }
                
                // Handle hype mode boost from chat
                if (this.config.mode === 'hype' && !message.startsWith('!')) {
                    this.addTime(this.config.activityBoost);
                }
            });

            // Listen for actual stream events (Subathon/Tipathon support)
            twitchService.on('subscription', (channel, username, method, message, tags) => {
                if (this.config.mode === 'subathon') {
                    const tier = tags['msg-param-sub-plan'];
                    let minutesToAdd = this.config.timePerSub;
                    
                    if (tier === '2000') minutesToAdd = this.config.timePerTier2;
                    else if (tier === '3000') minutesToAdd = this.config.timePerTier3;
                    
                    this.addTime(Math.floor(minutesToAdd * 60));
                    ErrorHandler.info(`Subathon: Sub from ${username} added ${minutesToAdd}m`);
                }
            });

            twitchService.on('giftpaidupgrade', (channel, username, sender, tags) => {
                if (this.config.mode === 'subathon') {
                    this.addTime(Math.floor(this.config.timePerSub * 60));
                }
            });

            twitchService.on('cheer', (channel, tags, message) => {
                if (this.config.mode === 'hype') {
                    const bits = parseInt(tags.bits) || 0;
                    this.addTime(Math.floor(bits / 10) * this.config.activityBoost);
                }
            });
            
            this.twitchService = twitchService;
            this.commandBus = commandBus;
            
        } catch (error) {
            ErrorHandler.handle(error, 'timer_twitch_connect');
        }
    }

    registerTimerCommands(commandBus) {
        // Main command dispatcher for !timer
        commandBus.register('!timer', async (context) => {
            const args = context.args;
            if (args.length === 0) return;

            const actions = ['start', 'pause', 'stop', 'reset', 'add', 'remove', 'subtract', 'set'];
            let targetAction = '';
            let targetValue = '';
            let isTargeted = false;

            // Check if first arg is the name of this timer
            if (this.config.timerName && args[0].toLowerCase() === this.config.timerName.toLowerCase()) {
                isTargeted = true;
                targetAction = args[1]?.toLowerCase();
                targetValue = args[2];
            } 
            // Check if first arg is a valid action (Global command)
            else if (actions.includes(args[0].toLowerCase())) {
                targetAction = args[0].toLowerCase();
                targetValue = args[1];
            } 
            // Ignore if it doesn't match our name and isn't a global action
            else {
                return;
            }

            // Execute the resolved action
            switch (targetAction) {
                case 'start':
                    this.start();
                    ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}started via command`, { user: context.username });
                    break;
                case 'pause':
                case 'stop':
                    this.pause();
                    ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}paused via command`, { user: context.username });
                    break;
                case 'reset':
                    this.reset();
                    ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}reset via command`, { user: context.username });
                    break;
                case 'add':
                    if (targetValue) {
                        const minutes = parseFloat(targetValue);
                        if (!isNaN(minutes) && minutes > 0) {
                            this.addTime(Math.floor(minutes * 60));
                            ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}added time`, { minutes, user: context.username });
                        }
                    }
                    break;
                case 'remove':
                case 'subtract':
                    if (targetValue) {
                        const minutes = parseFloat(targetValue);
                        if (!isNaN(minutes) && minutes > 0) {
                            this.removeTime(Math.floor(minutes * 60));
                            ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}removed time`, { minutes, user: context.username });
                        }
                    }
                    break;
                case 'set':
                    if (targetValue) {
                        const minutes = parseFloat(targetValue);
                        if (!isNaN(minutes) && minutes >= 0) {
                            this.currentSeconds = Math.floor(minutes * 60);
                            this.updateDisplay();
                            ErrorHandler.info(`Timer ${isTargeted ? '(' + this.config.timerName + ') ' : ''}set to specific time`, { minutes, user: context.username });
                        }
                    }
                    break;
            }
        }, {
            modOnly: true,
            description: 'Control stream timers',
            broadcast: true
        });
    }

    subscribeToCommands(commandBus) {
        // Subscribe to any !timer broadcast to ensure all instances react correctly
        commandBus.subscribe('!timer', (context) => {
            // Note: GlobalCommandBus broadcast logic already prevents the sender from re-executing
            // We reuse the same logic as the main handler but without permissions checks
            const args = context.args;
            if (!args || args.length === 0) return;

            const actions = ['start', 'pause', 'stop', 'reset', 'add', 'remove', 'subtract', 'set'];
            let targetAction = '';
            let targetValue = '';

            if (this.config.timerName && args[0].toLowerCase() === this.config.timerName.toLowerCase()) {
                targetAction = args[1]?.toLowerCase();
                targetValue = args[2];
            } else if (actions.includes(args[0].toLowerCase())) {
                targetAction = args[0].toLowerCase();
                targetValue = args[1];
            } else {
                return;
            }

            switch (targetAction) {
                case 'start': this.start(); break;
                case 'pause':
                case 'stop': this.pause(); break;
                case 'reset': this.reset(); break;
                case 'add':
                    if (targetValue) {
                        const min = parseFloat(targetValue);
                        if (!isNaN(min)) this.addTime(Math.floor(min * 60));
                    }
                    break;
                case 'remove':
                case 'subtract':
                    if (targetValue) {
                        const min = parseFloat(targetValue);
                        if (!isNaN(min)) this.removeTime(Math.floor(min * 60));
                    }
                    break;
                case 'set':
                    if (targetValue) {
                        const min = parseFloat(targetValue);
                        if (!isNaN(min)) {
                            this.currentSeconds = Math.floor(min * 60);
                            this.updateDisplay();
                        }
                    }
                    break;
            }
        });
    }

    start() {
        if (this.timerInterval) return;
        
        this.isPaused = false;
        this.lastDecayTime = Date.now();
        this.playSound('start');
        
        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    }

    pause() {
        this.isPaused = true;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.playSound('remove'); // Small feedback for pause/stop
        }
    }

    reset() {
        this.pause();
        this.initializeTimer();
        this.playSound('remove');
    }

    tick() {
        if (this.isPaused) return;
        
        const mode = this.config.mode;
        
        switch (mode) {
            case 'countdown':
            case 'subathon':
            case 'tipathon':
            case 'goalathon':
                this.currentSeconds--;
                if (this.currentSeconds <= 0) {
                    this.handleZero();
                } else if (this.currentSeconds <= 10) {
                    this.elements.display.classList.add('warning');
                } else {
                    this.elements.display.classList.remove('warning');
                }
                break;
                
            case 'countup':
                this.currentSeconds++;
                if (this.config.maxTime > 0 && this.currentSeconds >= this.config.maxTime * 3600) {
                    this.handleZero();
                }
                break;
                
            case 'pomodoro':
                this.currentSeconds--;
                if (this.currentSeconds <= 0) {
                    this.handlePomodoroComplete();
                }
                break;
                
            case 'hype':
                const now = Date.now();
                const elapsed = (now - this.lastDecayTime) / 1000;
                
                // Smoother decay: check every second, but apply decay based on rate
                // decayRate is seconds to remove per minute
                if (elapsed >= 1) {
                    const decayPerSecond = this.config.decayRate / 60;
                    this.currentSeconds -= decayPerSecond;
                    this.lastDecayTime = now;
                    
                    if (this.currentSeconds <= 0) {
                        this.handleZero();
                    }
                }
                break;
        }
        
        // Apply caps and floors
        if (this.config.maxTime > 0) {
            const maxSeconds = this.config.maxTime * 3600;
            if (this.currentSeconds > maxSeconds) {
                this.currentSeconds = maxSeconds;
            }
        }
        
        if (this.config.minTime > 0) {
            const minSeconds = this.config.minTime * 60;
            if (this.currentSeconds < minSeconds) {
                this.currentSeconds = minSeconds;
            }
        }
        
        this.updateDisplay();
    }

    handleZero() {
        this.currentSeconds = 0;
        this.updateDisplay();
        this.playSound('end');
        
        switch (this.config.atZero) {
            case 'stop':
                this.pause();
                break;
            case 'loop':
                this.reset();
                this.start();
                break;
            case 'pause':
                this.pause();
                break;
            case 'hide':
                this.elements.container.style.display = 'none';
                this.pause();
                break;
        }
    }

    handlePomodoroComplete() {
        if (this.pomodoroPhase === 'work') {
            this.pomodoroCompletedCycles++;
            
            // Check if it's time for a long break
            if (this.pomodoroCompletedCycles % this.config.cyclesBeforeLong === 0) {
                this.pomodoroPhase = 'longbreak';
                this.currentSeconds = this.config.longBreakDuration * 60;
                this.playSound('longBreak');
            } else {
                this.pomodoroPhase = 'break';
                this.currentSeconds = this.config.breakDuration * 60;
                this.playSound('end'); // Use 'end' for regular break start
            }
        } else {
            // Break is over, back to work
            this.pomodoroPhase = 'work';
            this.currentSeconds = this.config.workDuration * 60;
            this.playSound('start');
        }
        
        this.updateModeIndicator();
        this.updateCycleIndicator();
    }

    addTime(seconds) {
        this.currentSeconds += seconds;
        this.playSound('add');
        this.showTimeAddition(seconds);
        this.elements.display.classList.add('pulse');
        setTimeout(() => this.elements.display.classList.remove('pulse'), 1000);
        this.updateDisplay();
    }

    removeTime(seconds) {
        this.currentSeconds -= seconds;
        if (this.currentSeconds < 0) this.currentSeconds = 0;
        this.playSound('remove');
        this.updateDisplay();
    }

    playSound(type) {
        let soundName = 'none';
        switch (type) {
            case 'start': soundName = this.config.soundStart; break;
            case 'end': soundName = this.config.soundEnd; break;
            case 'longBreak': soundName = this.config.soundLongBreak; break;
            case 'add': soundName = this.config.soundAdd; break;
            case 'remove': soundName = this.config.soundRemove; break;
        }

        if (soundName === 'none') return;

        const url = SOUND_ASSETS[type]?.[soundName];
        if (!url) return;

        const audio = new Audio(url);
        audio.volume = this.config.volume / 100;
        audio.play().catch(e => {
            if (!this.isSettingsMode) {
                console.warn('Audio play blocked. Interaction required.', e);
            }
        });
    }

    showTimeAddition(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        let text = '+';
        if (minutes > 0) text += `${minutes}m `;
        if (secs > 0) text += `${secs}s`;
        
        this.elements.timeAddition.textContent = text;
        this.elements.timeAddition.style.animation = 'none';
        setTimeout(() => {
            this.elements.timeAddition.style.animation = 'fadeInOut 2s ease-out';
        }, 10);
    }

    updateDisplay() {
        let hours = Math.floor(this.currentSeconds / 3600);
        let minutes = Math.floor((this.currentSeconds % 3600) / 60);
        let seconds = Math.floor(this.currentSeconds % 60);
        
        // Handle negative time display for debugging
        if (this.currentSeconds < 0) {
            hours = 0;
            minutes = 0;
            seconds = 0;
        }
        
        let display = '';
        if (this.config.showHours || hours > 0) {
            display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        
        this.elements.display.textContent = display;
    }

    updateModeIndicator() {
        if (!this.config.showMode) {
            this.elements.modeIndicator.style.display = 'none';
            return;
        }
        
        let text = '';
        switch (this.config.mode) {
            case 'countdown':
                text = 'Countdown';
                break;
            case 'countup':
                text = 'Count Up';
                break;
            case 'pomodoro':
                text = this.pomodoroPhase === 'work' ? '🍅 Focus Time' : 
                       this.pomodoroPhase === 'longbreak' ? '☕ Long Break' : '☕ Break Time';
                break;
            case 'subathon':
                text = '⭐ Subathon';
                break;
            case 'tipathon':
                text = '💰 Tipathon';
                break;
            case 'goalathon':
                text = '🎯 Goalathon';
                break;
            case 'hype':
                text = '🔥 Hype Timer';
                break;
        }
        
        this.elements.modeIndicator.textContent = text;
    }

    updateCycleIndicator() {
        if (this.config.mode === 'pomodoro') {
            this.elements.cycleIndicator.style.display = 'block';
            this.elements.cycleIndicator.textContent = `Cycle ${this.pomodoroCompletedCycles + 1}`;
        } else {
            this.elements.cycleIndicator.style.display = 'none';
        }
    }

    applySettings() {
        const { fontFamily, fontSize, color, theme, label } = this.config;
        
        // Apply font
        if (fontFamily && fontFamily !== 'Inter') {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;700&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        
        // Inject dynamic styles
        let styleEl = document.getElementById('dynamic-timer-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-timer-styles';
            document.head.appendChild(styleEl);
        }
        
        // Only override color if it's not the default white (meaning user customized it)
        const colorStyle = (color && color !== '#ffffff') ? `color: ${color};` : '';
        
        styleEl.textContent = `
            body {
                font-family: "${fontFamily}", system-ui, -apple-system, sans-serif;
            }
            #timer-display {
                font-size: ${fontSize}px;
                ${colorStyle}
            }
            #mode-indicator, #timer-label, #cycle-indicator {
                ${colorStyle}
            }
        `;
        
        // Apply theme
        this.applyTheme(theme);
        
        // Set label
        if (label) {
            this.elements.label.textContent = label;
            this.elements.label.style.display = 'block';
        } else {
            this.elements.label.style.display = 'none';
        }
    }

    applyTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme', 'transparent-theme');
        
        switch (theme) {
            case 'light':
                document.body.classList.add('light-theme');
                document.documentElement.classList.remove('dark');
                document.body.style.backgroundColor = 'hsl(var(--background))';
                break;
            case 'dark':
                document.body.classList.add('dark-theme');
                document.documentElement.classList.add('dark');
                document.body.style.backgroundColor = 'hsl(var(--background))';
                break;
            case 'transparent':
            default:
                document.body.classList.add('transparent-theme');
                // For transparent mode, inherit from parent or use system preference
                const savedTheme = localStorage.getItem('theme');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
                document.documentElement.classList.toggle('dark', shouldBeDark);
                document.body.style.backgroundColor = 'transparent';
                break;
        }
    }

    // =====================
    // SETTINGS PANEL LOGIC
    // =====================

    initializeSettingsPanel() {
        // Load saved settings or use current config
        this.loadSettings();
        
        // Setup event listeners
        this.setupSettingsListeners();
        
        // Initialize font picker
        this.initFontPicker();
        
        // Update UI to match current settings
        this.updateSettingsUI();
        
        // Generate initial URL
        this.syncUrlWithSettings();
    }

    loadSettings() {
        const saved = StorageService.get('timerSettings');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }
    }

    saveSettings() {
        StorageService.set('timerSettings', this.config);
    }

    setupSettingsListeners() {
        const panel = document.getElementById('settings-panel');
        const toggleBtn = document.getElementById('toggle-settings');
        const resetBtn = document.getElementById('reset-settings');
        
        // Toggle settings panel
        toggleBtn?.addEventListener('click', () => {
            panel.classList.toggle('hidden');
            toggleBtn.ariaExpanded = !panel.classList.contains('hidden');
        });

        // Reset settings
        resetBtn?.addEventListener('click', () => {
            window.location.search = '';
        });
        
        // Mode selection
        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.config.mode = e.target.value;
            this.updateModeSettingsVisibility();
            this.saveSettings();
            this.syncUrlWithSettings();
            this.reset();
            this.updateModeIndicator();
        });

        document.getElementById('timer-name').addEventListener('input', (e) => {
            this.config.timerName = e.target.value.trim();
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        // Basic duration inputs
        ['hours-input', 'minutes-input', 'seconds-input'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.split('-')[0];
                this.config[field] = parseInt(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
                this.reset();
            });
        });
        
        // Pomodoro settings
        ['work-duration', 'break-duration', 'long-break-duration', 'cycles-before-long'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = parseInt(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Subathon settings
        ['time-per-sub', 'time-per-tier2', 'time-per-tier3', 'time-per-gift'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = parseFloat(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Tipathon settings
        ['time-per-currency', 'tip-minimum'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = id === 'time-per-currency' ? parseInt(e.target.value) : parseFloat(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Goalathon settings
        document.getElementById('goal-type').addEventListener('change', (e) => {
            this.config.goalType = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        ['milestone-interval', 'time-per-milestone'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = parseInt(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Hype settings
        ['decay-rate', 'activity-boost', 'follow-boost'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = parseInt(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Universal settings
        document.getElementById('at-zero').addEventListener('change', (e) => {
            this.config.atZero = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        document.getElementById('auto-start').addEventListener('change', (e) => {
            this.config.autoStart = e.target.checked;
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        document.getElementById('enable-commands').addEventListener('change', (e) => {
            this.config.enableCommands = e.target.checked;
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        ['max-time', 'min-time'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                const field = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                this.config[field] = parseInt(e.target.value) || 0;
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });
        
        // Display settings
        document.getElementById('show-hours').addEventListener('change', (e) => {
            this.config.showHours = e.target.checked;
            this.saveSettings();
            this.syncUrlWithSettings();
            this.updateDisplay();
        });
        
        document.getElementById('show-mode').addEventListener('change', (e) => {
            this.config.showMode = e.target.checked;
            this.saveSettings();
            this.syncUrlWithSettings();
            this.updateModeIndicator();
        });
        
        document.getElementById('timer-label').addEventListener('input', (e) => {
            this.config.label = e.target.value;
            this.elements.label.textContent = e.target.value;
            this.elements.label.style.display = e.target.value ? 'block' : 'none';
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        // Style settings
        document.getElementById('font-size').addEventListener('input', (e) => {
            this.config.fontSize = parseInt(e.target.value);
            document.getElementById('font-size-value').textContent = e.target.value;
            this.applySettings();
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        document.getElementById('color-picker').addEventListener('input', (e) => {
            this.config.color = e.target.value;
            this.applySettings();
            this.saveSettings();
            this.syncUrlWithSettings();
        });
        
        // Theme buttons
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.config.theme = e.target.dataset.theme;
                this.applyTheme(this.config.theme);
                this.saveSettings();
                this.syncUrlWithSettings();
            });
        });

        // Sound settings
        document.getElementById('setting-volume').addEventListener('input', (e) => {
            this.config.volume = parseInt(e.target.value);
            document.getElementById('volume-value').textContent = `${e.target.value}%`;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('sound-start').addEventListener('change', (e) => {
            this.config.soundStart = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('sound-end').addEventListener('change', (e) => {
            this.config.soundEnd = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('sound-long-break').addEventListener('change', (e) => {
            this.config.soundLongBreak = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('sound-add').addEventListener('change', (e) => {
            this.config.soundAdd = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('sound-remove').addEventListener('change', (e) => {
            this.config.soundRemove = e.target.value;
            this.saveSettings();
            this.syncUrlWithSettings();
        });

        document.getElementById('test-sound-start').addEventListener('click', () => this.playSound('start'));
        document.getElementById('test-sound-end').addEventListener('click', () => this.playSound('end'));
        document.getElementById('test-sound-long-break').addEventListener('click', () => this.playSound('longBreak'));
        document.getElementById('test-sound-add').addEventListener('click', () => this.playSound('add'));
        document.getElementById('test-sound-remove').addEventListener('click', () => this.playSound('remove'));
        
        // Copy URL button
        document.getElementById('copy-obs-url')?.addEventListener('click', () => {
            this.copyOBSUrl();
        });
        
        // Control buttons
        document.getElementById('start-timer').addEventListener('click', () => this.start());
        document.getElementById('pause-timer').addEventListener('click', () => this.pause());
        document.getElementById('reset-timer').addEventListener('click', () => this.reset());
        document.getElementById('add-minute').addEventListener('click', () => this.addTime(60));
        document.getElementById('sub-minute').addEventListener('click', () => this.removeTime(60));
    }

    updateModeSettingsVisibility() {
        // Hide all mode-specific sections
        document.getElementById('basic-settings').style.display = 'none';
        document.getElementById('pomodoro-settings').style.display = 'none';
        document.getElementById('subathon-settings').style.display = 'none';
        document.getElementById('tipathon-settings').style.display = 'none';
        document.getElementById('goalathon-settings').style.display = 'none';
        document.getElementById('hype-settings').style.display = 'none';
        
        // Show relevant section
        switch (this.config.mode) {
            case 'countdown':
            case 'countup':
                document.getElementById('basic-settings').style.display = 'block';
                break;
            case 'pomodoro':
                document.getElementById('pomodoro-settings').style.display = 'block';
                break;
            case 'subathon':
                document.getElementById('basic-settings').style.display = 'block';
                document.getElementById('subathon-settings').style.display = 'block';
                break;
            case 'tipathon':
                document.getElementById('basic-settings').style.display = 'block';
                document.getElementById('tipathon-settings').style.display = 'block';
                break;
            case 'goalathon':
                document.getElementById('basic-settings').style.display = 'block';
                document.getElementById('goalathon-settings').style.display = 'block';
                break;
            case 'hype':
                document.getElementById('basic-settings').style.display = 'block';
                document.getElementById('hype-settings').style.display = 'block';
                break;
        }
    }

    updateSettingsUI() {
        // Mode
        document.getElementById('mode-select').value = this.config.mode;
        this.updateModeSettingsVisibility();
        
        // Basic duration
        document.getElementById('hours-input').value = this.config.hours;
        document.getElementById('minutes-input').value = this.config.minutes;
        document.getElementById('seconds-input').value = this.config.seconds;
        
        // Pomodoro
        document.getElementById('work-duration').value = this.config.workDuration;
        document.getElementById('break-duration').value = this.config.breakDuration;
        document.getElementById('long-break-duration').value = this.config.longBreakDuration;
        document.getElementById('cycles-before-long').value = this.config.cyclesBeforeLong;
        
        // Subathon
        document.getElementById('time-per-sub').value = this.config.timePerSub;
        document.getElementById('time-per-tier2').value = this.config.timePerTier2;
        document.getElementById('time-per-tier3').value = this.config.timePerTier3;
        document.getElementById('time-per-gift').value = this.config.timePerGift;
        
        // Tipathon
        document.getElementById('time-per-currency').value = this.config.timePerCurrency;
        document.getElementById('tip-minimum').value = this.config.tipMinimum;
        
        // Goalathon
        document.getElementById('goal-type').value = this.config.goalType;
        document.getElementById('milestone-interval').value = this.config.milestoneInterval;
        document.getElementById('time-per-milestone').value = this.config.timePerMilestone;
        
        // Hype
        document.getElementById('decay-rate').value = this.config.decayRate;
        document.getElementById('activity-boost').value = this.config.activityBoost;
        document.getElementById('follow-boost').value = this.config.followBoost;
        
        // Universal
        document.getElementById('at-zero').value = this.config.atZero;
        document.getElementById('auto-start').checked = this.config.autoStart;
        document.getElementById('enable-commands').checked = this.config.enableCommands;
        document.getElementById('timer-name').value = this.config.timerName || '';
        document.getElementById('max-time').value = this.config.maxTime;
        document.getElementById('min-time').value = this.config.minTime;
        
        // Display
        document.getElementById('show-hours').checked = this.config.showHours;
        document.getElementById('show-mode').checked = this.config.showMode;
        document.getElementById('timer-label').value = this.config.label;
        
        // Style
        document.getElementById('selected-font').textContent = this.config.fontFamily;
        document.getElementById('font-size').value = this.config.fontSize;
        document.getElementById('font-size-value').textContent = this.config.fontSize;
        document.getElementById('color-picker').value = this.config.color;

        // Sounds
        document.getElementById('setting-volume').value = this.config.volume;
        document.getElementById('volume-value').textContent = `${this.config.volume}%`;
        document.getElementById('sound-start').value = this.config.soundStart;
        document.getElementById('sound-end').value = this.config.soundEnd;
        document.getElementById('sound-long-break').value = this.config.soundLongBreak;
        document.getElementById('sound-add').value = this.config.soundAdd;
        document.getElementById('sound-remove').value = this.config.soundRemove;
        
        // Theme
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.config.theme);
        });
    }

    syncUrlWithSettings() {
        // This method is called internally to keep settings in sync
        // The actual URL generation happens in copyOBSUrl
    }

    copyOBSUrl() {
        const params = new URLSearchParams();
        
        // Get auth from TwitchService if available
        const authConfig = TwitchService.getAuthConfig();
        if (authConfig && authConfig.token) {
            params.append('token', authConfig.token.replace('oauth:', ''));
        }
        if (authConfig && authConfig.username) {
            params.append('username', authConfig.username);
            params.append('channel', authConfig.username);
        }
        if (authConfig && authConfig.channelId) {
            params.append('channelId', authConfig.channelId);
        }
        
        // Add all config to URL
        Object.entries(this.config).forEach(([key, value]) => {
            if (key !== 'token' && key !== 'channelId' && value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
        
        const baseUrl = window.location.origin + window.location.pathname;
        const fullUrl = `${baseUrl}?${params.toString()}`;
        
        navigator.clipboard.writeText(fullUrl).then(() => {
            const btn = document.getElementById('copy-obs-url');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
            btn.classList.remove('bg-primary', 'hover:shadow-primary/40');
            btn.classList.add('bg-green-500', 'hover:shadow-green-500/40');
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('bg-green-500', 'hover:shadow-green-500/40');
                btn.classList.add('bg-primary', 'hover:shadow-primary/40');
            }, 2000);
        });
    }

    initFontPicker() {
        const trigger = document.getElementById('font-picker-trigger');
        const dropdown = document.getElementById('font-picker-dropdown');
        const search = document.getElementById('font-search');
        const list = document.getElementById('font-list');
        
        // Populate font list
        this.renderFontList(AVAILABLE_FONTS);
        
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
        
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Search fonts
        search.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = AVAILABLE_FONTS.filter(font => 
                font.toLowerCase().includes(query)
            );
            this.renderFontList(filtered);
        });
        
        // Select font
        list.addEventListener('click', (e) => {
            if (e.target.classList.contains('font-item')) {
                const font = e.target.dataset.font;
                this.config.fontFamily = font;
                document.getElementById('selected-font').textContent = font;
                this.applySettings();
                this.saveSettings();
                this.syncUrlWithSettings();
                dropdown.classList.remove('active');
            }
        });
    }

    renderFontList(fonts) {
        const list = document.getElementById('font-list');
        list.innerHTML = fonts.map(font => 
            `<div class="font-item${font === this.config.fontFamily ? ' active' : ''}" data-font="${font}">${font}</div>`
        ).join('');
    }
}

// Initialize timer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StreamTimer());
} else {
    new StreamTimer();
}
