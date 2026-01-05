/**
 * Emote Service
 * Handles fetching and caching 7TV, BTTV, and FFZ emotes
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class EmoteService {
    constructor() {
        this.emotes = new Map(); // Map of code -> imageUrl
        this.isLoaded = false;
    }

    /**
     * Initialize emotes for a channel
     * @param {string} channelId - Twitch channel ID
     */
    async initialize(channelId = null) {
        try {
            console.log('[EmoteService] Initializing with channelId:', channelId);

            const requests = [
                this.fetchBTTVGlobal(),
                this.fetchFFZGlobal()
            ];

            if (channelId) {
                requests.push(
                    this.fetch7TV(channelId),
                    this.fetchBTTV(channelId),
                    this.fetchFFZ(channelId)
                );
            }

            const results = await Promise.allSettled(requests);
            
            this.isLoaded = true;
            console.log(`[EmoteService] Loaded ${this.emotes.size} total 3rd party emotes.`);
            
            // Log a few loaded emotes for verification
            const sample = Array.from(this.emotes.keys()).slice(0, 5);
            console.log('[EmoteService] Sample emotes:', sample);

        } catch (error) {
            ErrorHandler.handle(error, 'emote_service_init');
        }
    }

    /**
     * Fetch 7TV emotes
     */
    async fetch7TV(channelId) {
        try {
            const response = await fetch(`https://7tv.io/v3/users/twitch/${channelId}`);
            if (!response.ok) {
                console.warn(`[EmoteService] 7TV fetch failed: ${response.status}`);
                return;
            }
            const data = await response.json();
            
            // 7TV v3 structure: data.emote_set.emotes
            const emoteSet = data.emote_set || (data.user && data.user.emote_set);
            if (emoteSet && emoteSet.emotes) {
                emoteSet.emotes.forEach(emote => {
                    // Use webp for better compatibility
                    const url = `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;
                    this.emotes.set(emote.name, url);
                });
                console.log(`[EmoteService] Loaded ${emoteSet.emotes.length} 7TV emotes.`);
            }
        } catch (error) {
            console.error('[EmoteService] 7TV Error:', error);
        }
    }

    /**
     * Fetch BTTV emotes
     */
    async fetchBTTV(channelId) {
        try {
            const response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`);
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.channelEmotes) {
                data.channelEmotes.forEach(emote => {
                    this.emotes.set(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/3x`);
                });
            }
            if (data.sharedEmotes) {
                data.sharedEmotes.forEach(emote => {
                    this.emotes.set(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/3x`);
                });
            }
        } catch (error) {
            ErrorHandler.debug('BTTV emotes not available', { channelId });
        }
    }

    /**
     * Fetch BTTV global emotes
     */
    async fetchBTTVGlobal() {
        try {
            const response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
            if (!response.ok) return;
            const data = await response.json();
            
            data.forEach(emote => {
                this.emotes.set(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/3x`);
            });
            console.log(`[EmoteService] Loaded ${data.length} BTTV global emotes.`);
        } catch (error) {
            console.error('[EmoteService] BTTV Global Error:', error);
        }
    }

    /**
     * Fetch FFZ emotes
     */
    async fetchFFZ(channelId) {
        try {
            const response = await fetch(`https://api.frankerfacez.com/v1/room/id/${channelId}`);
            if (!response.ok) {
                if (response.status !== 404) console.warn(`[EmoteService] FFZ fetch failed: ${response.status}`);
                return;
            }
            const data = await response.json();
            
            if (data.sets) {
                let count = 0;
                Object.values(data.sets).forEach(set => {
                    set.emoticons.forEach(emote => {
                        const url = emote.urls['4'] || emote.urls['2'] || emote.urls['1'];
                        this.emotes.set(emote.name, url);
                        count++;
                    });
                });
                console.log(`[EmoteService] Loaded ${count} FFZ emotes.`);
            }
        } catch (error) {
            console.error('[EmoteService] FFZ Error:', error);
        }
    }

    /**
     * Fetch FFZ global emotes
     */
    async fetchFFZGlobal() {
        try {
            const response = await fetch('https://api.frankerfacez.com/v1/set/global');
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.sets) {
                let count = 0;
                Object.values(data.sets).forEach(set => {
                    set.emoticons.forEach(emote => {
                        const url = emote.urls['4'] || emote.urls['2'] || emote.urls['1'];
                        this.emotes.set(emote.name, url);
                        count++;
                    });
                });
                console.log(`[EmoteService] Loaded ${count} FFZ global emotes.`);
            }
        } catch (error) {
            console.error('[EmoteService] FFZ Global Error:', error);
        }
    }

    /**
     * Get emote URL by code
     * @param {string} code - Emote code
     * @returns {string|null} Emote URL
     */
    getEmoteUrl(code) {
        return this.emotes.get(code) || null;
    }

    /**
     * Process text and replace 3rd party emotes
     * @param {string} text - Message text
     * @returns {string} Processed HTML
     */
    processText(text) {
        if (!this.isLoaded || !text) return text;

        // Use a more robust word boundary regex that handles punctuation
        return text.split(/(\s+)/).map(part => {
            if (/^\s+$/.test(part)) return part;
            
            // Handle punctuation next to emotes (e.g., "EZ!")
            const cleanWord = part.replace(/[.,!?;:]+$/, '');
            const punctuation = part.substring(cleanWord.length);
            
            const emoteUrl = this.getEmoteUrl(cleanWord);
            if (emoteUrl) {
                return `<img class="emote" src="${emoteUrl}" alt="${cleanWord}" title="${cleanWord}" />${punctuation}`;
            }
            return part;
        }).join('');
    }
}

