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
import path = require('path');
import os = require('os');

interface ProjectConfiguration {

}

class Configuration {
    private _raw:string;
    private _statRaw:string;

    private _projectsFilled:boolean;

    filename:string;
    statFilename:string;
    content:any;
    statContent:any;
    private _projects:{ [id: string] : any; };

    constructor() {
        this._raw = "";
        this._projectsFilled = false;
        this._projects = {};

        this.filename = '';
        this.statFilename = '';
        this.content = {};
        this.statContent = {};
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
        c.statFilename = u.replaceFileExtension(filename, '.gfstat');

        c._openStat();

        return c;
    }

    private _openStat():boolean {
        try {
            this._statRaw = fs.readFileSync(this.statFilename, 'utf8');
        } catch (ex) {
            this._statRaw = '';
            return false;
        }

        try {
            this.statContent = JSON.parse(this._statRaw);
        } catch (ex) {
            this.statContent = {};
            return false;
        }

        return true;
    }

    projects() {
        if (this._projectsFilled) {
            return this._projects;
        }

        _.each(this.content, (v, key) => {
            if (key === "defaults") {
                return;
            }

            this._projects[key] = Configuration._makeProject(this.content[key]);

            if (_.isString(this._projects[key].path)) {
                this._projects[key].rpath = u.resolveExpandEnv(
                    this._projects[key].path
                );
            }
        });

        this._projectsFilled = true;

        return this._projects;
    }

    save(filename?):boolean {
        if (!_.isString(filename)) {
            filename = this.filename;
        }

        var jsConfig = JSON.stringify(this.content, null, o.indent(4));

        try {
            fs.writeFileSync(filename, jsConfig.replace(/\n/g, os.EOL) + os.EOL, {
                encoding: 'utf8'
            });

        } catch (ex) {
            o.error(nu.format("Unable to save configuration to '%s'", filename));
            return false;
        }

        return true;
    }

    saveStat(filename?):boolean {
        if (!_.isString(filename)) {
            filename = this.statFilename;
        }

        var jsStat = JSON.stringify(this.statContent);

        try {
            fs.writeFileSync(filename, jsStat.replace(/\n/g, os.EOL) + os.EOL, {
                encoding: 'utf8'
            });

        } catch (ex) {
            o.warning(nu.format("Unable to save stat to '%s'", filename));
            return false;
        }

        return true;
    }

    statFor(pKey:string) : any {
        this.statContent = this.statContent || {};
        this.statContent[pKey] = this.statContent[pKey] || {};

        return this.statContent[pKey];
    }

    fetchGet(pKey:string) : number {
        var stat = this.statFor(pKey);

        return stat['fetch'] || 0;
    }

    fetchIncrement(pKey:string) {
        var ic = this.fetchGet(pKey);

        this.statContent[pKey]['fetch'] = ic + 1;
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
