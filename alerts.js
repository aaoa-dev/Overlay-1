import { config } from './config.js';

const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    identity: {
        username: config.settings.TWITCH.USERNAME,
        password: config.settings.TWITCH.OAUTH_TOKEN,
    },
    channels: [config.settings.TWITCH.CHANNEL_NAME],
});

// Load stored user dat
let userData = JSON.parse(localStorage.getItem('userVisits')) || {};

// Track current stream date
let currentStreamDate = localStorage.getItem('streamDate') || new Date().toDateString();

// Queue system
const alertQueue = [];
let isPlaying = false;

// Define valid commands
const WELCOME_COMMANDS = ['!in', '!welcome', '!checkin', '!here'];

// Process queue
async function processQueue() {
    if (isPlaying || alertQueue.length === 0) return;
    
    isPlaying = true;
    const { username, color } = alertQueue.shift();
    
    await createInAlert(username, color);
    
    isPlaying = false;
    processQueue(); // Process next item if any
}

// Add to queue
function queueAlert(username, color) {
    alertQueue.push({ username, color });
    processQueue();
}

async function createInAlert(username, color) {
    return new Promise((resolve) => {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        
        const userColor = color || "#ffffff";
        
        alert.className = 'fixed left-1/2 -translate-x-1/2 -top-20 transition-all duration-700';
        alert.innerHTML = `
            <div class="flex items-center bg-black rounded-full p-2 text-white text-2xl">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold" style="background-color: ${userColor}">
                    ${username[0].toUpperCase()}
                </div>
                <div class="px-4">
                    ${username}
                    <span class="opacity-75">has been here ${userData[username].count} times</span>
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
        }, 3000);
    });
}

// Test function
window.testAlert = () => {
    const testUsers = [
        { name: 'TestUser1', color: '#FF0000' },
        { name: 'TestUser2', color: '#00FF00' },
        { name: 'TestUser3', color: '#0000FF' },
        { name: 'TestUser4', color: '#FF00FF' },
        { name: 'TestUser5', color: '#FFFF00' }
    ];
    
    const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
    
    if (!userData[randomUser.name]) {
        userData[randomUser.name] = { count: 0, usedToday: false };
    }
    
    // Check if user already used !in today
    if (userData[randomUser.name].usedToday) {
        console.log(`${randomUser.name} already used !in today`);
        return;
    }
    
    userData[randomUser.name].count++;
    userData[randomUser.name].usedToday = true;
    localStorage.setItem('userVisits', JSON.stringify(userData));

    queueAlert(randomUser.name, randomUser.color);
};

// Handle actual chat messages
client.on("message", (channel, tags, message, self) => {
    if (self) return;

    // Check for text commands
    if (WELCOME_COMMANDS.includes(message.toLowerCase())) {
        handleWelcome(channel, tags);
        return;
    }
});

// Separate the welcome logic into its own function
function handleWelcome(channel, tags) {
    const username = tags['display-name'];
    
    // Initialize user data if first time
    if (!userData[username]) {
        userData[username] = { count: 0, usedToday: false };
    }
    
    // Check if user already used the welcome command today
    if (userData[username].usedToday) {
        console.log(`${username} already checked in today`);
        return;
    }
    
    userData[username].count++;
    userData[username].usedToday = true;
    localStorage.setItem('userVisits', JSON.stringify(userData));

    // Send welcome message based on visit count
    if (userData[username].count <= 1) {
        client.say(channel, `Welcome ${username}!`);
    } else {
        client.say(channel, `Welcome back ${username}!`);
    }

    queueAlert(username, tags.color);
}

// Add reset function
window.resetUsedState = () => {
    Object.keys(userData).forEach(username => {
        userData[username].usedToday = false;
    });
    localStorage.setItem('userVisits', JSON.stringify(userData));
    console.log('All users reset and can use !in again');
};

client.connect().catch(console.error); 