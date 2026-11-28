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
exports.FecItem = exports.Simulation = exports.SimulationState = void 0;
const entity_1 = require("./entity");
const event_1 = require("./event");
const util_1 = require("./util");
var SimulationState;
(function (SimulationState) {
    SimulationState[SimulationState["Paused"] = 0] = "Paused";
    SimulationState[SimulationState["Finished"] = 1] = "Finished";
    SimulationState[SimulationState["Running"] = 2] = "Running";
})(SimulationState = exports.SimulationState || (exports.SimulationState = {}));
class Simulation {
    constructor(options) {
        this._fec = [];
        this._name = '';
        this._timeUnit = 'Sim Time';
        this._tmNow = 0;
        this._tmEnd = null;
        this._tmMaxStep = 0;
        this._frameDelay = 0;
        this._tmStart = 0;
        this._tmElapsed = 0;
        this._state = SimulationState.Paused;
        this._queues = [];
        this._lastYield = 0;
        this._lastFrame = 0;
        this._yieldInterval = 250;
        this.starting = new event_1.Event();
        this.started = new event_1.Event();
        this.finishing = new event_1.Event();
        this.finished = new event_1.Event();
        this.stateChanging = new event_1.Event();
        this.stateChanged = new event_1.Event();
        this.timeNowChanging = new event_1.Event();
        this.timeNowChanged = new event_1.Event();
        util_1.setOptions(this, options);
    }
    get name() {
        return this._name;
    }
    set name(value) {
        this._name = value;
    }
    get timeUnit() {
        return this._timeUnit;
    }
    set timeUnit(value) {
        this._timeUnit = value;
    }
    get state() {
        return this._state;
    }
    get timeEnd() {
        return this._tmEnd;
    }
    set timeEnd(value) {
        this._tmEnd = value;
    }
    get maxTimeStep() {
        return this._tmMaxStep;
    }
    set maxTimeStep(value) {
        this._tmMaxStep = value;
    }
    get frameDelay() {
        return this._frameDelay;
    }
    set frameDelay(value) {
        this._frameDelay = value;
    }
    get timeElapsed() {
        return this._state == SimulationState.Running
            ? Date.now() - this._tmStart
            : this._tmElapsed;
    }
    get timeNow() {
        return this._tmNow;
    }
    get yieldInterval() {
        return this._yieldInterval;
    }
    set yieldInterval(value) {
        this._yieldInterval = value;
    }
    start(reset = false) {
        return __awaiter(this, void 0, void 0, function* () {
            reset = reset || this._fec.length == 0;
            if (this.state == SimulationState.Running && !reset) {
                return;
            }
            ;
            if (reset) {
                this._reset();
                this.onStarting();
            }
            this._tmStart = Date.now();
            this._setState(SimulationState.Running);
            if (reset) {
                this.onStarted();
            }
            this._step();
        });
    }
    stop(reset = false) {
        if (this.state == SimulationState.Running) {
            this._tmElapsed = Date.now() - this._tmStart;
            this._setState(SimulationState.Paused);
        }
        if (reset) {
            this._reset();
        }
    }
    activate(e) {
        return __awaiter(this, void 0, void 0, function* () {
            util_1.assert(e.simulation == null, () => 'Entity ' + e.toString() + ' is already active');
            const start = this.timeNow;
            e._sim = this;
            yield e.script();
            e.dispose();
            e._sim = null;
            return this.timeNow - start;
        });
    }
    generateEntities(entityType, interArrival, max, startTime, endTime) {
        const gen = new entity_1.EntityGenerator(entityType, interArrival, max, startTime, endTime);
        this.activate(gen);
    }
    get queues() {
        return this._queues;
    }
    getStatsTable(showNetValues = false) {
        return '<table class="ss-stats">' +
            this._createSimulationReport() +
            this._createQueueReport('Populations', 'grossPop') +
            (showNetValues ? this._createQueueReport('Net Populations', 'netPop') : '') +
            this._createQueueReport('Dwell Times', 'grossDwell') +
            (showNetValues ? this._createQueueReport('Net Dwell Times', 'netDwell') : '') +
            '</table>';
    }
    onStarting(e = event_1.EventArgs.empty) {
        this.starting.raise(this, e);
    }
    onStarted(e = event_1.EventArgs.empty) {
        this.started.raise(this, e);
    }
    onFinishing(e = event_1.EventArgs.empty) {
        this.finishing.raise(this, e);
    }
    onFinished(e = event_1.EventArgs.empty) {
        this.finished.raise(this, e);
    }
    onStateChanging(e = event_1.EventArgs.empty) {
        this.stateChanging.raise(this, e);
    }
    onStateChanged(e = event_1.EventArgs.empty) {
        this.stateChanged.raise(this, e);
    }
    onTimeNowChanging(e = event_1.EventArgs.empty) {
        this.timeNowChanging.raise(this, e);
    }
    onTimeNowChanged(e = event_1.EventArgs.empty) {
        this.timeNowChanged.raise(this, e);
    }
    _setState(value) {
        if (value != this._state) {
            this.onStateChanging();
            this._state = value;
            this.onStateChanged();
        }
    }
    _setTimeNow(value) {
        if (value != this._tmNow) {
            this.onTimeNowChanging();
            this._tmNow = value;
            this.onTimeNowChanged();
        }
    }
    _reset() {
        this._queues.forEach(q => q.reset());
        this._fec = [];
        this._queues = [];
        this._setTimeNow(0);
    }
    _step() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._state != SimulationState.Running) {
                return;
            }
            let nextTime = yield this._scanFec();
            if ((this._tmEnd != null && this._tmNow >= this._tmEnd) ||
                (nextTime < 0)) {
                this._fec = [];
                this._tmElapsed = Date.now() - this._tmStart;
                this.queues.forEach(q => q._updateTallies());
                this.onFinishing();
                this._setState(SimulationState.Finished);
                this.onFinished();
                return;
            }
            if (this.maxTimeStep && this.maxTimeStep > 0 && nextTime > 0) {
                nextTime = Math.min(nextTime, this._tmNow + this.maxTimeStep);
            }
            if (nextTime > 0) {
                this._setTimeNow(nextTime);
                if (this.frameDelay) {
                    const delay = Date.now() - this._lastFrame;
                    if (this.frameDelay > delay) {
                        yield new Promise(r => setTimeout(r, this.frameDelay - delay));
                    }
                    this._lastFrame = Date.now();
                }
            }
            const now = Date.now();
            if (now - this._lastYield > this._yieldInterval) {
                this._lastYield = now;
                requestAnimationFrame(() => this._step());
            }
            else {
                this._step();
            }
        });
    }
    _scanFec() {
        return __awaiter(this, void 0, void 0, function* () {
            let fec = this._fec, dispatched = 0, nextTime = null;
            for (let i = 0; i < fec.length; i++) {
                let item = fec[i], ready = item.ready;
                if (ready) {
                    fec.splice(i, 1);
                    dispatched++;
                    yield item.dispatch();
                    i = -1;
                    continue;
                }
                const timeDue = item.timeDue;
                if (timeDue != null) {
                    if (nextTime == null || nextTime > timeDue) {
                        nextTime = timeDue;
                    }
                }
            }
            if (dispatched > 0) {
                return 0;
            }
            if (nextTime == null) {
                return -1;
            }
            return nextTime;
        });
    }
    _createSimulationReport() {
        return `
            <tr>
                <th colspan="2">${this.name || this.constructor.name}</th>
            </tr>
            <tr>
                <th>Finish Time (${this.timeUnit})</th>
                <td>${util_1.format(this.timeNow, 0)}</td>
            </tr>
            <tr>
                <th>Elapsed Time (s)</th>
                <td>${util_1.format(this.timeElapsed / 1000)}</td>
            <tr>`;
    }
    _createQueueReport(title, tallyName) {
        const isPop = tallyName.indexOf('Pop') > -1;
        let html = `<tr>
                <th colspan="6">
                    ${isPop ? title : title + ' (' + this.timeUnit + ')'}
                </th>
            </tr>
            <tr>
                <th>Queue</th>
                <th>Min</th>
                <th>Avg</th>
                <th>Max</th>
                <th>StDev</th>
                <th>${isPop ? 'Capy' : 'Cnt'}</th>
                <th>${isPop ? 'Utz' : ''}</th>
            </tr>`;
        this.queues.forEach((q) => {
            if (q.name && q.grossDwell.cnt) {
                const capy = q.capacity, tally = q[tallyName];
                html += `<tr>
                    <th>${q.name}</th>
                    <td>${util_1.format(tally.min)}</td>
                    <td>${util_1.format(tally.avg)}</td>
                    <td>${util_1.format(tally.max)}</td>
                    <td>${util_1.format(tally.stdev)}</td>
                    <td>${isPop
                    ? (capy != null ? (util_1.format(capy, 0)) : '*')
                    : util_1.format(tally.cnt, 0)}</td>
                    <td>${isPop
                    ? (capy != null ? util_1.format(q.utilization * 100, 0) + '%' : '')
                    : ''}</td>
                </tr>`;
            }
        });
        return html;
    }
}
exports.Simulation = Simulation;
class FecItem {
    constructor(e, options) {
        this._e = e;
        this._ready = false;
        this._options = options;
        let sim = e.simulation, fec = sim._fec, index = fec.length;
        while (index > 0 && fec[index - 1].e.priority < e.priority) {
            index--;
        }
        fec.splice(index, 0, this);
        this._tmStart = sim.timeNow;
        if (options.delay != null) {
            this._tmDue = sim.timeNow + options.delay;
        }
        if (options.ready != null) {
            this._ready = options.ready;
        }
        this._promise = new Promise(resolve => {
            this._resolve = resolve;
        });
    }
    get e() {
        return this._e;
    }
    get options() {
        return this._options;
    }
    get ready() {
        if (this._ready) {
            return true;
        }
        const options = this.options;
        if (options.queue && options.queue.canEnter(options.units)) {
            return true;
        }
        if (this._tmDue != null && this._tmDue <= this._e.simulation.timeNow) {
            return true;
        }
        return false;
    }
    set ready(value) {
        this._ready = value;
    }
    get timeStart() {
        return this._tmStart;
    }
    get timeDue() {
        return this._tmDue;
    }
    dispatch() {
        return __awaiter(this, void 0, void 0, function* () {
            const e = this._e, sim = e.simulation, options = this._options, q = options.queue;
            if (q) {
                const units = options.units;
                q.add(e, units != null ? units : 1);
            }
            return yield this._resolve(sim.timeNow - this._tmStart);
        });
    }
    get promise() {
        return this._promise;
    }
}
exports.FecItem = FecItem;
