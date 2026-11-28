"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Point = exports.isNumber = exports.clamp = exports.getElement = exports.setOptions = exports.bind = exports.format = exports.assert = void 0;
const event_1 = require("./event");
function assert(condition, msg) {
    if (!condition) {
        if (typeof msg === 'function') {
            msg = msg();
        }
        console.error(msg);
        throw msg;
    }
}
exports.assert = assert;
function format(value, decimals = 2) {
    return _getNumberFormat(decimals).format(value);
}
exports.format = format;
const _numberFormats = {};
function _getNumberFormat(decimals) {
    let nf = _numberFormats[decimals];
    if (!nf) {
        nf = _numberFormats[decimals] = new Intl.NumberFormat(navigator.language, {
            useGrouping: true,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    return nf;
}
function bind(id, initialValue, onInput, suffix = '', decimals) {
    const input = document.getElementById(id);
    const isCheck = input.type == 'checkbox';
    const isNumber = input.type == 'range' || input.type == 'number';
    const isSelect = input instanceof HTMLSelectElement;
    const fmt = (value) => {
        const dec = decimals != null
            ? decimals
            : value == Math.round(value) ? 0 : 2;
        return ` ${format(value, dec)}${suffix}`;
    };
    if (isCheck) {
        input.checked = initialValue;
    }
    else if (isSelect) {
        input.selectedIndex = initialValue;
    }
    else if (isNumber) {
        input.valueAsNumber = initialValue;
    }
    else {
        input.value = initialValue;
    }
    const span = input.type == 'range'
        ? input.insertAdjacentElement('afterend', document.createElement('span'))
        : null;
    if (span) {
        span.textContent = fmt(input.valueAsNumber);
    }
    input.addEventListener('input', e => {
        if (span) {
            span.textContent = fmt(input.valueAsNumber);
        }
        const value = isCheck ? input.checked :
            isSelect ? input.selectedIndex :
                isNumber ? input.valueAsNumber :
                    input.value;
        onInput(value);
    });
}
exports.bind = bind;
function setOptions(obj, options) {
    if (options) {
        for (let key in options) {
            assert(key in obj, `Property ${key} is not defined`);
            if (obj[key] instanceof event_1.Event) {
                obj[key].addEventListener(options[key]);
            }
            else {
                obj[key] = options[key];
            }
        }
    }
}
exports.setOptions = setOptions;
function getElement(selector) {
    let e = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
    assert(e instanceof Element, 'Element not found:' + selector);
    return e;
}
exports.getElement = getElement;
function clamp(value, min, max) {
    return (min != null && value < min) ? min
        : (max != null && value > max) ? max
            : value;
}
exports.clamp = clamp;
function isNumber(val) {
    return typeof val == 'number';
}
exports.isNumber = isNumber;
class Point {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    static clone(p) {
        return {
            x: p.x,
            y: p.y,
            z: p.z
        };
    }
    static copy(dst, src) {
        dst.x = src.x;
        dst.y = src.y;
        dst.z = src.z;
        return dst;
    }
    static distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z || 0 - p2.z || 0;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    static interpolate(p1, p2, t) {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
            z: (p1.z || 0) + (p2.z || 0 - p1.z || 0) * t
        };
    }
    static angle(p1, p2, radians = false) {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        return radians ? angle : Math.round(angle * 180 / Math.PI);
    }
}
exports.Point = Point;
