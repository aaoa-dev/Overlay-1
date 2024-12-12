import { config } from './config/config.js';

const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    identity: {
        username: config.settings.TWITCH.USERNAME,
        password: config.settings.TWITCH.OAUTH_TOKEN,
    },
    channels: [config.settings.TWITCH.CHANNEL_NAME],
});

// Load stored user data
let userData = JSON.parse(localStorage.getItem('userVisits')) || {};

// Track current stream date
let currentStreamDate = localStorage.getItem('streamDate') || new Date().toDateString();

// Queue system
const alertQueue = [];
let isPlaying = false;

// Define valid commands
const WELCOME_COMMANDS = ['!in', '!welcome', '!checkin', '!here'];

// Define milestones
const MILESTONES = [10, 50, 100];

// Add reset command to valid commands list
const RESET_COMMAND = '!reset';

// Confetti effects for different milestones
function celebrateMilestone(count) {
    if (count >= 100) {
        // Gold rain for 100+ visits
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FFE4B5'],
            gravity: 0.5,
        });
    } else if (count >= 50) {
        // Silver burst for 50+ visits
        confetti({
            particleCount: 100,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#C0C0C0', '#E5E4E2', '#FFFFFF'],
        });
    } else if (count >= 10) {
        // Regular confetti for 10+ visits
        confetti({
            particleCount: 50,
            spread: 45,
        });
    }
}

// Process queue
async function processQueue() {
    if (isPlaying || alertQueue.length === 0) return;
    
    isPlaying = true;
    const { username, color } = alertQueue.shift();
    
    await createAlert(username, color);
    
    isPlaying = false;
    processQueue(); // Process next item if any
}

// Add to queue
function queueAlert(username, color) {
    alertQueue.push({ username, color });
    processQueue();
}

// Create and show alert
async function createAlert(username, color) {
    return new Promise((resolve) => {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        
        const userColor = color || "#ffffff";
        const visitCount = userData[username].count;
        let message = `has been here ${visitCount} times`;

        // Customize message based on visit count
        if (visitCount === 1) {
            message = 'Welcome to the channel!';
        }
        
        alert.className = 'alert-content fixed left-1/2 -translate-x-1/2 -top-20 transition-all duration-700';
        alert.innerHTML = `
            <div class="flex items-center rounded-full p-2 text-white shadow-lg bg-black h-16">
                <div class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center" style="background-color: ${userColor}">
                    <span class="text-2xl font-bold text-white">
                        ${username[0].toUpperCase()}
                    </span>
                </div>
                <div class="flex flex-col px-4 min-w-0">
                    <span class="font-bold truncate">${username}</span>
                    <span class="text-sm opacity-90 truncate">${message}</span>
                </div>
            </div>
        `;

        alertContainer.appendChild(alert);

        // Slide in
        setTimeout(() => {
            alert.style.top = '20px';
        }, 100);

        // Slide out and remove
        setTimeout(() => {
            alert.style.top = '-5rem';
            setTimeout(() => {
                alert.remove();
                resolve();
            }, 700);
        }, 4000);
    });
}

// Handle actual chat messages
client.on("message", (channel, tags, message, self) => {
    if (self) return;
    
    // Check for reset command (only for mods/broadcaster)
    if (message.toLowerCase() === RESET_COMMAND) {
        // Check if user is mod or broadcaster
        if (tags.mod || tags.badges?.broadcaster) {
            resetUsedState();
            client.say(channel, `All user states have been reset! You can use !in again.`);
            return;
        } else {
            client.say(channel, `Sorry @${tags['display-name']}, only moderators can use this command!`);
            return;
        }
    }

    const username = tags['display-name'];

    // Initialize user data if needed
    if (!userData[username]) {
        userData[username] = { 
            count: 0, 
            lastUsed: 0,
            hasChattedThisStream: false
        };
    }

    // Check for first-time chatters using Twitch's tag
    if (tags['first-msg']) {
        handleFirstMessage(channel, tags, true);  // true indicates first time ever
        return;
    }

    // Check for returning chatters using Twitch's tag
    if (tags['returning-chatter']) {
        handleFirstMessage(channel, tags, false);  // false indicates returning chatter
        return;
    }

    // Still allow manual commands as fallback
    if (WELCOME_COMMANDS.includes(message.toLowerCase())) {
        handleWelcome(channel, tags);
        return;
    }
});

