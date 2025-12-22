/**
 * Temperature Converter
 * Detects temperature mentions and converts between Celsius and Fahrenheit
 * Refactored from temps.js
 */

import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class TemperatureConverter {
    /**
     * Check message for temperature and convert
     * @param {string} message - Message content
     * @param {Function} reply - Reply function
     */
    static async handleMessage(message, reply) {
        const match = message.match(/(\s|^)\d{1,}[CFcf](\s|$)/i);
        
        if (!match) return;

        try {
            const value = parseInt(match[0]);
            const unit = match[0].replace(value.toString(), '').trim();

            let response;
            if (unit === 'C' || unit === 'c') {
                const fahrenheit = this.celsiusToFahrenheit(value);
                response = `${value}°C is ${fahrenheit}°F`;
            } else {
                const celsius = this.fahrenheitToCelsius(value);
                response = `${value}°F is ${celsius}°C`;
            }

            await reply(response);
            
            ErrorHandler.debug('Temperature conversion', { input: match[0], output: response });
        } catch (error) {
            ErrorHandler.handle(error, 'temperature_conversion', { message });
        }
    }

    /**
     * Convert Celsius to Fahrenheit
     * @param {number} celsius - Temperature in Celsius
     * @returns {number} Temperature in Fahrenheit
     */
    static celsiusToFahrenheit(celsius) {
        return Math.round(celsius * 9 / 5 + 32);
    }

    /**
     * Convert Fahrenheit to Celsius
     * @param {number} fahrenheit - Temperature in Fahrenheit
     * @returns {number} Temperature in Celsius
     */
    static fahrenheitToCelsius(fahrenheit) {
        return Math.round((fahrenheit - 32) * 5 / 9);
    }
}

