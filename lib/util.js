"use strict";

var _ = require('underscore')._,
    os = require('os'),
    path = require('path');

module.exports = _.extend(require('util'), {
    /**
     * Simple readline
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
    expandUser: function (val) {
        if (!_.isString(val)) {
            return val;
        }

        if (os.platform() === "win32") {
            val = val.replace("~", "${USERPROFILE}");

        } else {
            val = val.replace("~", "${HOME}");

        }

        _.each(process.env, function (i, key) {
            val = val.replace('${' + key + '}', process.env[key]);
        });

        return val;
    },
    /**
     * @param {String} f
     * @returns {String}
     */
    rnExpandUser: function (f) {
        return path.resolve(
            path.normalize(
                this.expandUser(f)
            )
        );
    }
});
