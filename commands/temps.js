import { config } from '../config.js';

function sendMessage(message, client) {
    console.warn(message, client);
    client.say(config.settings.TWITCH.CHANNEL_NAME, message).catch(console.error);
}

function truncateDecimals(number, digits) {
    return number.toFixed(digits);
}

function convertCelciusToFahrenheit(celcius) {
    return truncateDecimals(celcius * 9 / 5 + 32, 0);
}

function convertFahrenheitToCelcius(fahrenheit) {
    return truncateDecimals((fahrenheit - 32) * 5 / 9, 0);
}

export function messageHandleTempertature(message, client) {
    const match = message.match(/(\s|^)\d{1,}[CF](\s|$)/i);

    if (!match) {
        return;
    }

    const value = parseInt(match[0]);
    const unit = match[0].replace(value, "");

    if (unit === 'C' || unit === 'c') {
        sendMessage(`${value}°C is ${convertCelciusToFahrenheit(value)}°F`, client);
    } else {
        sendMessage(`${value}°F is ${convertFahrenheitToCelcius(value)}°C`, client);
    }
}