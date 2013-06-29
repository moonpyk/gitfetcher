"use strict";

var spawn = require('child_process'),
    fs = require('fs'),
    path = require('path'),
//
    _ = require("underscore")._,
    _s = require('underscore.string'),
//
    u = require('./util'),
    o = require("./output"),
    Configuration = require('./configuration');

var Project = module.exports = (function () {
    var Project = function (c) {
        this.configuration = c;
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

            // User overrided the git path for one of his projects
            // for some reason. When must check again path validity.
            if (c.git_bin !== Configuration.cached_git_path) {
                if (!Project.checkGitBin(c.git_bin)) {
                    process.exit(78);
                    return null;
                }
            }

            var s = spawn.spawn(
                c.git_bin,
                args, {
                    env: process.env,
                    cwd: u.rnExpandUser(c.path)
                }
            );

            if (c.print_git_out) {
                s.stdout.setEncoding('utf8');
                s.stdout.on('data', function (d) {
                    console.log(_s.trim(d));
                });

                s.stderr.setEncoding('utf8');
                s.stderr.on('data', function (d) {
                    console.error(_s.trim(d));
                });
            }

            return s;
        },
        /**
         * Checks that the current project is valid
         * @returns {boolean}
         */
        check: function () {
            var c = this.configuration;

            if (!fs.existsSync(c.path)) {
                return false;
            }

            return fs.existsSync(path.join(c.path, ".git"));
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
            o.info("Force GC...", o.indent(4));

            var args = ['gc'],
                c = this.configuration;

            if (_.isBoolean(c.force_gc_aggressive) &&
                c.force_gc_aggressive) {
                args.push('--aggressive');
            }

            if (_.isString(c.force_gc_prune) &&
                c.force_gc_prune !== '') {
                args.push('--prune=' + c.force_gc_prune);
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
                    o.error(u.format("Error during force GC (%d).", code), o.indent(5));
                }

                if (_.isFunction(callback)) {
                    callback(err, code);
                }
            });
        }
    });

    return Project;
})();
