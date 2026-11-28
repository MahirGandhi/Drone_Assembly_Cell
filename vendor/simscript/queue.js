"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const tally_1 = require("./tally");
const util_1 = require("./util");
class Queue {
    constructor(name = '', capacity = null, options) {
        this._sim = null;
        this._name = '';
        this._capy = null;
        this._items = new Map();
        this._tmLastChange = 0;
        this._inUse = 0;
        this._totalIn = 0;
        this._grossPop = new tally_1.Tally();
        this._grossDwell = new tally_1.Tally();
        this._netPop = new tally_1.Tally();
        this._netDwell = new tally_1.Tally();
        this._name = name;
        this._capy = capacity;
        util_1.setOptions(this, options);
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
    get capacity() {
        return this._capy;
    }
    set capacity(value) {
        this._capy = value;
    }
    get unitsInUse() {
        return this._inUse;
    }
    get pop() {
        return this._items.size;
    }
    get totalIn() {
        return this._totalIn;
    }
    get entities() {
        if (!this._entities) {
            this._entities = Array.from(this._items.keys());
        }
        return this._entities;
    }
    get items() {
        return this._items;
    }
    get lastChange() {
        return this._tmLastChange;
    }
    get grossPop() {
        return this._grossPop;
    }
    get grossDwell() {
        return this._grossDwell;
    }
    get netPop() {
        return this._netPop;
    }
    get netDwell() {
        return this._netDwell;
    }
    get utilization() {
        return this.capacity ? this.grossPop.avg / this.capacity : 0;
    }
    get totalCount() {
        return this.grossDwell.cnt;
    }
    get averageLength() {
        return this.grossPop.avg;
    }
    get maxLength() {
        return this.grossPop.max;
    }
    get averageDwell() {
        return this.grossDwell.avg;
    }
    get maxDwell() {
        return this.grossDwell.max;
    }
    canEnter(units = 1) {
        return this.capacity == null || this.unitsInUse + units <= this.capacity;
    }
    add(e, units = 1) {
        let sim = this._sim;
        if (sim == null) {
            sim = this._sim = e.simulation;
            sim.queues.push(this);
            sim.queues.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? +1 : 0);
            this._tmLastChange = 0;
        }
        else if (sim != e.simulation) {
            util_1.assert(false, 'Queue already in use by another simulation');
        }
        util_1.assert(this._items.get(e) == null, () => e.toString() + ' is already in queue' + this.name);
        util_1.assert(this.canEnter(units), 'Queue does not have enough capacity');
        this._updatePopTallies();
        e._queues.set(this, true);
        this._items.set(e, new QueueItem(e, units, sim.timeNow));
        this._inUse += units;
        this._totalIn++;
        const ents = this._entities;
        if (ents) {
            ents.push(e);
        }
    }
    remove(e) {
        const item = this._items.get(e);
        util_1.assert(item != null, () => 'Entity ' + e.toString() + ' is not in queue ' + this.toString());
        this._updatePopTallies();
        this._updateDwellTallies(item.timeIn);
        this._items.delete(e);
        e._queues.delete(this);
        this._inUse -= item.units;
        const ents = this._entities;
        if (ents) {
            ents.splice(ents.indexOf(e), 1);
        }
    }
    reset() {
        this._sim = null;
        this._inUse = 0;
        this._totalIn = 0;
        this._tmLastChange = 0;
        this._entities = null;
        this._items.clear();
        this._grossPop.reset();
        this._grossDwell.reset();
        this._netPop.reset();
        this._netDwell.reset();
    }
    _updateTallies() {
        this._updatePopTallies();
        for (let item of this.items.values()) {
            this._updateDwellTallies(item.timeIn);
        }
    }
    _updatePopTallies() {
        const value = this._inUse, timeNow = this._sim.timeNow, timeDelta = timeNow - this._tmLastChange;
        util_1.assert(timeDelta >= 0, 'Time delta cannot be negative');
        this._grossPop.add(value, timeDelta);
        if (value) {
            this._netPop.add(value, timeDelta);
        }
        this._tmLastChange = timeNow;
    }
    _updateDwellTallies(timeIn) {
        const dwell = this._sim.timeNow - timeIn;
        util_1.assert(dwell >= 0, 'Dwell time cannot be negative');
        this._grossDwell.add(dwell, 1);
        if (dwell > 0) {
            this._netDwell.add(dwell, 1);
        }
    }
}
exports.Queue = Queue;
class QueueItem {
    constructor(e, units, timeIn) {
        this._e = e;
        this._units = units;
        this._timeIn = timeIn;
    }
    get entity() {
        return this._e;
    }
    get units() {
        return this._units;
    }
    get timeIn() {
        return this._timeIn;
    }
}
