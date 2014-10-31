/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>

"use strict";

import spawn = require('child_process');
import fs = require('fs');
import path = require('path');
import _ = require("lodash");
import u = require('./util');
import nu = require('util');
import Configuration = require('./configuration');

var o = require("./output.js");

class Project {
    configuration:Configuration;
    contextList:string[];

    constructor(c) {
        this.configuration = c;
        this.contextList = [];

        if (_.isString(c.context)) {
            this.contextList.push(c.context);
        }
    }

    private _asyncCallback(code, fn) {
        if (_.isFunction(fn)) {
            fn(
                code !== 0 ? {} : null,
                {code: 0}
            );
        }
    }

    cmd(args) {
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

        return spawn.spawn(
            gitBin,
            args,
            opts
        );
    }

    inContext(ctx) {
        if (_.isString(ctx) && !_.isEmpty(ctx)) {
            return _.contains(this.contextList, ctx);
        }

        return true;
    }

    check() {
        var c = this.configuration;

        if (!fs.existsSync(c['rpath'])) {
            return false;
        }

        return fs.existsSync(path.join(c['rpath'], ".git"));
    }

    fetch(callback) {
        o.info("Fetching...", o.indent(4));

        var me = this,
            args = ['fetch'],
            c = me.configuration;

        if (_.isBoolean(c['fetch_all']) && c['fetch_all']) {
            args.push('--all');
        }

        if (_.isBoolean(c['fetch_tags']) && c['fetch_tags']) {
            args.push('--tags');
        }

        me.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(nu.format("Error during fetch (%d).", code), o.indent(5));
            }

            me._asyncCallback(code, callback);
        });
    }
    pull(callback) {
        o.info("Pulling...", o.indent(4));

        var me = this,
            args = ['pull'],
            c = me.configuration;

        if (_.isBoolean(c['pull_ff_only']) && c['pull_ff_only']) {
            args.push('--ff-only');
        }

        me.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(nu.format("Error during pull (%d).", code), o.indent(5));
            }

            me._asyncCallback(code, callback);
        });
    }
    force_gc(callback) {
        o.info("Force GC...", o.indent(4));

        var me = this,
            args = ['gc'],
            c = me.configuration;

        if (_.isBoolean(c['force_gc_aggressive']) && c['force_gc_aggressive']) {
            args.push('--aggressive');
        }

        if (_.isString(c['force_gc_prune']) && !_.isEmpty(c['force_gc_prune'])) {
            args.push('--prune=' + c['force_gc_prune']);
        }

        me.cmd(args).on('exit', function (code) {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(nu.format("Error during force GC (%d).", code), o.indent(5));
            }

            me._asyncCallback(code, callback);
        });
    }
}

export = Project;