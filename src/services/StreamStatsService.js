/**
 * Stream Stats Service
 * Tracks follower count, subscription count, and other stream statistics
 */

import { StorageService } from './StorageService.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class StreamStatsService {
    static STORAGE_KEYS = {
        FOLLOWER_COUNT: 'stream_follower_count',
        SUB_COUNT: 'stream_sub_count',
        STATS_DATE: 'stream_stats_date'
    };

    constructor() {
        this.followerCount = 0;
        this.subCount = 0;
        this.statsDate = null;
        this.load();
    }

    /**
     * Load stats from storage
     */
    load() {
        try {
            this.followerCount = StorageService.get(StreamStatsService.STORAGE_KEYS.FOLLOWER_COUNT, 0);
            this.subCount = StorageService.get(StreamStatsService.STORAGE_KEYS.SUB_COUNT, 0);
            this.statsDate = StorageService.get(StreamStatsService.STORAGE_KEYS.STATS_DATE);

            // Reset if it's a new day
            const today = new Date().toDateString();
            if (this.statsDate !== today) {
                ErrorHandler.info('New stream day detected, resetting stats');
                this.reset();
                this.statsDate = today;
                this.save();
            }

            ErrorHandler.debug('Stream stats loaded', {
                followers: this.followerCount,
                subs: this.subCount,
                date: this.statsDate
            });
        } catch (error) {
            ErrorHandler.handle(error, 'stream_stats_load');
        }
    }

    /**
     * Save stats to storage
     */
    save() {
        try {
            StorageService.set(StreamStatsService.STORAGE_KEYS.FOLLOWER_COUNT, this.followerCount);
            StorageService.set(StreamStatsService.STORAGE_KEYS.SUB_COUNT, this.subCount);
            StorageService.set(StreamStatsService.STORAGE_KEYS.STATS_DATE, this.statsDate);

            ErrorHandler.debug('Stream stats saved', {
                followers: this.followerCount,
                subs: this.subCount
            });
        } catch (error) {
            ErrorHandler.handle(error, 'stream_stats_save');
        }
    }

    /**
     * Increment follower count
     * @returns {number} New follower count
     */
    incrementFollowers() {
        this.followerCount++;
        this.save();
        ErrorHandler.info('Follower count incremented', { count: this.followerCount });
        return this.followerCount;
    }

    /**
     * Increment subscription count
     * @returns {number} New sub count
     */
    incrementSubs() {
        this.subCount++;
        this.save();
        ErrorHandler.info('Sub count incremented', { count: this.subCount });
        return this.subCount;
    }

    /**
     * Get current follower count
     * @returns {number}
     */
    getFollowerCount() {
        return this.followerCount;
    }

    /**
     * Get current subscription count
     * @returns {number}
     */
    getSubCount() {
        return this.subCount;
    }

    /**
     * Set follower count manually
     * @param {number} count - Follower count
     */
    setFollowerCount(count) {
        this.followerCount = Math.max(0, count);
        this.save();
        ErrorHandler.info('Follower count set', { count: this.followerCount });
    }

    /**
     * Set subscription count manually
     * @param {number} count - Sub count
     */
    setSubCount(count) {
        this.subCount = Math.max(0, count);
        this.save();
        ErrorHandler.info('Sub count set', { count: this.subCount });
    }

    /**
     * Reset all stats to 0
     */
    reset() {
        this.followerCount = 0;
        this.subCount = 0;
        this.save();
        ErrorHandler.info('Stream stats reset');
    }

    /**
     * Get stats summary
     * @returns {Object} Stats summary
     */
    getStats() {
        return {
            followers: this.followerCount,
            subs: this.subCount,
            date: this.statsDate
        };
    }

    /**
     * Format stats as string
     * @returns {string} Formatted stats
     */
    formatStats() {
        return `📊 Stream Stats: ${this.followerCount} followers, ${this.subCount} subs today`;
    }
}

