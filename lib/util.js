/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

(function (exports) {
    "use strict";

    var _ = require('underscore')._,
        path = require('path');

    _.extend(exports, require('util'), {
        /**
         * Simple prompt
         * @param {Function} [cb]
         * @returns {*}
         */
        prompt: function (cb) {
            return process.stdin.on('data',function (data) {
                if (_.isFunction(cb)) {
                    cb(data);
                }
            }).resume();
        },
        /**
         * @param {String} val
         * @returns {String}
         */
        expandEnv: function (val) {
            if (!_.isString(val)) {
                return val;
            }

            if (process.platform === "win32") {
                val = val.replace("~", "${USERPROFILE}");

            } else {
                val = val.replace("~", "${HOME}");

            }
            _(process.env).each(function (v, key) {
                val = val.replace('${' + key + '}', process.env[key]);
            });

            val = val.replace(/\$\{\w*\}/g, "");

            return val;
        },
        /**
         * @param {String} f
         * @returns {String}
         */
        resolveExpandEnv: function (f) {
            return path.resolve(
                path.normalize(this.expandEnv(f))
            );
        }
    });
}(exports));
