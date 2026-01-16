/**
 * Twitch EventSub WebSocket Service
 * Handles real-time Twitch events via WebSocket connection
 * Supports EventSub V2 including Hype Train events
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class TwitchEventSub {
    constructor(accessToken, channelId) {
        this.accessToken = accessToken;
        this.channelId = channelId;
        this.ws = null;
        this.sessionId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.keepaliveTimeout = null;
        this.keepaliveTimeoutSeconds = 10;
    }

    /**
     * Connect to Twitch EventSub WebSocket
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = 'wss://eventsub.wss.twitch.tv/ws';
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    ErrorHandler.info('EventSub: WebSocket opened');
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    ErrorHandler.handle(error, 'eventsub_error');
                    reject(error);
                };

                this.ws.onclose = (event) => {
                    this.handleClose(event);
                };

                // Store resolve for when we get session_welcome
                this.connectResolve = resolve;
                this.connectReject = reject;

            } catch (error) {
                ErrorHandler.handle(error, 'eventsub_connect');
                reject(error);
            }
        });
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const { metadata, payload } = message;

            if (this.keepaliveTimeout) {
                clearTimeout(this.keepaliveTimeout);
            }

            switch (metadata.message_type) {
                case 'session_welcome':
                    this.handleWelcome(payload);
                    break;

                case 'session_keepalive':
                    this.handleKeepalive();
                    break;

                case 'notification':
                    this.handleNotification(payload);
                    break;

                case 'session_reconnect':
                    this.handleReconnect(payload);
                    break;

                case 'revocation':
                    this.handleRevocation(payload);
                    break;

                default:
                    ErrorHandler.warn('EventSub: Unknown message type', metadata.message_type);
            }

            // Set keepalive timeout
            this.keepaliveTimeout = setTimeout(() => {
                ErrorHandler.warn('EventSub: Keepalive timeout, reconnecting...');
                this.reconnect();
            }, (this.keepaliveTimeoutSeconds + 10) * 1000);

        } catch (error) {
            ErrorHandler.handle(error, 'eventsub_handle_message');
        }
    }

    /**
     * Handle session welcome message
     */
    handleWelcome(payload) {
        this.sessionId = payload.session.id;
        this.keepaliveTimeoutSeconds = payload.session.keepalive_timeout_seconds;
        this.isConnected = true;
        this.reconnectAttempts = 0;

        ErrorHandler.info('EventSub: Connected', { sessionId: this.sessionId });

        if (this.connectResolve) {
            this.connectResolve(this.sessionId);
            this.connectResolve = null;
            this.connectReject = null;
        }
    }

    /**
     * Handle keepalive message
     */
    handleKeepalive() {
        // Just reset the timeout, already handled in handleMessage
    }

    /**
     * Handle notification message (events)
     */
    handleNotification(payload) {
        const subscriptionType = payload.subscription.type;
        const event = payload.event;

        ErrorHandler.debug('EventSub: Notification', { type: subscriptionType, event });

        // Emit to registered handlers
        if (this.eventHandlers.has(subscriptionType)) {
            const handlers = this.eventHandlers.get(subscriptionType);
            handlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    ErrorHandler.handle(error, 'eventsub_handler_error', { type: subscriptionType });
                }
            });
        }

        // Also emit to wildcard handlers
        if (this.eventHandlers.has('*')) {
            const handlers = this.eventHandlers.get('*');
            handlers.forEach(handler => {
                try {
                    handler(subscriptionType, event);
                } catch (error) {
                    ErrorHandler.handle(error, 'eventsub_wildcard_handler_error');
                }
            });
        }
    }

    /**
     * Handle reconnect message
     */
    handleReconnect(payload) {
        const reconnectUrl = payload.session.reconnect_url;
        ErrorHandler.info('EventSub: Reconnect requested', { url: reconnectUrl });
        
        // Create new connection to reconnect URL
        const newWs = new WebSocket(reconnectUrl);
        
        newWs.onopen = () => {
            ErrorHandler.info('EventSub: Reconnected');
        };

        newWs.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        newWs.onerror = (error) => {
            ErrorHandler.handle(error, 'eventsub_reconnect_error');
        };

        newWs.onclose = (event) => {
            this.handleClose(event);
        };

        // Close old connection after new one is established
        if (this.ws) {
            this.ws.close();
        }

        this.ws = newWs;
    }

    /**
     * Handle revocation message
     */
    handleRevocation(payload) {
        ErrorHandler.warn('EventSub: Subscription revoked', payload);
    }

    /**
     * Handle WebSocket close
     */
    handleClose(event) {
        ErrorHandler.info('EventSub: Connection closed', { code: event.code, reason: event.reason });
        this.isConnected = false;
        this.sessionId = null;

        if (this.keepaliveTimeout) {
            clearTimeout(this.keepaliveTimeout);
            this.keepaliveTimeout = null;
        }

        // Attempt reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            ErrorHandler.info(`EventSub: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.reconnect();
            }, delay);
        }
    }

    /**
     * Reconnect to EventSub
     */
    async reconnect() {
        if (this.ws) {
            this.ws.close();
        }
        
        try {
            await this.connect();
            
            // Re-subscribe to all events
            // Note: Subscriptions need to be re-created via API after reconnect
            ErrorHandler.info('EventSub: Reconnected successfully');
        } catch (error) {
            ErrorHandler.handle(error, 'eventsub_reconnect');
        }
    }

    /**
     * Subscribe to an event type
     * Note: This only registers a local handler. The actual subscription
     * must be created via the Twitch API
     * 
     * @param {string} eventType - Event type (e.g., 'channel.hype_train.begin')
     * @param {Function} handler - Event handler function
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    /**
     * Unsubscribe from an event type
     */
    off(eventType, handler) {
        if (this.eventHandlers.has(eventType)) {
            const handlers = this.eventHandlers.get(eventType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Subscribe to Hype Train events via Twitch API
     * This must be called after connect() is successful
     */
    async subscribeToHypeTrain() {
        if (!this.sessionId) {
            throw new Error('Not connected to EventSub. Call connect() first.');
        }

        if (!this.accessToken || !this.channelId) {
            throw new Error('Access token and channel ID required for subscriptions');
        }

        // Using V2 - V1 was deprecated and withdrawn January 15, 2026
        // Requires channel:read:hype_train scope
        const subscriptions = [
            { type: 'channel.hype_train.begin', version: '2' },
            { type: 'channel.hype_train.progress', version: '2' },
            { type: 'channel.hype_train.end', version: '2' }
        ];

        const results = [];

        for (const sub of subscriptions) {
            try {
                const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Default client ID
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: sub.type,
                        version: sub.version,
                        condition: {
                            broadcaster_user_id: this.channelId
                        },
                        transport: {
                            method: 'websocket',
                            session_id: this.sessionId
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    ErrorHandler.info(`EventSub: Subscribed to ${sub.type}`, data);
                    results.push({ type: sub.type, success: true });
                } else {
                    const error = await response.json();
                    ErrorHandler.warn(`EventSub: Failed to subscribe to ${sub.type}`, error);
                    results.push({ type: sub.type, success: false, error });
                }
            } catch (error) {
                ErrorHandler.handle(error, 'eventsub_subscribe', { type: sub.type });
                results.push({ type: sub.type, success: false, error });
            }
        }

        return results;
    }

    /**
     * Disconnect from EventSub
     */
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        if (this.keepaliveTimeout) {
            clearTimeout(this.keepaliveTimeout);
            this.keepaliveTimeout = null;
        }

        this.isConnected = false;
        this.sessionId = null;
        this.eventHandlers.clear();
        
        ErrorHandler.info('EventSub: Disconnected');
    }

    /**
     * Check if connected
     */
    connected() {
        return this.isConnected && this.sessionId !== null;
    }
}
