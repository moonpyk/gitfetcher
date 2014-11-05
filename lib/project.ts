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
import nu = require('util');

import _ = require("lodash");

import u = require('./util');
import Configuration = require('./configuration');
import o = require("./output");

class Project {
    contextList:string[] = [];
    configuration:any;
    key:string;

    constructor(c, key:string) {
        this.configuration = c;
        this.key = key;

        if (_.isString(c.context)) {
            this.contextList.push(c.context);

        } else if (_.isArray(c.context)) {
            this.contextList = c.context;
        }
    }

    private static asyncCallback(code:number, cb:AsyncSingleResultCallback<any>) {
        if (_.isFunction(cb)) {
            cb(
                code !== 0
                    ? new Error(nu.format("git returned code : %d", code))
                    : null,
                {code: 0}
            );
        }
    }

    cmd(args):spawn.ChildProcess {
        var c = this.configuration;

        var opts = {
            env: process.env,
            cwd: c.rpath
        };

        if (c.print_git_out) {
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

    inContext(ctx:string):boolean {
        if (_.isString(ctx) && !_.isEmpty(ctx)) {
            return _.contains(this.contextList, ctx);
        }

        return true;
    }

    check():boolean {
        var c = this.configuration;

        if (!fs.existsSync(c.rpath)) {
            return false;
        }

        return fs.existsSync(path.join(c.rpath, ".git"));
    }

    printName(cb:AsyncMultipleResultsCallback<any>):void {
        o.info(
            nu.format("Project '%s'...", this.key), o.indent(2)
        );

        Project.asyncCallback(0, cb);
    }

    fetch(cb:AsyncMultipleResultsCallback<any>):void {
        o.info("Fetching...", o.indent(4));

        var args = ['fetch'],
            c = this.configuration;

        if (_.isBoolean(c.fetch_all) && c.fetch_all) {
            args.push('--all');
        }

        if (_.isBoolean(c.fetch_tags) && c.fetch_tags) {
            args.push('--tags');
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(nu.format("Error during fetch (%d).", code), o.indent(5));
            }

            Project.asyncCallback(code, cb);
        });
    }

    pull(cb:AsyncMultipleResultsCallback<any>):void {
        o.info("Pulling...", o.indent(4));

        var args = ['pull'],
            c = this.configuration;

        if (_.isBoolean(c.pull_ff_only) && c.pull_ff_only) {
            args.push('--ff-only');
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(nu.format("Error during pull (%d).", code), o.indent(5));
            }

            Project.asyncCallback(code, cb);
        });
    }

    gc(cb:AsyncSingleResultCallback<any>):void {
        o.info("GC...", o.indent(4));

        var args = ['gc'];

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(
                    nu.format("Error during GC (%d).", code), o.indent(5)
                );
            }

            Project.asyncCallback(code, cb);
        });
    }

    force_gc(cb:AsyncSingleResultCallback<any>):void {
        o.info("Force GC...", o.indent(4));

        var args = ['gc'],
            c = this.configuration;

        if (_.isBoolean(c.force_gc_aggressive) && c.force_gc_aggressive) {
            args.push('--aggressive');
        }

        if (_.isString(c.force_gc_prune) && !_.isEmpty(c.force_gc_prune)) {
            args.push('--prune=' + c.force_gc_prune);
        }

        this.cmd(args).on('exit', (code) => {
            if (code === 0) {
                o.ok("Done.", o.indent(5));
            } else {
                o.error(
                    nu.format("Error during force GC (%d).", code), o.indent(5)
                );
            }

            Project.asyncCallback(code, cb);
        });
    }
}

export = Project;
