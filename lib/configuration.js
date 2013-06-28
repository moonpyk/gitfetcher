"use strict";

var fs = require('fs'),
//
    _ = require('underscore')._,
//
    o = require('./output'),
    u = require('./util');

var Configuration = module.exports = (function () {

    var Configuration = function () {
        this._raw = "";
        this.filename = "";
        this.content = {};
        this.projects = {};
        return this;
    };

    _.extend(Configuration, {
        cached_git_valid: false,
        cached_git_path: '',
        defaults: {
            git_bin: '/usr/bin/git',
            print_git_out: true,
            // TODO: exit_on_fail: false,
            // TODO: readline_on_fail: false,
            // TODO: readline_on_finish: false,
            // TODO: write_log : false,
            enabled: true,
            // TODO: context: null,
            fetch_all: false,
            fetch_tags: false,
            pull: false,
            pull_ff_only: false,
            force_gc: false,
            force_gc_aggressive: false
            // TODO: gc_interval : 5,
            // TODO: aggressive_gc_interval : 0
        },
        /**
         * Check that a given path exists.
         * Used to check that git is really where it is configured.
         * @param  {String} path
         * @returns {boolean}
         */
        checkGitBin: function (path) {
            if (!_.isString(path)) {
                o.error("git_bin variable is not set.");
                return false;
            }

            if (!fs.existsSync(path)) {
                o.error("Configured git_bin executable doesn't exists.");
                return false;
            }

            return true;
        },
        /**
         * @param filename
         * @returns {Configuration}
         * @static
         */
        open: function (filename) {
            var c = new Configuration();

            var ret = c._open(filename);

            if (ret === false) {
                return null;
            }

            Configuration.filename = ret.filename = filename;

            Configuration.cached_git_path = Configuration.defaults.git_bin;
            Configuration.cached_git_valid = Configuration.checkGitBin(Configuration.cached_git_path);

            return ret;
        }
    });

    _.extend(Configuration.prototype, {
        /**
         * @param filename
         * @returns {Configuration|boolean}
         * @private
         */
        _open: function (filename) {
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

            return this;
        },
        /**
         * @returns {Configuration}
         */
        fillProjects: function () {
            var me = this;

            _.each(me.content, function (idx, key) {
                if (key === "defaults") {
                    return;
                }

                me.projects[key] = me._makeProject(me.content[key]);
            });

            return me;
        },
        /**
         * @param {String} [filename]
         * @returns {boolean}
         */
        save: function (filename) {
            if (!_.isString(filename)) {
                filename = this.filename;
            }

            var jsConfig = JSON.stringify(this.content, null, o.indent(4));

            try {
                fs.writeFile(filename, jsConfig + require('os').EOL, 'utf8');
            } catch (ex) {
                o.error(u.format("Unable to save configuration to '%s'", filename));
                return false;
            }

            return true;
        },
        /**
         * Merges the defaults with the project configuration to have a complete
         * usable project config.
         * @param proj
         * @returns {Object}
         * @private
         */
        _makeProject: function (proj) {
            return _.extend(this.getDefaults(), proj);
        },
        /**
         * Gets the default configuration for a project, merging application defaults
         * with "defaults" section of the configuration file.
         * @returns {Object}
         */
        getDefaults: function () {
            var r = {};

            _.each(Configuration.defaults, function (idx, key) {
                r[key] = Configuration.defaults[key];
            });

            return r;
        }
    });


    return Configuration;
})();
