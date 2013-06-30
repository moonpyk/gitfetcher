/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

(function (exports) {
    "use strict";

    var fs = require('fs'),
//
        _ = require('underscore')._,
//
        o = require('./output.js'),
        u = require('./util.js');

    exports.Configuration = (function () {
        var Configuration = function () {
            this._raw = "";
            this._projectFilled = false;
            this.filename = "";
            this.content = {};
            this.projects = {};
            return this;
        };

        _.extend(Configuration, {
            ERR_MSG_INVALID_GIT: "Configured git_bin executable doesn't exists.",
            //
            cached_git_valid: false,
            cached_git_path: '',
            // Configuration defaults
            defaults: {
                // Application variables
                print_git_out: true,
                exit_on_fail: false,
                readline_on_fail: false,
                readline_on_finish: false,
                // TODO: write_log : false,
                // Project defined
                git_bin: '/usr/bin/git',
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
            },
            /**
             * Check that a given path exists.
             * Used to check that git is really where it is configured.
             * @param {String} path
             * @param {boolean} [print]
             * @returns {boolean}
             */
            checkGitBin: function (path, print) {
                if (!_.isBoolean(print)) {
                    print = true;
                }
                if (!_.isString(path)) {
                    if (print) {
                        o.error("git_bin variable is not set.");
                    }
                    return false;
                }

                if (!fs.existsSync(path)) {
                    if (print) {
                        o.error(Configuration.ERR_MSG_INVALID_GIT);
                    }
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
                Configuration.cached_git_valid = Configuration.checkGitBin(
                    Configuration.cached_git_path,
                    false
                );

                return ret;
            }
        });

        _.extend(Configuration.prototype, {
            /**
             * @returns {Configuration}
             */
            fillProjects: function () {
                var me = this;

                if (me._projectFilled) {
                    return me;
                }

                _(me.content).each(function (v, key) {
                    if (key === "defaults") {
                        return;
                    }

                    me.projects[key] = me._makeProject(me.content[key]);

                    if (_.isString(me.projects[key].path)) {
                        me.projects[key].rpath = u.resolveExpandUser(me.projects[key].path);
                    }
                });

                me._projectFilled = true;

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
             * Gets the default configuration for a project, merging application defaults
             * with "defaults" section of the configuration file.
             * @returns {Object}
             */
            getDefaults: function () {
                var r = {};

                _(Configuration.defaults).each(function (v, key) {
                    r[key] = Configuration.defaults[key];
                });

                return r;
            },
            /**
             * Merges the defaults with the project configuration to have a complete
             * usable project config.
             * @param {Object} proj
             * @returns {Object}
             */
            _makeProject: function (proj) {
                return _.extend(this.getDefaults(), proj);
            },
            /**
             * @param {String} filename
             * @returns {Configuration|boolean}
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
            }
        });

        return Configuration;
    })();

}(exports));
