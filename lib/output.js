"use strict";

var _ = require('underscore')._,
    c = require('colors');

var OUT_FORMAT = '%s[ %s ] %s';

function fixPrefix(prefix) {
    if (!_.isString(prefix)) {
        prefix = '';
    }

    return prefix;
}

function getColor(text, color) {
    if (module.exports.colorEnabled) {
        return text[color];
    }

    return text;
}

module.exports = {
    colorEnabled: true,
    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    error: function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('ERR', 'red'),
            m
        );
    },
    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    warning: function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('WARN', 'yellow'),
            m
        );
    },
    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    info: function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('INFO', 'blue'),
            m
        );
    },
    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    ok: function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('OK', 'green'),
            m
        );
    },
    /**
     * @param {Number} spaces
     * @return {String}
     */
    indent: function (spaces) {
        var ret = '';

        for (var i = 0; i < spaces; i++) {
            ret += ' ';
        }

        return ret;
    }
};
