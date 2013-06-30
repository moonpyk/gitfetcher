/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

(function (exports) {
    "use strict";

    require('colors');

    var _ = require('underscore')._;

    var OUT_FORMAT = '%s[ %s ] %s';

    function fixPrefix(prefix) {
        if (!_.isString(prefix)) {
            prefix = '';
        }

        return prefix;
    }

    function getColor(text, color) {
        if (exports.colorEnabled) {
            if (!_.isArray(color)) {
                color = [color];
            }

            _(color).each(function (c) {
                text = text[c];
            });
        }

        return text;
    }

    exports.colorEnabled = true;

    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    exports.error = function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('ERR', ['red', 'bold']),
            m
        );
    };

    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    exports.warning = function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('WARN', ['yellow', 'bold']),
            m
        );
    };

    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    exports.info = function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('INFO', ['blue', 'bold']),
            m
        );
    };

    /**
     * @param {String} m
     * @param {String} [prefix]
     */
    exports.ok = function (m, prefix) {
        console.log(
            OUT_FORMAT,
            fixPrefix(prefix),
            getColor('OK', ['green', 'bold']),
            m
        );
    };
    /**
     * @param {Number} spaces
     * @return {String}
     */
    exports.indent = function (spaces) {
        var ret = '';

        for (var i = 0; i < spaces; i++) {
            ret += ' ';
        }

        return ret;
    };

}(exports));

