"use strict";

var path = require('path'),
    fs = require('fs'),
//
    _ = require('underscore')._,
    async = require('async'),
    program = require('commander'),
//
    u = require('./util'),
    o = require('./output'),
    Configuration = require('./configuration'),
    Project = require("./project");

var confLookup = [
    '~/gitfetcher.json',
    'gitfetcher.json'
];

var pack = require("../package.json");

module.exports = {
    main: function () {
        program
            .version(pack.version)
            .description(pack.description)
            .usage('[options]')
            //.option('-x, --context <context>', 'Run inside context <context>')
            .option('-c, --config  <config>', 'Force use of specific config file <config>')
            .option('-N, --no-color', 'Disable output-coloring even if available')
            .option('-a, --add-project <dir>', 'Add the working copy directory <dir> to the registered projects')
            .parse(process.argv);

        if (program.color === false) {
            o.colorEnabled = false;
        }

        var c = null;

        // If a specific configuration file has been given
        // we reset the default lookups to use only that precise one.
        if (_.isString(program.config)) {
            confLookup = [program.config];
        }

        // Trying each possibile path until found a valid configuration
        _.each(confLookup, function (f) {
            if (c !== null) {
                return;
            }

            f = path.resolve(path.normalize(u.expandUser(f)));

            var parsed = Configuration.open(f);

            if (parsed !== null) {
                c = parsed;
                o.info(u.format("Using configuration file '%s'...", f));
            }
        });

        // Definitely no valid config has been found
        if (c === null) {
            if (confLookup.length == 1) {
                o.error(u.format("Unable to read config file '%s'.", confLookup[0]));
            } else {
                o.error("No config file found, aborting.");
            }
            process.exit(78);
            return;
        }

        // User asked to add a new project to the active config.
        if (_.isString(program.addProject)) {
            this.addProject(program, c);
            return; // This will be the only thing we are gonna do
        }

        if (!Configuration.cached_git_valid) {
            process.exit(78);
            return;
        }

        // Valid config fount, filling the projects configurations.
        c.fillProjects();

        var projectsTasks = [];

        // For each projects, we create of list of tasks, depending
        // on each project configuration. Each project is a task of tasks.
        _.each(c.projects, function (conf, key) {
            if (!conf.enabled) {
                return;
            }

            var p = new Project(conf);

            if (!p.check()) {
                o.warning(
                    u.format("Project '%s' is now invalid, please check your configuration.", key),
                    o.indent(2)
                );

                return;
            }

            // Project is enabled, populating the project tasks...
            projectsTasks.push(function (callback) {
                var tasks = [];

                o.info(u.format("Project '%s'...", key), o.indent(2));

                tasks.push(p.fetch.bind(p));

                if (conf.pull) {
                    tasks.push(p.pull.bind(p));
                }

                if (conf.force_gc) {
                    tasks.push(p.force_gc.bind(p));
                }

                // When done with one project, continue to next
                async.series(tasks, function () {
                    callback(null, key);
                });
            });
        });

        // Running all projects, in series
        async.series(projectsTasks);
    },
    /**
     * Logic for adding a new project to a given configuration
     * @param {Command} p
     * @param {Configuration} c
     */
    addProject: function (p, c) {
        var projectDir = p.addProject;

        projectDir = path.resolve(path.normalize(projectDir));

        var projectName = path.basename(projectDir);

        if (projectName === "defaults") {
            o.error("Project name 'defaults' is not valid");
            //return false;
        }

        // Looking for a .git directory inside the working copy
        fs.exists(path.join(projectDir, '.git'), function (exists) {
            if (exists) {
                c.content[projectName] = {
                    path: projectDir
                };

                if (c.save()) {
                    o.ok(u.format("Project '%s' saved to configuration file '%s", projectName, c.filename));
                }
            } else {
                o.error(u.format("Directory '%s' doesn't appears to be a valid git project working copy", projectDir));
            }
        });
    }
};
