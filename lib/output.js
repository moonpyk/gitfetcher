/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */
///<reference path="../typings/tsd.d.ts"/>
"use strict";
require('colors');
var _ = require('lodash');
var OUT_FORMAT = '%s[ %s ] %s';
function fixPrefix(prefix) {
    if (!_.isString(prefix)) {
        prefix = '';
    }
    return prefix;
}
function getColor(text, color) {
    if (process['colorEnabled']) {
        if (!_.isArray(color)) {
            color = [color];
        }
        _(color).each(function (c) {
            text = text[c];
        });
    }
    return text;
}
function error(m, prefix) {
    console.log(OUT_FORMAT, fixPrefix(prefix), getColor('ERR', ['red', 'bold']), m);
}
exports.error = error;
function warning(m, prefix) {
    console.log(OUT_FORMAT, fixPrefix(prefix), getColor('WARN', ['yellow', 'bold']), m);
}
exports.warning = warning;
function info(m, prefix) {
    console.log(OUT_FORMAT, fixPrefix(prefix), getColor('INFO', ['blue', 'bold']), m);
}
exports.info = info;
function ok(m, prefix) {
    console.log(OUT_FORMAT, fixPrefix(prefix), getColor('OK', ['green', 'bold']), m);
}
exports.ok = ok;
function indent(spaces) {
    var ret = '';
    for (var i = 0; i < spaces; i++) {
        ret += ' ';
    }
    return ret;
}
exports.indent = indent;
//# sourceMappingURL=output.js.map