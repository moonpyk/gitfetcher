/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>
import path = require('path');
import _ = require('lodash');

exports = _.extend(exports, require('util'), {
    /**
     * Simple prompt
     * @param {Function} [cb]
     * @returns {*}
     */
    prompt: function (cb : Function) {
        return process.stdin.on('data', function (data) {
            if (_.isFunction(cb)) {
                cb(data);
            }
        }).resume();
    },
    /**
     * @param {String} val
     * @returns {String}
     */
    expandEnv: function (val : any) {
        if (!_.isString(val)) {
            return val;
        }

        if (process.platform === "win32") {
            val = val.replace("~", "${USERPROFILE}");

        } else {
            val = val.replace("~", "${HOME}");

        }
        _(process.env).each(function (v, key) {
            val = val.replace(
                new RegExp('\\$\\{' + key + '\\}', "g"),
                process.env[key]
            );
        });

        val = val.replace(/\$\{\w*\}/g, "");

        return val;
    },
    /**
     * @param {String} f
     * @returns {String}
     */
    resolveExpandEnv: function (f : string) {
        return path.resolve(
            path.normalize(this.expandEnv(f))
        );
    },
    /**
     * @param {String} path
     * @param {*} value
     */
    dotNotationToObject: function (path : string, value : any) {
        var ret = {};

        if (_.isString(path)) {
            var next = ret;

            var splt = _(path.split('.')).select(function (v) {
                return !_.isEmpty(v);
            }).value();

            if (splt.length === 0) {
                return value;
            }

            _(splt).each(function (v, k) {
                next = next[v] = ( splt.length - 1 === k)
                    ? value
                    : {};
            });
        }

        return ret;
    },
    /**
     * @param {String} val
     * @return {*}
     */
    inferString: function (val) {
        if (_.isString(val)) {
            var asInt = parseInt(val, 0),
                asFloat = parseFloat(val);

            if (_.isNumber(asFloat) && !_.isNaN(asFloat)) {
                return asFloat;
            }

            if (_.isNumber(asInt) && !_.isNaN(asInt)) {
                return asInt;
            }

            switch (val) {
                case "true":
                case "yes":
                    return true;

                case "false":
                case "no":
                    return false;

                case "undefined":
                    return undefined;

                case "null":
                    return null;
            }

            return val;
        }

        return val;
    }
});
