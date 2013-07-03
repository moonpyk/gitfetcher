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
        _ = require('lodash'),
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
            // Configuration defaults
            defaults: {
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
                        me.projects[key].rpath = u.resolveExpandEnv(me.projects[key].path);
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
                    var os = require('os');
                    fs.writeFile(filename, jsConfig.replace(/\n/g, os.EOL) + os.EOL, 'utf8');
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
                return _.clone(Configuration.defaults);
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
