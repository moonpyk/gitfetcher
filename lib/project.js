/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Cléthisnt Bourgeois
 * Licensed under the MIT license.
 */
///<reference path="../typings/tsd.d.ts"/>
"use strict";
var spawn = require('child_process');
var fs = require('fs');
var path = require('path');
var _ = require("lodash");
var util = require('util');
var o = require("./output");
var Project = (function () {
    function Project(c, key) {
        this.configuration = c;
        this.contextList = [];
        this.key = key;
        if (_.isString(c.context)) {
            this.contextList.push(c.context);
        }
    }
    Project.asyncCallback = function (code, fn) {
        if (_.isFunction(fn)) {
            fn(code !== 0 ? new Error() : null, { code: 0 });
        }
    };
    Project.prototype.cmd = function (args) {
        var c = this.configuration;
        var opts = {
            env: process.env,
            cwd: c['rpath']
        };
        if (c['print_git_out']) {
            _.extend(opts, {
                stdio: ['ignore', process.stdout, process.stderr]
            });
        }
        var gitBin = 'git';
        if (process.platform == "win32") {
            gitBin = 'git.exe';
        }
        return spawn.spawn(gitBin, args, opts);
    };
    Project.prototype.inContext = function (ctx) {
        if (_.isString(ctx) && !_.isEmpty(ctx)) {
            return _.contains(this.contextList, ctx);
        }
        return true;
    };
    Project.prototype.check = function () {
        var c = this.configuration;
        if (!fs.existsSync(c['rpath'])) {
            return false;
        }
        return fs.existsSync(path.join(c['rpath'], ".git"));
    };
    Project.prototype.printName = function (callback) {
        o.info(util.format("Project '%s'...", this.key), o.indent(2));
        callback(null, null);
    };
    Project.prototype.fetch = function (callback) {
        o.info("Fetching...", o.indent(4));
        var args = ['fetch'], c = this.configuration;
        if (_.isBoolean(c['fetch_all']) && c['fetch_all']) {
            args.push('--all');
        }
        if (_.isBoolean(c['fetch_tags']) && c['fetch_tags']) {
            args.push('--tags');
        }
        this.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            }
            else {
                o.error(util.format("Error during fetch (%d).", code), o.indent(5));
            }
            Project.asyncCallback(code, callback);
        });
    };
    Project.prototype.pull = function (callback) {
        o.info("Pulling...", o.indent(4));
        var args = ['pull'], c = this.configuration;
        if (_.isBoolean(c['pull_ff_only']) && c['pull_ff_only']) {
            args.push('--ff-only');
        }
        this.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            }
            else {
                o.error(util.format("Error during pull (%d).", code), o.indent(5));
            }
            Project.asyncCallback(code, callback);
        });
    };
    Project.prototype.force_gc = function (callback) {
        o.info("Force GC...", o.indent(4));
        var args = ['gc'], c = this.configuration;
        if (_.isBoolean(c['force_gc_aggressive']) && c['force_gc_aggressive']) {
            args.push('--aggressive');
        }
        if (_.isString(c['force_gc_prune']) && !_.isEmpty(c['force_gc_prune'])) {
            args.push('--prune=' + c['force_gc_prune']);
        }
        this.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            }
            else {
                o.error(util.format("Error during force GC (%d).", code), o.indent(5));
            }
            Project.asyncCallback(code, callback);
        });
    };
    return Project;
})();
module.exports = Project;
//# sourceMappingURL=project.js.map