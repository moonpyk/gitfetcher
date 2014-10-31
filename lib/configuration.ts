/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>

"use strict";

import fs = require('fs');
import u = require('./util');
import nu = require('util');
import _ = require('lodash');
import o = require('./output');

class Configuration {
    private _raw:string;
    private _projectFilled:boolean;

    filename:string;
    content:any;
    projects:any;

    constructor() {
        this._raw = "";
        this._projectFilled = false;
        this.filename = '';
        this.content = {};
        this.projects = {};
    }

    static defaults = {
        // Application variables
        print_git_out: true,
        exit_on_fail: false,
        readline_on_fail: false,
        readline_on_finish: false,
        // TODO: write_log : false,
        // Project defined
        enabled: true,
        context: null,
        fetch_all: false,
        fetch_tags: false,
        pull: false,
        pull_ff_only: false,
        force_gc: false,
        force_gc_aggressive: false,
        force_gc_prune: null,
        // TODO: gc_interval : 5,
        // TODO: aggressive_gc_interval : 0
        // Have to be overridden by the project
        path: null,
        rpath: null
    };

    static open(filename:string) {
        var c = new Configuration();

        if (c._open(filename) === false) {
            return null;
        }

        c.filename = filename;

        return c;
    }

    get(key:string) : any {
        return this[key];
    }

    fillProjects() {
        if (this._projectFilled) {
            return this;
        }

        _(this.content).each((v, key) => {
            if (key === "defaults") {
                return;
            }

            this.projects[key] = Configuration._makeProject(this.content[key]);

            if (_.isString(this.projects[key].path)) {
                this.projects[key].rpath = u.resolveExpandEnv(
                    this.projects[key].path
                );
            }
        });

        this._projectFilled = true;

        return this;
    }

    save(filename) {
        if (!_.isString(filename)) {
            filename = this.filename;
        }

        var jsConfig = JSON.stringify(this.content, null, o.indent(4));

        try {
            var os = require('os');
            fs.writeFile(filename, jsConfig.replace(/\n/g, os.EOL) + os.EOL, 'utf8');
        } catch (ex) {
            o.error(nu.format("Unable to save configuration to '%s'", filename));
            return false;
        }

        return true;
    }

    static getDefaults() {
        return _.clone(Configuration.defaults);
    }

    private static _makeProject(proj) {
        return _.extend(Configuration.getDefaults(), proj);
    }

    private _open(filename):any {
        if (!_.isString(filename)) {
            return false;
        }

        if (!fs.existsSync(filename)) {
            return false;
        }

        try {
            this._raw = fs.readFileSync(filename, 'utf8');
        } catch (ex) {
            return false;
        }

        try {
            this.content = JSON.parse(this._raw);
        } catch (ex) {
            return false;
        }

        // Overriding hard-coded defaults, with configured ones.
        if (_.isObject(this.content.defaults)) {
            _.extend(Configuration.defaults, this.content.defaults);

        } else {
            o.warning("No 'defaults' gitfetcher configuration section found. Using application code defined one.");
        }

        return filename;
    }
}

export = Configuration;