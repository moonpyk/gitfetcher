"use strict";
var fs = require('fs');
var u = require('./util');
var nu = require('util');
var _ = require('lodash');
var o = require('./output');

var Configuration = (function () {
    function Configuration() {
        this._raw = "";
        this._projectFilled = false;
        this.filename = '';
        this.content = {};
        this.projects = {};
    }
    Configuration.open = function (filename) {
        var c = new Configuration();

        if (c._open(filename) === false) {
            return null;
        }

        c.filename = filename;

        return c;
    };

    Configuration.prototype.get = function (key) {
        return this[key];
    };

    Configuration.prototype.fillProjects = function () {
        var _this = this;
        if (this._projectFilled) {
            return this;
        }

        _(this.content).each(function (v, key) {
            if (key === "defaults") {
                return;
            }

            _this.projects[key] = Configuration._makeProject(_this.content[key]);

            if (_.isString(_this.projects[key].path)) {
                _this.projects[key].rpath = u.resolveExpandEnv(_this.projects[key].path);
            }
        });

        this._projectFilled = true;

        return this;
    };

    Configuration.prototype.save = function (filename) {
        if (!_.isString(filename)) {
            filename = this.filename;
        }

        var jsConfig = JSON.stringify(this.content, null, o.indent(4));

        try  {
            var os = require('os');
            fs.writeFile(filename, jsConfig.replace(/\n/g, os.EOL) + os.EOL, 'utf8');
        } catch (ex) {
            o.error(nu.format("Unable to save configuration to '%s'", filename));
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

        try  {
            this._raw = fs.readFileSync(filename, 'utf8');
        } catch (ex) {
            return false;
        }

        try  {
            this.content = JSON.parse(this._raw);
        } catch (ex) {
            return false;
        }

        if (_.isObject(this.content.defaults)) {
            _.extend(Configuration.defaults, this.content.defaults);
        } else {
            o.warning("No 'defaults' gitfetcher configuration section found. Using application code defined one.");
        }

        return filename;
    };
    Configuration.defaults = {
        print_git_out: true,
        exit_on_fail: false,
        readline_on_fail: false,
        readline_on_finish: false,
        enabled: true,
        context: null,
        fetch_all: false,
        fetch_tags: false,
        pull: false,
        pull_ff_only: false,
        force_gc: false,
        force_gc_aggressive: false,
        force_gc_prune: null,
        path: null,
        rpath: null
    };
    return Configuration;
})();

module.exports = Configuration;
//# sourceMappingURL=configuration.js.map
