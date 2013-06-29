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
    '~/.gitfetcher.json',
    '~/gitfetcher.json',
    'gitfetcher.json'
];

var pack = require("../package.json"),
    exit_on_fail = false,
    readline_on_fail = false,
    readline_on_finish = false;

/**
 * @param {Number} [code]
 */
process.fail = function (code) {
    if (!_.isNumber(code)) {
        code = 1;
    }

    if (readline_on_fail) {
        console.log("Error encountered, press any key to finish...");
        u.prompt(function () {
            process.exit(code);
        });
        return;
    }

    process.exit(code);
};

module.exports = {
    main: function (argv) {
        program
            .version(pack.version)
            .usage('[options] [project-name...]')
            //.option('-x, --context <context>', 'Run inside context <context>')
            .option('-c, --config  <config>', 'Force use of specific config file <config>')
            .option('-N, --no-color', 'Disable output-coloring even if available')
            .option('-a, --add-project <dir>', 'Add the working copy directory <dir> to the registered projects')
            .option('-l, --list-projects', 'List available projects in config')
            .parse(argv);

        if (program.color === false) {
            o.colorEnabled = false;
        }

        var c = null;

        // If a specific configuration file has been given
        // we reset the default lookups to use only that precise one.
        if (_.isString(program.config)) {
            confLookup = [program.config];
        }

        // Trying each possible path until found a valid configuration
        _(confLookup).each(function (f) {
            if (c !== null) {
                return;
            }

            var parsed = Configuration.open(
                u.resolveExpandUser(f)
            );

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
            process.fail(78);
            return;
        }

        // User asked to add a new project to the active config.
        if (_.isString(program.addProject)) {
            this.addProject(program, c);
            return; // This will be the only thing we are gonna do
        }

        if (program.listProjects) {
            c.fillProjects();
            console.log("Available projects :");
            _(c.projects).each(function (p, key) {
                console.log(u.format(
                    " - %s (%s)",
                    key,
                    u.inspect(c.content[key], false, undefined, true)
                ));
            });
            return;
        }

        exit_on_fail = Configuration.defaults.exit_on_fail;
        readline_on_fail = Configuration.defaults.readline_on_fail;
        readline_on_finish = Configuration.defaults.readline_on_finish;

        if (!Configuration.cached_git_valid) {
            process.fail(78);
            return;
        }

        // Valid config found, filling the projects configurations.
        c.fillProjects();

        var projectsTasks = [],
            projectMode = _.isArray(program.args) && program.args.length > 0;

        // For each projects, we create of list of tasks, depending
        // on each project configuration. Each project is a task of tasks.
        _(c.projects).each(function (conf, key) {
            if (projectMode && !_(program.args).contains(key)) {
                return;
            }

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

        if (readline_on_finish) {
            console.log("Press any key to finish...");

            u.prompt(function () {
                process.exit(0);
            });
        }
    },
    /**
     * Logic for adding a new project to a given configuration
     * @param {Command} p
     * @param {Configuration} c
     */
    addProject: function (p, c) {
        var projectDir = u.resolveExpandUser(p.addProject),
            projectName = path.basename(projectDir);

        if (projectName === "defaults") {
            o.error("Project name 'defaults' is not valid");
            return;
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
