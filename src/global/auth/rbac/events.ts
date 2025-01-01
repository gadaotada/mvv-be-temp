import { EventEmitter } from 'events';

export class RBACEvents extends EventEmitter {
    private static instance: RBACEvents;

    private constructor() {
        super();
    }

    public static getInstance(): RBACEvents {
        if (!this.instance) {
            this.instance = new RBACEvents();
        }
        return this.instance;
    }

    public emit(type: Auth.RBACEventType, payload: any): boolean {
        const event: Auth.RBACEvent = {
            type,
            payload,
            timestamp: Date.now()
        };
        return super.emit(type, event);
    }
}

export const rbacEvents = RBACEvents.getInstance(); 