// Handle first message in stream
function handleFirstMessage(channel, tags, isFirstTimeEver = false) {
    const username = tags['display-name'];
    const now = new Date().getTime();
    
    // Initialize user data if first time ever
    if (!userData[username]) {
        userData[username] = { count: 0, lastUsed: 0 };
    }
    
    userData[username].count++;
    const newCount = userData[username].count;
    userData[username].lastUsed = now;
    localStorage.setItem('userVisits', JSON.stringify(userData));

    // Send welcome message
    if (isFirstTimeEver) {
        client.say(channel, `Welcome to the channel ${username}! Thanks for chatting for the very first time! 🎉`);
    } else {
        // Check if user hit a milestone
        if (MILESTONES.includes(newCount)) {
            client.say(channel, `🎉 Amazing! ${username} has been here ${newCount} times! Thank you for your continued support! 🎉`);
            celebrateMilestone(newCount);
        } else {
            client.say(channel, `Welcome back ${username}! 👋`);
        }
    }

    // Show alert
    queueAlert(username, tags.color);
}

// Handle manual welcome commands
function handleWelcome(channel, tags) {
    const username = tags['display-name'];
    const now = new Date().getTime();
    
    // Initialize user data if first time
    if (!userData[username]) {
        userData[username] = { count: 0, lastUsed: 0 };
    }
    
    // Check if 24 hours have passed since last use
    const hoursSinceLastUse = (now - (userData[username].lastUsed || 0)) / (1000 * 60 * 60);
    if (hoursSinceLastUse < 24) {
        console.log(`${username} needs to wait ${Math.ceil(24 - hoursSinceLastUse)} more hours`);
        return;
    }
    
    userData[username].count++;
    userData[username].lastUsed = now;
    localStorage.setItem('userVisits', JSON.stringify(userData));

    // Send welcome message based on visit count
    if (userData[username].count <= 1) {
        client.say(channel, `Welcome ${username}!`);
    } else {
        client.say(channel, `Welcome back ${username}!`);
    }

    queueAlert(username, tags.color);
}

// Test functions
globalThis.testAlert = (type = 'new') => {
    const testUsers = [
        { name: 'TestUser1', color: '#FF0000' },
        { name: 'TestUser2', color: '#00FF00' },
        { name: 'TestUser3', color: '#0000FF' },
        { name: 'TestUser4', color: '#FF00FF' },
        { name: 'TestUser5', color: '#FFFF00' }
    ];
    
    const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
    
    if (!userData[randomUser.name]) {
        userData[randomUser.name] = { count: 0, lastUsed: 0 };
    }
    
    // Simulate different visit counts based on type
    if (type === 'new') {
        userData[randomUser.name].count = 1;
    } else if (type === 'milestone100') {
        userData[randomUser.name].count = 100;
    } else if (type === 'milestone50') {
        userData[randomUser.name].count = 50;
    } else if (type === 'milestone10') {
        userData[randomUser.name].count = 10;
    } else {
        userData[randomUser.name].count = Math.floor(Math.random() * 9) + 2; // 2-9 visits
    }
    
    localStorage.setItem('userVisits', JSON.stringify(userData));
    queueAlert(randomUser.name, randomUser.color);
    
    // Trigger confetti for milestones
    if (MILESTONES.includes(userData[randomUser.name].count)) {
        celebrateMilestone(userData[randomUser.name].count);
    }
};

// Reset function
globalThis.resetUsedState = () => {
    Object.keys(userData).forEach(username => {
        userData[username] = {
            ...userData[username],
            lastUsed: 0,
            hasChattedThisStream: false
        };
    });
    localStorage.setItem('userVisits', JSON.stringify(userData));
    console.log('All users reset and can use !in again');
};

// Check and update stream date
const today = new Date().toDateString();
if (currentStreamDate !== today) {
    currentStreamDate = today;
    localStorage.setItem('streamDate', currentStreamDate);
    // Reset user data for the new stream
    Object.keys(userData).forEach(username => {
        userData[username] = {
            ...userData[username],
            hasChattedThisStream: false,
            lastUsed: 0
        };
    });
    localStorage.setItem('userVisits', JSON.stringify(userData));
    console.log('Stream date updated, all user states reset');
}

client.connect().catch(console.error); 