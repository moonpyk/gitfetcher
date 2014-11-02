/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Cléthisnt Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>

"use strict";

import spawn = require('child_process');
import fs = require('fs');
import path = require('path');
import _ = require("lodash");
import u = require('./util');
import util = require('util');
import Configuration = require('./configuration');
import o = require("./output");

class Project {
    configuration:any;
    contextList:string[];
    key:string;

    constructor(c, key:string) {
        this.configuration = c;
        this.contextList = [];
        this.key = key;

        if (_.isString(c.context)) {
            this.contextList.push(c.context);
        }
    }

    private static asyncCallback(code, fn) {
        if (_.isFunction(fn)) {
            fn(
                code !== 0 ? new Error() : null,
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

    printName(callback:AsyncMultipleResultsCallback<any>) {
        o.info(
            util.format("Project '%s'...", this.key), o.indent(2)
        );

        callback(null, null);
    }

    fetch(callback:AsyncMultipleResultsCallback<any>) {
        o.info("Fetching...", o.indent(4));

        var args = ['fetch'],
            c = this.configuration;

        if (_.isBoolean(c['fetch_all']) && c['fetch_all']) {
            args.push('--all');
        }

        if (_.isBoolean(c['fetch_tags']) && c['fetch_tags']) {
            args.push('--tags');
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(util.format("Error during fetch (%d).", code), o.indent(5));
            }

            Project.asyncCallback(code, callback);
        });
    }

    pull(callback:AsyncMultipleResultsCallback<any>) {
        o.info("Pulling...", o.indent(4));

        var args = ['pull'],
            c = this.configuration;

        if (_.isBoolean(c['pull_ff_only']) && c['pull_ff_only']) {
            args.push('--ff-only');
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(util.format("Error during pull (%d).", code), o.indent(5));
            }

            Project.asyncCallback(code, callback);
        });
    }

    force_gc(callback:AsyncSingleResultCallback<any>) {
        o.info("Force GC...", o.indent(4));

        var args = ['gc'],
            c = this.configuration;

        if (_.isBoolean(c['force_gc_aggressive']) && c['force_gc_aggressive']) {
            args.push('--aggressive');
        }

        if (_.isString(c['force_gc_prune']) && !_.isEmpty(c['force_gc_prune'])) {
            args.push('--prune=' + c['force_gc_prune']);
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(
                    util.format("Error during force GC (%d).", code), o.indent(5)
                );
            }

            Project.asyncCallback(code, callback);
        });
    }
}

export = Project;
