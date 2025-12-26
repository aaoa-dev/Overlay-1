/**
 * Stream Stats Service
 * Tracks follower count, subscription count, and other stream statistics across different time ranges
 */

import { StorageService } from './StorageService.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

export class StreamStatsService {
    static STORAGE_KEYS = {
        BASELINES: 'stream_stats_baselines',
        LAST_TOTALS: 'stream_stats_last_totals'
    };

    constructor() {
        this.baselines = {
            day: { followers: 0, subs: 0, date: null },
            month: { followers: 0, subs: 0, date: null },
            session: { followers: 0, subs: 0 }
        };
        this.lastKnownTotals = { followers: 0, subs: 0 };
        this.load();
    }

    /**
     * Load baselines from storage
     */
    load() {
        try {
            const stored = StorageService.get(StreamStatsService.STORAGE_KEYS.BASELINES);
            if (stored) {
                this.baselines = { ...this.baselines, ...stored };
            }
            this.lastKnownTotals = StorageService.get(StreamStatsService.STORAGE_KEYS.LAST_TOTALS, { followers: 0, subs: 0 });
            ErrorHandler.debug('Stream stats loaded', { baselines: this.baselines, lastTotals: this.lastKnownTotals });
        } catch (error) {
            ErrorHandler.handle(error, 'stream_stats_load');
        }
    }

    /**
     * Save baselines to storage
     */
    save() {
        try {
            StorageService.set(StreamStatsService.STORAGE_KEYS.BASELINES, this.baselines);
            StorageService.set(StreamStatsService.STORAGE_KEYS.LAST_TOTALS, this.lastKnownTotals);
        } catch (error) {
            ErrorHandler.handle(error, 'stream_stats_save');
        }
    }

    /**
     * Update baselines with current counts
     * @param {number} currentFollowers 
     * @param {number} currentSubs 
     */
    update(currentFollowers, currentSubs) {
        const now = new Date();
        const today = now.toDateString();
        const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
        let changed = false;

        this.lastKnownTotals = { followers: currentFollowers, subs: currentSubs };

        // Initialize baselines if they are 0 (first time)
        if (this.baselines.day.followers === 0 && currentFollowers > 0) {
            this.baselines.day.followers = currentFollowers;
            changed = true;
        }
        if (this.baselines.day.subs === 0 && currentSubs > 0) {
            this.baselines.day.subs = currentSubs;
            changed = true;
        }
        if (this.baselines.month.followers === 0 && currentFollowers > 0) {
            this.baselines.month.followers = currentFollowers;
            changed = true;
        }
        if (this.baselines.month.subs === 0 && currentSubs > 0) {
            this.baselines.month.subs = currentSubs;
            changed = true;
        }

        // Period change detection
        if (this.baselines.day.date && this.baselines.day.date !== today) {
            this.baselines.day = {
                followers: currentFollowers,
                subs: currentSubs,
                date: today
            };
            changed = true;
            ErrorHandler.info('New day baseline set', this.baselines.day);
        } else if (!this.baselines.day.date) {
            this.baselines.day.date = today;
            changed = true;
        }

        if (this.baselines.month.date && this.baselines.month.date !== thisMonth) {
            this.baselines.month = {
                followers: currentFollowers,
                subs: currentSubs,
                date: thisMonth
            };
            changed = true;
            ErrorHandler.info('New month baseline set', this.baselines.month);
        } else if (!this.baselines.month.date) {
            this.baselines.month.date = thisMonth;
            changed = true;
        }

        // Session baseline
        if (this.baselines.session.followers === 0 && currentFollowers > 0) {
            this.baselines.session.followers = currentFollowers;
            changed = true;
        }
        if (this.baselines.session.subs === 0 && currentSubs > 0) {
            this.baselines.session.subs = currentSubs;
            changed = true;
        }

        this.save();
    }

    /**
     * Get relative count based on range
     * @param {number} currentTotal 
     * @param {string} range - 'day', 'month', 'session', 'all'
     * @param {string} type - 'followers' or 'subs'
     * @returns {number}
     */
    getRelativeCount(currentTotal, range, type) {
        if (range === 'all' || !this.baselines[range]) {
            return currentTotal;
        }

        const baseline = this.baselines[range][type] || 0;
        return Math.max(0, currentTotal - baseline);
    }

    /**
     * Get current stats for a range
     * @param {string} range - 'day', 'month', 'session', 'all'
     * @returns {Object} { followers, subs, date }
     */
    getStats(range = 'day') {
        return {
            followers: this.getRelativeCount(this.lastKnownTotals.followers, range, 'followers'),
            subs: this.getRelativeCount(this.lastKnownTotals.subs, range, 'subs'),
            date: this.baselines.day.date
        };
    }

    /**
     * Increment follower count (backward compatibility for alerts.js)
     */
    incrementFollowers() {
        this.lastKnownTotals.followers++;
        this.save();
        return this.getStats('day').followers;
    }

    /**
     * Increment sub count (backward compatibility for alerts.js)
     */
    incrementSubs() {
        this.lastKnownTotals.subs++;
        this.save();
        return this.getStats('day').subs;
    }

    /**
     * Format stats as string
     */
    formatStats() {
        const stats = this.getStats('day');
        return `📊 Today's Stats: ${stats.followers} followers, ${stats.subs} subs`;
    }

    /**
     * Reset baselines
     */
    reset() {
        const now = new Date();
        this.baselines.day = {
            followers: this.lastKnownTotals.followers,
            subs: this.lastKnownTotals.subs,
            date: now.toDateString()
        };
        this.baselines.month = {
            followers: this.lastKnownTotals.followers,
            subs: this.lastKnownTotals.subs,
            date: `${now.getFullYear()}-${now.getMonth()}`
        };
        this.baselines.session = {
            followers: this.lastKnownTotals.followers,
            subs: this.lastKnownTotals.subs
        };
        this.save();
        ErrorHandler.info('Stream stats reset (baselines updated to current totals)');
    }
}
