"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityGenerator = exports.Entity = void 0;
const simulation_1 = require("./simulation");
const queue_1 = require("./queue");
const random_1 = require("./random");
const util_1 = require("./util");
class Entity {
    constructor(options) {
        this._sim = null;
        this._queues = new Map();
        this._serial = 0;
        this._prty = 0;
        this._serial = Entity._serial++;
        util_1.setOptions(this, options);
    }
    get simulation() {
        return this._sim;
    }
    get serial() {
        return this._serial;
    }
    get priority() {
        return this._prty;
    }
    set priority(value) {
        this._prty = value;
    }
    delay(delay, path, signal) {
        return __awaiter(this, void 0, void 0, function* () {
            util_1.assert(delay >= 0, 'delays must be >= 0');
            util_1.assert(path == null || path.queues.length > 1, 'delay path should have at least two queues');
            return new simulation_1.FecItem(this, {
                delay: delay,
                path: path,
                signal: signal
            }).promise;
        });
    }
    enterQueue(queue, units = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            return new simulation_1.FecItem(this, {
                queue: queue,
                units: units
            }).promise;
        });
    }
    enterQueueImmediately(queue, units = 1) {
        queue.add(this, units);
    }
    canEnterQueue(q, units = 1) {
        return q.canEnter(units);
    }
    seize(resource, delay, waitingQueues = null, preemptSignal = null, units = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (waitingQueues instanceof queue_1.Queue) {
                waitingQueues = [waitingQueues];
            }
            while (delay >= 1e-3) {
                if (preemptSignal != null) {
                    this.sendSignal(preemptSignal);
                }
                if (waitingQueues != null) {
                    waitingQueues.forEach(q => this.enterQueueImmediately(q, units));
                }
                yield this.enterQueue(resource, units);
                if (waitingQueues != null) {
                    waitingQueues.forEach(q => this.leaveQueue(q));
                }
                delay -= yield this.delay(delay, null, preemptSignal);
                this.leaveQueue(resource);
            }
        });
    }
    leaveQueue(q) {
        q.remove(this);
    }
    waitSignal(signal) {
        return __awaiter(this, void 0, void 0, function* () {
            return new simulation_1.FecItem(this, {
                signal: signal
            }).promise;
        });
    }
    sendSignal(signal, releaseMax) {
        let fec = this.simulation._fec, cnt = 0;
        for (let i = 0; i < fec.length; i++) {
            if (releaseMax != null && cnt >= releaseMax) {
                break;
            }
            let item = fec[i];
            if (item.options.signal == signal) {
                item.ready = true;
                cnt++;
            }
        }
        return cnt;
    }
    getAnimationPosition(q, start, end) {
        return null;
    }
    dispose() {
        if (this._queues.size) {
            let queues = [];
            Array.from(this._queues.keys()).forEach(q => queues.push(q.name));
            util_1.assert(false, () => `Entity finished script without leaving all queues: ${queues.join(', ')}.`);
        }
    }
    toString() {
        if (!this._str) {
            this._str = this.constructor.name + '#' + this.serial.toString();
        }
        return this._str;
    }
    script() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.Entity = Entity;
Entity._serial = 0;
class EntityGenerator extends Entity {
    constructor(entityType, interval, max, timeStart, timeEnd) {
        super();
        this._type = entityType;
        this._interval = interval;
        this._max = max;
        this._tmStart = timeStart;
        this._tmEnd = timeEnd;
    }
    script() {
        return __awaiter(this, void 0, void 0, function* () {
            const sim = this.simulation, now = sim.timeNow, interval = this._interval;
            if (this._tmStart != null && now < this._tmStart) {
                yield this.delay(this._tmStart - now);
            }
            if (interval != null && this._tmStart == null) {
                const delay = interval instanceof random_1.RandomVar ? interval.sample() : interval;
                yield this.delay(delay / 2);
            }
            for (let cnt = 0;; cnt++) {
                if (this._max != null && cnt >= this._max) {
                    break;
                }
                if (this._tmEnd != null && sim.timeNow > this._tmEnd) {
                    break;
                }
                const e = new this._type;
                util_1.assert(e instanceof Entity, 'Entity expected');
                this.simulation.activate(e);
                if (interval != null) {
                    const delay = interval instanceof random_1.RandomVar ? interval.sample() : interval;
                    yield this.delay(delay);
                }
                else {
                    break;
                }
            }
        });
    }
}
exports.EntityGenerator = EntityGenerator;
