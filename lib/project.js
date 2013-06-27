"use strict";

var spawn = require('child_process'),
    fs = require('fs'),
//
    _ = require("underscore")._,
//
    u = require('./util'),
    o = require("./output");

var Project = module.exports = (function () {
    var Project = function (configuration) {
        this.configuration = configuration;
        return this;
    };

    _.extend(Project.prototype, {
        /**
         * @param {Object} args
         * @returns {ChildProcess}
         * @private
         */
        _cmd: function (args) {
            var c = this.configuration;

            if (!_.isString(c.git_bin)) {
                o.error("git_bin variable is not set");
                process.exit(1);
                return null;
            }

            if (!fs.existsSync(c.git_bin)) {
                o.error("Configured git_bin executable doesn't exists");
                process.exit(1);
                return null;
            }

            var s = spawn.spawn(
                c.git_bin,
                args, {
                    env: process.env,
                    cwd: c.path
                }
            );

            if (c.print_git_out) {
                s.stdout.setEncoding('utf8');
                s.stdout.on('data', function (d) {
                    console.log(d);
                });

                s.stderr.setEncoding('utf8');
                s.stderr.on('data', function (d) {
                    console.error(d);
                });
            }

            return s;
        },
        /**
         * @param {Function} [callback]
         */
        fetch: function (callback) {
            o.info("Fetching...", o.indent(4));
            var args = [
                'fetch'
            ];

            if (_.isBoolean(this.configuration.fetch_all) &&
                this.configuration.fetch_all) {
                args.push('--all');
            }

            if (_.isBoolean(this.configuration.fetch_tags) &&
                this.configuration.fetch_tags) {
                args.push('--tags');
            }

            var cmd = this._cmd(
                args
            );

            cmd.on('exit', function (code) {
                var err = null;
                if (code === 0) {
                    o.ok("Done.", o.indent(5));
                } else {
                    err = {};
                    o.error(u.format("Error during fetch (%d).", code), o.indent(5));
                }

                if (_.isFunction(callback)) {
                    callback(err, code);
                }
            });
        },
        /**
         * @param {Function} [callback]
         */
        pull: function (callback) {
            o.info("Pulling...", o.indent(4));

            var args = ['pull'];

            if (_.isBoolean(this.configuration.pull_ff_only) &&
                this.configuration.pull_ff_only) {
                args.push('--ff-only');
            }

            var cmd = this._cmd(
                args
            );

            cmd.on('exit', function (code) {
                var err = null;
                if (code === 0) {
                    o.ok("Done.", o.indent(5));
                } else {
                    err = {};
                    o.error(u.format("Error during pull (%d).", code), o.indent(5));
                }

                if (_.isFunction(callback)) {
                    callback(err, code);
                }
            });
        },
        /**
         * @param {Function} [callback]
         */
        force_gc: function (callback) {
            var args = ['gc'];

            var cmd = this._cmd(
                args
            );

            if (_.isBoolean(this.configuration.pull_ff_only) &&
                this.configuration.pull_ff_only) {
                //args.push()
            }

            cmd.on('exit', function (code) {
                if (_.isFunction(callback)) {
                    callback(null, code);
                }
            });
        }
    });

    return Project;
})();
