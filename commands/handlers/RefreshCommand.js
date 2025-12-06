/**
 * Refresh Command
 * Allows mods to refresh the overlay
 * Refactored from reset.js
 */

import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class RefreshCommand {
    /**
     * Register the refresh command
     * @param {CommandRegistry} registry - Command registry
     */
    static register(registry) {
        registry.register('!refresh', async (context) => {
            ErrorHandler.info('Refresh command triggered', { username: context.username });
            window.location.reload();
        }, {
            modOnly: true,
            description: 'Refresh the overlay (mods only)'
        });
    }
}

