"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tally = void 0;
const util_1 = require("./util");
class Tally {
    constructor(options) {
        this._cnt = 0;
        this._min = 0;
        this._max = 0;
        this._sum = 0;
        this._sum2 = 0;
        this._histo = null;
        this._histoParms = null;
        util_1.setOptions(this, options);
    }
    get min() {
        return this._min;
    }
    get max() {
        return this._max;
    }
    get cnt() {
        return this._cnt;
    }
    get avg() {
        return this._cnt > 0
            ? this._sum / this._cnt
            : 0;
    }
    get var() {
        return this._cnt > 0 && this._max > this._min
            ? Math.max(0, (this._sum2 - this._sum * this._sum / this._cnt) / this._cnt)
            : 0;
    }
    get stdev() {
        return Math.sqrt(this.var);
    }
    add(value, weight = 1) {
        util_1.assert(weight >= 0, 'tally weights must be >= 0');
        if (!this._cnt || value > this._max)
            this._max = value;
        if (!this._cnt || value < this._min)
            this._min = value;
        this._cnt += weight;
        this._sum += value * weight;
        this._sum2 += value * value * weight;
        if (this._histo) {
            value = util_1.clamp(value, this._histoParms.min, this._histoParms.max);
            let bin = Math.floor(value / this._histoParms.size);
            let cnt = this._histo.get(bin) || 0;
            this._histo.set(bin, cnt + weight);
        }
    }
    getHistogram() {
        if (this._histo) {
            const bins = this._histo, keys = Array.from(bins.keys());
            keys.sort((a, b) => a - b);
            for (let i = 1; i < keys.length; i++) {
                if (keys[i] > keys[i - 1] + 1) {
                    keys.splice(i, 0, keys[i - 1] + 1);
                }
            }
            const binSize = this._histoParms.size;
            let h = keys.map(key => {
                return {
                    from: key * binSize,
                    to: (key + 1) * binSize,
                    count: bins.get(key) || 0
                };
            });
            if (h.length) {
                const parms = this._histoParms, min = parms.min, max = parms.max;
                if (min != null && h[0].from > this.min) {
                    h[0].from = this.min;
                }
                if (max != null && h[h.length - 1].to < this.max) {
                    h[h.length - 1].to = this.max;
                }
            }
            return h;
        }
        return null;
    }
    getHistogramChart(title = '', scale = 1) {
        const histo = this.getHistogram();
        if (!histo || !histo.length) {
            return '';
        }
        let maxCnt = 0;
        histo.forEach(e => maxCnt = Math.max(maxCnt, e.count));
        const barWidth = Math.round(1 / histo.length * 100), dec = this._histoParms.size < 1 ? 1 : 0;
        let bars = '';
        histo.forEach((e, index) => {
            const cls = this.avg >= e.from && this.avg <= e.to ? ' class="avg"' : '', hei = Math.round(e.count / maxCnt * 100), x = index * barWidth, gap = 5;
            bars += `<g${cls}>
                <title>${e.count} (${Math.round(e.count / this.cnt * 100)}%)</title>
                <rect
                    ${cls}
                    x="calc(${x}% + ${gap}px)"
                    y="calc(${100 - hei}% - 1.2em)"
                    width="calc(${barWidth}% - ${2 * gap}px)"
                    height="${hei}%" />
                <text
                    ${cls}
                    x="${(x + barWidth / 2)}%"
                    y="100%"
                    text-anchor="middle"
                    dominant-baseline="text-top">
                    ${util_1.format(e.from * scale, dec)}-${util_1.format(e.to * scale, dec)}
                </text>
            </g>`;
        });
        return `
            <figure class="ss-histogram">
                <figcaption>${title}</figcaption>
                <svg width="100%" height="100%">
                    ${bars}
                </svg>
            </figure>`;
    }
    setHistogramParameters(binSize, min = null, max = null) {
        if (!binSize) {
            this._histoParms = null;
            this._histo = null;
        }
        else {
            util_1.assert(binSize > 0, 'bin size must be positive');
            util_1.assert(min == null || max == null || min <= max, 'histogram min must be <= max');
            this._histoParms = {
                size: binSize,
                min: min,
                max: max
            };
            this._histo = new Map();
        }
    }
    reset() {
        this._cnt = this._max = this._min = this._sum = this._sum2 = 0;
        if (this._histo) {
            this._histo.clear();
        }
    }
}
exports.Tally = Tally;
