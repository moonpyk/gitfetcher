/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */
///<reference path="../typings/tsd.d.ts"/>
"use strict";
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var program = require('commander');
var util = require('util');
var u = require('./util');
var o = require('./output');
var Configuration = require('./configuration');
var Project = require("./project");
var confLookup = [
    '~/.gitfetcher.json',
    '~/gitfetcher.json',
    'gitfetcher.json'
];
var pack = require("../package.json"), exit_on_fail = false, readline_on_fail = false, readline_on_finish = false;
process['colorEnabled'] = true;
function main(argv) {
    program.version(pack.version).usage('[options] [project-name...]').option('--set-option <path> <value>', 'Set the configuration value of <path> to <value>').option('--unset-option <path>', "Remove the configuration value of <path>").option('-a, --add-project <dir>', 'Add the working copy directory <dir> to the registered projects').option('-c, --config  <config>', 'Force use of specific config file <config>').option('-e, --edit-config', 'Open the config file in a text editor').option('-l, --list-projects', 'List available projects in config').option('-N, --no-color', 'Disable output-coloring even if available').option('-p, --pretend', "Don't do anything, just pretend").option('-R, --reformat', 'Reformat the config file to have pretty JSON').option('-x, --context <context>', 'Run inside context <context>').parse(argv);
    if (program['color'] === false) {
        process['colorEnabled'] = false;
    }
    var c = null;
    // If a specific configuration file has been given
    // we reset the default lookups to use only that precise one.
    if (_.isString(program['config'])) {
        confLookup = [program['config']];
    }
    // Trying each possible path until found a valid configuration
    _(confLookup).each(function (f) {
        if (c !== null) {
            return;
        }
        var parsed = Configuration.open(u.resolveExpandEnv(f));
        if (parsed !== null) {
            c = parsed;
            o.info(util.format("Using configuration file '%s'...", f));
        }
    });
    // Definitely no valid config has been found
    if (c === null) {
        if (confLookup.length == 1) {
            o.error(util.format("Unable to read config file '%s'.", confLookup[0]));
        }
        else {
            o.error("No config file found, aborting.");
        }
        fail(78);
        return;
    }
    // User asked to add a new project to the active config.
    if (_.isString(program['addProject'])) {
        addProject(program, c);
        return;
    }
    // Reformat nicely the configuration
    if (_.isBoolean(program['reformat']) && program['reformat']) {
        c.save();
        return;
    }
    // Open the configuration inside a text editor
    if (_.isBoolean(program['editConfig']) && program['editConfig']) {
        editConfig(c);
        return;
    }
    // Set an option with a given path
    if (_.isString(program['setOption']) && !_.isEmpty(program['setOption']) && _.isString(program.args[0]) && !_.isEmpty(program.args[0])) {
        setOption(program['setOption'], c, program.args[0]);
        return;
    }
    // Unset an option with the given path
    if (_.isString(program['unsetOption']) && !_.isEmpty(program['unsetOption'])) {
        unsetOption(program, c);
        return;
    }
    if (program['listProjects']) {
        c.fillProjects();
        console.log("Available projects :");
        _(c.projects).each(function (p, key) {
            console.log(util.format(" - %s (%s)", key, util.inspect(c.content[key], false, undefined, true)));
        });
        return;
    }
    exit_on_fail = Configuration.defaults.exit_on_fail;
    readline_on_fail = Configuration.defaults.readline_on_fail;
    readline_on_finish = Configuration.defaults.readline_on_finish;
    // Valid config found, filling the projects configurations.
    c.fillProjects();
    var context = _.isString(program['context']) && !_.isEmpty(program['context']) ? program['context'] : null, pretend = _.isBoolean(program['pretend']) && program['pretend'], projectMode = _.isArray(program.args) && program.args.length > 0;
    // For each projects, we create of list of tasks, depending
    // on each project configuration. Each project is a task of tasks.
    var projectsTasks = _(c.projects).map(function (conf, key) {
        if (projectMode && !_.contains(program.args, key)) {
            return;
        }
        if (!conf['enabled']) {
            return;
        }
        var p = new Project(conf);
        if (!p.check()) {
            o.warning(util.format("Project '%s' is now invalid, please check your configuration.", key), o.indent(2));
            return;
        }
        if (!p.inContext(context)) {
            return;
        }
        // Project is enabled, populating the project tasks...
        return function (callback) {
            var tasks = {};
            o.info(util.format("Project '%s'...", key), o.indent(2));
            if (!pretend) {
                tasks['fetch'] = p.fetch.bind(p);
                if (conf['pull']) {
                    tasks['push'] = p.pull.bind(p);
                }
                if (conf['force_gc']) {
                    tasks['force_gc'] = p.force_gc.bind(p);
                }
            }
            // When done with one project, continue to next
            async.series(tasks, function (err, results) {
                if (exit_on_fail && _.isObject(err)) {
                    fail();
                    return;
                }
                callback(null, results);
            });
        };
    }).value();
    // Running all projects, in series
    async.series(projectsTasks, function (err, results) {
        if (!readline_on_finish) {
            return;
        }
        console.log("Press any key to finish...");
        u.prompt(function () {
            process.exit(0);
        });
    });
}
exports.main = main;
function addProject(p, c) {
    var projectDir = u.resolveExpandEnv(p.addProject), projectName = path.basename(projectDir);
    if (projectName === "defaults") {
        o.error("Project name 'defaults' is not valid");
        return;
    }
    // Looking for a .git directory inside the working copy
    fs.exists(path.join(projectDir, '.git'), function (exists) {
        if (exists) {
            c.content[projectName] = _.extend(c.content[projectName] || {}, {
                path: projectDir
            });
            if (c.save()) {
                o.ok(util.format("Project '%s' saved to configuration file '%s", projectName, c.filename));
            }
        }
        else {
            o.error(util.format("Directory '%s' doesn't appears to be a valid git project working copy", projectDir));
        }
    });
}
function editConfig(c) {
    var s = require('child_process'), editor = "";
    if (_.isString(process.env.EDITOR)) {
        editor = process.env.EDITOR;
    }
    else {
        if (process.platform === "win32") {
            editor = "notepad.exe";
        }
    }
    if (_.isEmpty(editor)) {
        console.error("Not default text editor is defined, check your EDITOR environment variable");
        return;
    }
    s.spawn(editor, [c.filename], {
        stdio: 'inherit'
    });
}
function setOption(path, c, value) {
    var parsed = u.dotNotationToObject(path, u.inferString(value));
    _.extend(c.content, parsed, function (a, b) {
        if (_.isObject(a) && _.isObject(b)) {
            return _.extend(a, b);
        }
        return b;
    });
    c.save();
}
function unsetOption(program, c) {
    setOption(program.unsetOption, c, undefined);
}
function fail(code) {
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
}
//# sourceMappingURL=app.js.map