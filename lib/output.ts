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

import _ = require('lodash');

var OUT_FORMAT = '%s[ %s ] %s';

function fixPrefix(prefix):string {
    if (!_.isString(prefix)) {
        prefix = '';
    }

    return prefix;
}

function getColor(text:string, color:any) {
    if (process['colorEnabled']) {
        if (!_.isArray(color)) {
            color = [color];
        }

        _(color).each(function (c:string) {
            text = text[c];
        });
    }

    return text;
}

export function error(m, prefix?:string) {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('ERR', ['red', 'bold']),
        m
    );
}

export function warning(m, prefix?:string) {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('WARN', ['yellow', 'bold']),
        m
    );
}

export function info(m, prefix?:string) {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('INFO', ['blue', 'bold']),
        m
    );
}

export function ok(m, prefix?:string) {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('OK', ['green', 'bold']),
        m
    );
}

export function indent(spaces:number) {
    var ret = '';

    for (var i = 0; i < spaces; i++) {
        ret += ' ';
    }

    return ret;
}
