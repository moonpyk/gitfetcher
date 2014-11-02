/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */
///<reference path="../typings/tsd.d.ts"/>
"use strict";
var fs = require('fs');
var u = require('./util');
var nu = require('util');
var _ = require('lodash');
var o = require('./output');
var os = require('os');
var Configuration = (function () {
    function Configuration() {
        this._raw = "";
        this._projectsFilled = false;
        this.filename = '';
        this.statFilename = '';
        this.content = {};
        this.projects = {};
        this.statContent = {};
    }
    Configuration.open = function (filename) {
        var c = new Configuration();
        if (c._open(filename) === false) {
            return null;
        }
        c.filename = filename;
        c.statFilename = u.replaceFileExtension(filename, '.gfstat');
        c._openStat();
        return c;
    };
    Configuration.prototype._openStat = function () {
        try {
            this._statRaw = fs.readFileSync(this.statFilename, 'utf8');
        }
        catch (ex) {
            this._statRaw = '';
            return false;
        }
        try {
            this.statContent = JSON.parse(this._statRaw);
        }
        catch (ex) {
            this.statContent = {};
            return false;
        }
        return true;
    };
    Configuration.prototype.fillProjects = function () {
        var _this = this;
        if (this._projectsFilled) {
            return this.projects;
        }
        this.content.forEach(function (v, key) {
            if (key === "defaults") {
                return;
            }
            _this.projects[key] = Configuration._makeProject(_this.content[key]);
            if (_.isString(_this.projects[key].path)) {
                _this.projects[key].rpath = u.resolveExpandEnv(_this.projects[key].path);
            }
        });
        this._projectsFilled = true;
        return this.projects;
    };
    Configuration.prototype.save = function (filename) {
        if (!_.isString(filename)) {
            filename = this.filename;
        }
        var jsConfig = JSON.stringify(this.content, null, o.indent(4));
        try {
            fs.writeFileSync(filename, jsConfig.replace(/\n/g, os.EOL) + os.EOL, {
                encoding: 'utf8'
            });
        }
        catch (ex) {
            o.error(nu.format("Unable to save configuration to '%s'", filename));
            return false;
        }
        return true;
    };
    Configuration.prototype.saveStat = function (filename) {
        if (!_.isString(filename)) {
            filename = this.statFilename;
        }
        var jsStat = JSON.stringify(this.statContent);
        try {
            fs.writeFileSync(filename, jsStat.replace(/\n/g, os.EOL) + os.EOL, {
                encoding: 'utf8'
            });
        }
        catch (ex) {
            o.warning(nu.format("Unable to save stat to '%s'", filename));
            return false;
        }
        return true;
    };
    Configuration.getDefaults = function () {
        return _.clone(Configuration.defaults);
    };
    Configuration._makeProject = function (proj) {
        return _.extend(Configuration.getDefaults(), proj);
    };
    Configuration.prototype._open = function (filename) {
        if (!_.isString(filename)) {
            return false;
        }
        if (!fs.existsSync(filename)) {
            return false;
        }
        try {
            this._raw = fs.readFileSync(filename, 'utf8');
        }
        catch (ex) {
            return false;
        }
        try {
            this.content = JSON.parse(this._raw);
        }
        catch (ex) {
            return false;
        }
        // Overriding hard-coded defaults, with configured ones.
        if (_.isObject(this.content.defaults)) {
            _.extend(Configuration.defaults, this.content.defaults);
        }
        else {
            o.warning("No 'defaults' gitfetcher configuration section found. Using application code defined one.");
        }
        return filename;
    };
    Configuration.defaults = {
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
    return Configuration;
})();
module.exports = Configuration;
//# sourceMappingURL=configuration.js.map