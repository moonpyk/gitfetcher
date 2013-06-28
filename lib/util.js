"use strict";

var _ = require('underscore')._,
    os = require('os');

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
     * @param {*} val
     * @returns {Boolean}
     */
    get_bool: function (val) {
        if (_.isBoolean(val)) {
            return val;
        }

        if (_.isInteger(val)) {
            return val == 1;
        }

        if (_.isString(val)) {
            return _.contains(
                ["yes", "true", "t", "on", "1"],
                val.toLowerCase()
            );
        }

        return false;
    }
});
