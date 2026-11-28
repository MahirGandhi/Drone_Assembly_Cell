"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomInt = exports.LogNormal = exports.Normal = exports.Gamma = exports.Erlang = exports.Exponential = exports.Empirical = exports.Triangular = exports.Uniform = exports.RandomVar = void 0;
const util_1 = require("./util");
class RandomVar {
    constructor(seed = null) {
        this._seed = null;
        this._seed = seed;
    }
    sample() {
        if (this._seed == null) {
            return Math.random();
        }
        let t = this._seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
exports.RandomVar = RandomVar;
class Uniform extends RandomVar {
    constructor(min, max, seed) {
        super(seed);
        util_1.assert(max >= min, 'max >= min');
        this._min = min;
        this._max = max;
    }
    get min() {
        return this._min;
    }
    get max() {
        return this._max;
    }
    sample() {
        return this._min + super.sample() * (this._max - this._min);
    }
}
exports.Uniform = Uniform;
class Triangular extends RandomVar {
    constructor(min, mode, max, seed) {
        super(seed);
        util_1.assert(min <= mode && mode <= max, 'min, mode, max should be in order');
        this._min = min;
        this._peak = mode;
        this._max = max;
    }
    get min() {
        return this._min;
    }
    get mode() {
        return this._peak;
    }
    get max() {
        return this._max;
    }
    sample() {
        const rng = this._max - this._min, c = (rng > 0) ? (this._peak - this._min) / rng : 0, u = super.sample();
        return (u <= c)
            ? this._min + rng * Math.sqrt(c * u)
            : this._min + rng * (1 - Math.sqrt((1 - c) * (1 - u)));
    }
}
exports.Triangular = Triangular;
class Empirical extends RandomVar {
    constructor(xVals, yVals, seed) {
        super(seed);
        util_1.assert(yVals.length == xVals.length, 'x and y arrays should have the same length');
        for (let i = 1; i < yVals.length; i++) {
            util_1.assert(xVals[i] >= xVals[i - 1] && yVals[i] >= yVals[i - 1], 'x and y arrays should be in ascending order');
        }
        util_1.assert(yVals[0] == 0 && yVals[yVals.length - 1] == 1, 'y values should range from zero to one');
        this._xVals = xVals;
        this._yVals = yVals;
    }
    get xVals() {
        return this._xVals;
    }
    get yVals() {
        return this._yVals;
    }
    sample() {
        const y = super.sample(), xVals = this._xVals, yVals = this._yVals;
        let i = 0;
        while (y > yVals[i] && i < yVals.length) {
            i++;
        }
        if (i == 0) {
            return xVals[0];
        }
        return xVals[i - 1] + (y - yVals[i - 1]) * (xVals[i] - xVals[i - 1]) / (yVals[i] - yVals[i - 1]);
    }
}
exports.Empirical = Empirical;
class Exponential extends RandomVar {
    constructor(mean, seed) {
        super(seed);
        util_1.assert(mean > 0, 'mean >= 0');
        this._mean = mean;
    }
    get mean() {
        return this._mean;
    }
    sample() {
        return -this._mean * Math.log(super.sample());
    }
}
exports.Exponential = Exponential;
class Erlang extends Exponential {
    constructor(shape, scale, seed) {
        util_1.assert(Number.isInteger(shape) && shape > 0, 'shape parameter must be an integer > 0.');
        super(scale, seed);
        this._shape = shape;
    }
    get shape() {
        return this._shape;
    }
    get scale() {
        return this._mean;
    }
    sample() {
        let val = 0;
        for (let i = 0; i < this._shape; i++) {
            val += super.sample();
        }
        return val;
    }
}
exports.Erlang = Erlang;
class Gamma extends RandomVar {
    constructor(shape, scale, seed) {
        super(seed);
        util_1.assert(shape > 0, 'shape parameter must be > 0.');
        this._shape = shape;
        this._scale = scale;
    }
    get shape() {
        return this._shape;
    }
    get scale() {
        return this._scale;
    }
    sample() {
        const shape = this._shape, scale = this._scale;
        if (shape > 0 && shape < 1) {
            const b = (Math.E + shape) / Math.E;
            for (let i = 0; i < 1000; i++) {
                const p = b * super.sample();
                if (p <= 1) {
                    const y = Math.pow(p, (1 / shape));
                    if (super.sample() <= Math.exp(-y)) {
                        return scale * y;
                    }
                }
                else {
                    const y = -Math.log((b - p) / shape);
                    if (super.sample() <= Math.pow(y, shape - 1)) {
                        return scale * y;
                    }
                }
            }
            util_1.assert(false, 'Possible infinite loop generating Gamma variable');
        }
        else if (shape == 1) {
            return -scale * Math.log(super.sample());
        }
        else if (shape > 1) {
            for (let i = 0;; i++) {
                const a = 1 / Math.sqrt(2 * shape - 1), b = shape - Math.log(4), q = shape + 1 / a, t = 4.5, d = 1 + Math.log(t), u1 = super.sample(), u2 = super.sample(), v = a * Math.log(u1 / (1 - u1)), y = shape * Math.exp(v), z = u1 * u1 * u2, w = b + q * v - y;
                if (w + d - t * z >= 0 || w >= Math.log(z)) {
                    return scale * y;
                }
            }
        }
    }
}
exports.Gamma = Gamma;
class Normal extends RandomVar {
    constructor(mean, std, positive = true, seed) {
        super(seed);
        this._positive = true;
        util_1.assert(std >= 0, 'std >= 0');
        this._mean = mean;
        this._std = std;
        this._positive = positive;
    }
    get mean() {
        return this._mean;
    }
    get std() {
        return this._std;
    }
    sample() {
        let n1 = this._n1;
        if (n1 != null) {
            this._n1 = null;
        }
        else {
            let v1, v2, w, y;
            do {
                v1 = 2 * super.sample() - 1;
                v2 = 2 * super.sample() - 1;
                w = v1 * v1 + v2 * v2;
            } while (w > 1);
            y = Math.sqrt(-2 * Math.log(w) / w);
            this._n1 = v1 * y;
            n1 = v2 * y;
        }
        let val = this._mean + this._std * n1;
        return this._positive ? Math.max(0, val) : val;
    }
}
exports.Normal = Normal;
class LogNormal extends Normal {
    constructor(mean, std, seed) {
        const sq_mean = mean * mean, sq_stddev = std * std, m = Math.log(sq_mean / Math.sqrt(sq_mean + sq_stddev)), s = Math.sqrt(Math.log((sq_mean + sq_stddev) / sq_mean));
        super(m, s, false, seed);
        this._lnMean = mean;
        this._lnStd = std;
    }
    get mean() {
        return this._lnMean;
    }
    get std() {
        return this._lnStd;
    }
    sample() {
        return this._lnMean == 0
            ? 0
            : Math.pow(Math.E, super.sample());
    }
}
exports.LogNormal = LogNormal;
class RandomInt extends RandomVar {
    constructor(max, seed) {
        super(seed);
        this._max = max;
    }
    get max() {
        return this._max;
    }
    sample() {
        return Math.floor(super.sample() * (this._max + 1));
    }
}
exports.RandomInt = RandomInt;
