"use strict";

var spawn = require('child_process'),
    fs = require('fs'),
    path = require('path'),
//
    _ = require("underscore")._,
//
    u = require('./util'),
    o = require("./output"),
    Configuration = require('./configuration');

_.mixin(require('underscore.string'));

var Project = module.exports = (function () {
    var Project = function (c) {
        var me = this;

        me.configuration = c;
        me.contextList = [];

        // Populating contextList
        if (_.isString(c.context)) {
            me.contextList.push(c.context);

        } else if (_.isArray(c.context)) {
            me.contextList = _(c.context).chain().select(function (c) {
                return _.isString(c) && !_.isEmpty(c);
            }).value();
        }

        return this;
    };

    _.extend(Project.prototype, {
        /**
         * @param {Number} code
         * @param {Function} [fn]
         */
        _asyncCallback: function (code, fn) {
            if (_.isFunction(fn)) {
                fn(
                    code !== 0 ? {} : null,
                    {code: 0}
                );
            }
        },
        /**
         * Creates a ChildProcess of a git command in the context of the current project.
         * @param {Object} args
         * @returns {ChildProcess}
         */
        cmd: function (args) {
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
                    cwd: c.rpath
                }
            );

            if (c.print_git_out) {
                s.stdout.setEncoding('utf8');
                s.stdout.on('data', function (d) {
                    console.log(_.trim(d));
                });

                s.stderr.setEncoding('utf8');
                s.stderr.on('data', function (d) {
                    console.error(_.trim(d));
                });
            }

            return s;
        },
        /**
         * Is the current project available in the given context
         * @param {String} ctx
         * @returns {boolean} If ctx is null or empty : true, otherwise returns if
         * the project is in the context
         */
        inContext: function (ctx) {
            if (_.isString(ctx) && !_.isEmpty(ctx)) {
                return _(this.contextList).contains(ctx);
            }

            return true;
        },
        /**
         * Checks that the current project is valid
         * @returns {boolean}
         */
        check: function () {
            var c = this.configuration;

            if (!fs.existsSync(c.rpath)) {
                return false;
            }

            return fs.existsSync(path.join(c.rpath, ".git"));
        },
        /**
         * @param {Function} [callback]
         */
        fetch: function (callback) {
            o.info("Fetching...", o.indent(4));

            var me = this,
                args = ['fetch'],
                c = me.configuration;

            if (_.isBoolean(c.fetch_all) && c.fetch_all) {
                args.push('--all');
            }

            if (_.isBoolean(c.fetch_tags) && c.fetch_tags) {
                args.push('--tags');
            }

            me.cmd(args).on('exit', function (code) {
                if (code === 0) {
                    o.ok("Done.", o.indent(5));
                } else {
                    o.error(u.format("Error during fetch (%d).", code), o.indent(5));
                }

                me._asyncCallback(code, callback);
            });
        },
        /**
         * @param {Function} [callback]
         */
        pull: function (callback) {
            o.info("Pulling...", o.indent(4));

            var me = this,
                args = ['pull'],
                c = me.configuration;

            if (_.isBoolean(c.pull_ff_only) && c.pull_ff_only) {
                args.push('--ff-only');
            }

            me.cmd(args).on('exit', function (code) {
                if (code === 0) {
                    o.ok("Done.", o.indent(5));
                } else {
                    o.error(u.format("Error during pull (%d).", code), o.indent(5));
                }

                me._asyncCallback(code, callback);
            });
        },
        /**
         * @param {Function} [callback]
         */
        force_gc: function (callback) {
            o.info("Force GC...", o.indent(4));

            var me = this,
                args = ['gc'],
                c = me.configuration;

            if (_.isBoolean(c.force_gc_aggressive) && c.force_gc_aggressive) {
                args.push('--aggressive');
            }

            if (_.isString(c.force_gc_prune) && !_.isEmpty(c.force_gc_prune)) {
                args.push('--prune=' + c.force_gc_prune);
            }

            me.cmd(args).on('exit', function (code) {
                if (code === 0) {
                    o.ok("Done.", o.indent(5));
                } else {
                    o.error(u.format("Error during force GC (%d).", code), o.indent(5));
                }

                me._asyncCallback(code, callback);
            });
        }
    });

    return Project;
})();
