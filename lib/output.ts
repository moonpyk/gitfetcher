/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2014 Clément Bourgeois
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

function getColor(text:string, color:any):string {
    if (!process['colorEnabled']) {
        return text;
    }

    if (!_.isArray(color)) {
        color = [color];
    }

    _.each(color, function (c:string) {
        text = text[c];
    });

    return text;
}

export function error(m, prefix?:string):void {
    console.error(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('ERR', ['red', 'bold']),
        m
    );
}

export function warning(m, prefix?:string):void {
    console.warn(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('WARN', ['yellow', 'bold']),
        m
    );
}

export function info(m, prefix?:string):void {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('INFO', ['blue', 'bold']),
        m
    );
}

export function ok(m, prefix?:string):void {
    console.log(
        OUT_FORMAT,
        fixPrefix(prefix),
        getColor('OK', ['green', 'bold']),
        m
    );
}

export function indent(spaces:number):string {
    var ret = '';

    for (var i = 0; i < spaces; i++) {
        ret += ' ';
    }

    return ret;
}
