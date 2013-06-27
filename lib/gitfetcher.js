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

module.exports = {
    main: function () {
        program
            .version('0.0.1')
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

        if (_.isString(program.config)) {
            confLookup = [program.config];
        }

        _.each(confLookup, function (f) {
            if (c !== null) {
                return;
            }

            f = path.resolve(path.normalize(u.expandUser(f)));

            var parsed = Configuration.open(f);

            if (parsed !== null) {
                c = parsed;
                o.info(u.format("Using configuration file '%s'", f));
            }
        });

        if (c === null) {
            if (confLookup.length == 1) {
                o.error(u.format("Unable to read config file '%s'", confLookup[0]));
            } else {
                o.error("No config file found, aborting");
            }
            process.exit(78);
            return;
        }

        c.fill();

        if (_.isString(program.addProject)) {
            this.addProject(program, c);
            return;
        }

        var allTasks = [];

        _.each(c.projects, function (conf, key) {
            if (!conf.enabled) {
                return;
            }

            allTasks.push(function (callback) {
                var tasks = [];

                var p = new Project(conf);

                o.info(u.format("Project '%s'...", key), o.indent(2));

                tasks.push(p.fetch.bind(p));

                if (conf.pull) {
                    tasks.push(p.pull.bind(p));
                }

                if (conf.force_gc) {
                    tasks.push(p.force_gc.bind(p));
                }

                async.series(tasks, function () {
                    callback(null, key);
                });
            });
        });

        async.series(allTasks);

    },
    addProject: function (p, c) {
        var projectDir = p.addProject;

        projectDir = path.resolve(path.normalize(projectDir));

        var projectName = path.basename(projectDir);

        if (projectName === "defaults") {
            o.error("Project name 'defaults' is not valid");
            //return false;
        }

        fs.exists(path.join(projectDir, '.git'), function (exists) {
            if (exists) {
                c.content[projectName] = {
                    path: projectDir
                };

                if (c.save()) {
                    o.ok(u.format("Project '%s' saved to configuration file '%s", projectName, c.filename));
                }
            } else {
                o.error(u.format("Directory '%s' doesn't appear to be a valid git project working copy", projectDir));
            }
        });
    }
};
