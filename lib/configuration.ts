/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2014 Clément Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>

"use strict";

import fs = require('fs');
import path = require('path');
import os = require('os');
import nu = require('util');

import _ = require('lodash');

import o = require('./output');
import u = require('./util');

export interface IProjectConfiguration {
    enabled: boolean;
    print_git_out: boolean;
    context: any;
    fetch_all: boolean;
    fetch_tags: boolean;
    pull: boolean;
    pull_ff_only: boolean;
    force_gc: boolean;
    force_gc_aggressive: boolean;
    force_gc_prune: boolean;
    gc_interval: number;
    // TODO: aggressive_gc_interval : 0
    // Have to be overridden by the project
    path: string;
    rpath: string;
}

export interface IApplicationConfiguration extends IProjectConfiguration {
    exit_on_fail: boolean;
    readline_on_fail: boolean;
    readline_on_finish: boolean;
    default_context: string;
}

export class Configuration {
    private _raw:string = '';
    private _statRaw:string;
    private _projects:{ [id: string] : any; } = {};
    private _projectsFilled:boolean = false;

    filename:string = '';
    statFilename:string = '';
    content:any = {};
    statContent:any = {};

    static defaults:IApplicationConfiguration = {
        // Application variables
        print_git_out: true,
        exit_on_fail: false,
        readline_on_fail: false,
        readline_on_finish: false,
        default_context: null,
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
        gc_interval: 5,
        // TODO: aggressive_gc_interval : 0
        // Have to be overridden by the project
        path: null,
        rpath: null
    };

    static open(filename:string):Configuration {
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

    projects():{[key:string] : IProjectConfiguration} {
        if (this._projectsFilled) {
            return this._projects;
        }

        _.each(this.content, (v, key) => {
            if (key === "defaults") {
                return;
            }

            this._projects[key] = Configuration.makeProject(this.content[key]);

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

        var rawConfig = Configuration.niceJSON(this.content);

        try {
            fs.writeFileSync(filename, Configuration.fixLineEndings(rawConfig), {
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
            fs.writeFileSync(filename, Configuration.fixLineEndings(jsStat), {
                encoding: 'utf8'
            });

        } catch (ex) {
            o.warning(nu.format("Unable to save stat to '%s'", filename));
            return false;
        }

        return true;
    }

    statFor(pKey:string):any {
        this.statContent = this.statContent || {};
        this.statContent[pKey] = this.statContent[pKey] || {};

        return this.statContent[pKey];
    }

    fetchGet(pKey:string):number {
        var stat = this.statFor(pKey);

        return stat['fetch'] || 0;
    }

    fetchIncrement(pKey:string):number {
        var ic = this.fetchGet(pKey);

        this.statContent[pKey]['fetch'] = ic + 1;
        return this.statContent[pKey];
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

    static initConfig(filename:string, confLookup:string[]) {
        if (_.isEmpty(filename)) {
            if (process.platform == 'win32') {
                filename = confLookup[1];
            } else {
                filename = confLookup[0];
            }
        }

        var realPath = u.resolveExpandEnv(filename);

        if (fs.existsSync(realPath)) {
            o.error(nu.format("'%s' configuration file already exists", realPath));
            return false;
        }

        var futureConf:Object = {
            defaults: _.clone(Configuration.defaults)
        };

        for (var k in {'context': 0, 'path': 0, 'rpath': 0}) {
            if (futureConf.hasOwnProperty(k)) {
                delete futureConf['defaults'][k];
            }
        }

        var confString = Configuration.niceJSON(futureConf);

        try {
            fs.writeFileSync(realPath, Configuration.fixLineEndings(confString), {
                encoding: 'utf8'
            });
        } catch (err) {
            o.error(nu.format("Unable to write to write new configuration file at '%s'", realPath));
            return false;
        }

        o.ok(nu.format("New gitfetcher configuration file created at '%s'", realPath));
        return true;
    }

    static getDefaults():IApplicationConfiguration {
        return _.clone(Configuration.defaults);
    }

    private static makeProject(proj:any):IProjectConfiguration {
        return _.extend<any, any, any, any, IProjectConfiguration>(
            Configuration.getDefaults(),
            proj
        );
    }

    private static fixLineEndings(text:string):string {
        return os.EOL === '\n'
            ? text + os.EOL
            : text.replace(/\n/g, os.EOL) + os.EOL;
    }

    private static niceJSON(obj:any) {
        return JSON.stringify(obj, null, o.indent(4));
    }
}
