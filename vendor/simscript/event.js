"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = exports.EventArgs = void 0;
class EventListener {
    constructor(listener, self) {
        this.listener = listener;
        this.self = self;
    }
}
class EventArgs {
}
exports.EventArgs = EventArgs;
EventArgs.empty = new EventArgs();
class Event {
    constructor() {
        this._listeners = [];
    }
    addEventListener(listener, self) {
        this._listeners.push(new EventListener(listener, self));
    }
    removeEventListener(listener, self) {
        const listeners = this._listeners;
        for (let i = 0; i < listeners.length; i++) {
            const l = listeners[i];
            if (l.listener == listener || listener == null) {
                if (l.self == self || self == null) {
                    listeners.splice(i, 1);
                    if (self) {
                        break;
                    }
                }
            }
        }
    }
    raise(sender, args) {
        this._listeners.forEach(l => {
            l.listener.call(l.self, sender, args);
        });
    }
}
exports.Event = Event;
