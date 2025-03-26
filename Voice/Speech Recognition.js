// Import config
import { config } from '../config/config.js';
import { tmi } from './tmi.js';

// Define bad words to monitor
const badWords = ['fuck', 'shit', 'bitch', 'technically', 'f*ck', 'sh*t', 'b*tch'];

var client;
let recognition = null;

function updateStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    console.log(message);
}

function sendMessage(message) {
    updateStatus(`Sending: ${message}`);
    client.say(config.settings.TWITCH.CHANNEL_NAME, message).catch(error => {
        updateStatus(`Error sending message: ${error}`);
        console.error(error);
    });
}

function handleBadWord(badWord) {    
    // Handle censored versions of words
    if (badWord.includes('*')) {
        // Map censored words to their commands
        const censoredMap = {
            'f*ck': '!fuck',
            'sh*t': '!shit',
            'b*tch': '!bitch'
        };
        sendMessage(censoredMap[badWord] || `!${badWord}`);
    } else {
        // Handle regular words
        sendMessage(`!${badWord}`);
    }
}

function appendScriptFilesToDocument(filePaths) {
    return new Promise((resolve, reject) => {
        let count = 0;
        const total = filePaths.length;

        if (total === 0) {
            resolve();
        }

        function appendFile(filePath) {
            let file;

            if (filePath.endsWith('.js')) {
                file = document.createElement('script');
                file.src = filePath;
            } else if (filePath.endsWith('.css')) {
                file = document.createElement('link');
                file.rel = 'stylesheet';
                file.href = filePath;
            } else {
                reject(new Error('Unsupported file type'));
            }

            if (!file) return reject(new Error('File could not be loaded'));

            file.addEventListener('load', () => {
                count++;
                if (count === total) {
                    resolve();
                } else {
                    appendFile(filePaths[count]);
                }
            });

            file.addEventListener('error', (err) => {
                reject(err);
            });

            document.head.appendChild(file);
        }

        appendFile(filePaths[0]);
    });
}

function captureSpeech() {
    try {
        // Clean up existing recognition if any
        if (recognition) {
            recognition.stop();
        }

        recognition = new webkitSpeechRecognition() || new SpeechRecognition();
        var speechRecognitionList = new webkitSpeechGrammarList() || new SpeechGrammarList();
        recognition.grammars = speechRecognitionList;
        recognition.continuous = true;
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = event => {
            const result = event.results[event.results.length - 1][0].transcript;
            updateStatus(`Detected: ${result}`);

            badWords.forEach(badWord => {
                result.split(' ').forEach(word => {
                    // Check for exact matches or starts with for better accuracy
                    if (word.toLowerCase() === badWord || word.toLowerCase().startsWith(badWord)) {
                        handleBadWord(badWord);
                    }
                });
            });
        };

        recognition.onend = () => {
            updateStatus("Speech recognition service disconnected");
            // Add a small delay before restarting to prevent rapid reconnection attempts
            setTimeout(captureSpeech, 2000);
        };

        recognition.onerror = (event) => {
            updateStatus(`Speech recognition error: ${event.error}`);
            // Add a small delay before restarting to prevent rapid reconnection attempts
            setTimeout(captureSpeech, 2000);
        };
        
        recognition.start();
        updateStatus("Speech recognition service connected");
    } catch (error) {
        updateStatus(`Failed to initialize speech recognition: ${error}`);
        console.error('Failed to initialize speech recognition:', error);
        // Add a small delay before restarting to prevent rapid reconnection attempts
        setTimeout(captureSpeech, 2000);
    }
}

// Initialize the system
appendScriptFilesToDocument([
    'https://cdn.nomercy.tv/js/tmi.js',
]).then(() => {
    // Remove the 'oauth:' prefix since it's already in the config
    const oauthToken = config.settings.TWITCH.OAUTH_TOKEN.replace('oauth:', '');

    client = new tmi.Client({
        options: {
            skipUpdatingEmotesets: true,
        },
        identity: {
            username: config.settings.TWITCH.USERNAME,
            password: `oauth:${oauthToken}`,
        },
        channels: [config.settings.TWITCH.CHANNEL_NAME],
    });

    client.connect().then(() => {
        updateStatus('Connected to Twitch');
        captureSpeech();
    }).catch(error => {
        updateStatus(`Failed to connect to Twitch: ${error}`);
        console.error('Failed to connect to Twitch:', error);
    });

    // client.on('message', (channel, tags, message, self) => {
    //     console.log(`${tags['display-name']}: ${message}`);
    // });

}).catch((err) => {
    updateStatus(`Failed to load TMI.js: ${err}`);
    console.error('Failed to load TMI.js:', err);
});