/*
 * gitfetcher
 * https://github.com/moonpyk/gitfetcher
 *
 * Copyright (c) 2014 Clément Bourgeois
 * Licensed under the MIT license.
 */

///<reference path="../typings/tsd.d.ts"/>

"use strict";

import path = require('path');
import fs = require('fs');

import _ = require('lodash');
import async = require('async');
import program = require('commander');
import nu = require('util');

import u = require('./util');
import o = require('./output');
import cnf = require('./configuration');
import Project = require("./project");

var confLookup = [
    '~/.gitfetcher.json',
    '~/gitfetcher.json',
    'gitfetcher.json'
];

var pack = require("../package.json"),
    exit_on_fail = false,
    readline_on_fail = false,
    readline_on_finish = false;

process['colorEnabled'] = true;

class App {
    program:commander.ICommand;
    configuration:cnf.Configuration;

    constructor() {
        this.program = program
            .version(pack.version)
            .usage('[options] [project-name...]')
            .option('--set-option <path> <value>', 'Set the configuration value of <path> to <value>')
            .option('--unset-option <path>', "Remove the configuration value of <path>")
            .option('-a, --add-project <dir>', 'Add the working copy directory <dir> to the registered projects')
            .option('-c, --config  <config>', 'Force use of specific config file <config>')
            .option('-e, --edit-config', 'Open the config file in a text editor')
            .option('-l, --list-projects', 'List available projects in config')
            .option('-N, --no-color', 'Disable output-coloring even if available')
            .option('-p, --pretend', "Don't do anything, just pretend")
            .option('-R, --reformat', 'Reformat the config file to have pretty JSON')
            .option('-x, --context <context>', 'Run inside context <context>')
            .option('--init-config [filename]', 'Init a new gitfetcher in filename [filename]', '');
    }

    main(argv) {
        var program = this.program.parse(argv);

        if (program['color'] === false) {
            process['colorEnabled'] = false;
        }

        var conf = this.configuration = null;

        if (_.isString(program['initConfig'])) {
            this.initConfig(program['initConfig']);
            return;
        }

        // If a specific configuration file has been given
        // we reset the default lookups to use only that precise one.
        if (_.isString(program['config'])) {
            confLookup = [program['config']];
        }

        // Trying each possible path until found a valid configuration
        confLookup.forEach((f) => {
            if (conf !== null) {
                return;
            }

            var parsed = cnf.Configuration.open(
                u.resolveExpandEnv(f)
            );

            if (parsed !== null) {
                conf = this.configuration = parsed;
                o.info(nu.format("Using configuration file '%s'...", f));
            }
        });

        // Definitely no valid config has been found
        if (conf === null) {
            if (confLookup.length == 1) {
                o.error(nu.format("Unable to read config file '%s'.", confLookup[0]));
            } else {
                o.error("No config file found, aborting.");
            }
            this.fail(78);
            return;
        }

        // User asked to add a new project to the active config.
        if (_.isString(program['addProject'])) {
            this.addProject();
            return;
        }

        // Reformat nicely the configuration
        if (_.isBoolean(program['reformat']) && program['reformat']) {
            conf.save();
            return;
        }

        // Open the configuration inside a text editor
        if (_.isBoolean(program['editConfig']) && program['editConfig']) {
            this.editConfig();
            return;
        }

        // Set an option with a given path
        if (_.isString(program['setOption']) && !_.isEmpty(program['setOption']) &&
            _.isString(program.args[0]) && !_.isEmpty(program.args[0])
        ) {
            this.setOption(program['setOption'], program.args[0]);
            return;
        }

        // Unset an option with the given path
        if (_.isString(program['unsetOption']) && !_.isEmpty(program['unsetOption'])) {
            this.unsetOption();
            return;
        }


        if (program['listProjects']) {
            console.log("Available projects :");
            _(conf.projects()).each((p, key) => {
                console.log(nu.format(
                    " - %s (%s)",
                    key,
                    nu.inspect(conf.content[key], false, undefined, true)
                ));
            });
            return;
        }

        exit_on_fail = cnf.Configuration.defaults.exit_on_fail;
        readline_on_fail = cnf.Configuration.defaults.readline_on_fail;
        readline_on_finish = cnf.Configuration.defaults.readline_on_finish;

        // Valid config found, filling the projects configurations.
        var context = _.isString(program['context']) && !_.isEmpty(program['context']) ? program['context'] : null,
            pretend = _.isBoolean(program['pretend']) && program['pretend'],
            projectMode = _.isArray(program.args) && program.args.length > 0;

        // No provided cmd context, trying the default one
        if (_.isEmpty(context) && !_.isEmpty(cnf.Configuration.defaults.default_context)) {
            context = cnf.Configuration.defaults.default_context;
        }

        // For each projects, we create of list of tasks, depending
        // on each project configuration. Each project is a task of tasks.
        var projectsTasks = _(conf.projects()).map((pConf:cnf.IProjectConfiguration, pKey:string) => {
            return this.handleProject(pKey, pConf, projectMode, context, pretend);
        }).filter(p => _.isFunction(p)).value();

        // Running all projects, in series
        async.series(projectsTasks, () => {
            conf.saveStat();

            if (!readline_on_finish) {
                return;
            }

            console.log("Press any key to finish...");

            u.prompt(function () {
                process.exit(0);
            });
        });
    }

    handleProject(pKey:string, pConf:cnf.IProjectConfiguration, projectMode:boolean, context:string, pretend:boolean) {
        if (projectMode && !_.contains(this.program.args, pKey)) {
            return null;
        }

        if (!pConf.enabled) {
            return null;
        }

        var p = new Project(pConf, pKey);

        if (!p.check()) {
            o.warning(
                nu.format("Project '%s' is now invalid, please check your configuration.", pKey),
                o.indent(2)
            );
            return null;
        }

        if (!p.inContext(context)) {
            return null;
        }

        // Project is enabled, populating the project tasks...
        return (callback:AsyncSingleResultCallback<any>) => {
            var tasks = {};

            tasks['print'] = p.printName.bind(p);

            if (!pretend) {
                tasks['fetch'] = p.fetch.bind(p);

                if (pConf.pull) {
                    tasks['pull'] = p.pull.bind(p);
                }

                if (pConf.force_gc) {
                    tasks['force_gc'] = p.force_gc.bind(p);
                } else {
                    if (this.configuration.fetchGet(pKey) % pConf.gc_interval === 0) {
                        tasks['gc'] = p.gc.bind(p);
                    }
                }
            }

            // When done with one project, continue to next
            async.series(tasks, (err, res) => {
                if (exit_on_fail && _.isObject(err)) {
                    this.fail();
                    return;
                }

                if (_.isObject(res['fetch']) && res['fetch']['code'] === 0) {
                    this.configuration.fetchIncrement(pKey);
                }
                callback(null, res);
            });
        };
    }

    addProject() {
        var projectDir = u.resolveExpandEnv(this.program['addProject']),
            projectName = path.basename(projectDir);

        if (projectName === "defaults") {
            o.error("Project name 'defaults' is not valid");
            return;
        }

        // Looking for a .git directory inside the working copy
        fs.exists(path.join(projectDir, '.git'), (exists) => {
            var c = this.configuration;
            if (exists) {
                c.content[projectName] = _.extend(c.content[projectName] || {}, {
                    path: projectDir
                });

                if (c.save()) {
                    o.ok(
                        nu.format("Project '%s' saved to configuration file '%s", projectName, c.filename)
                    );
                }
            } else {
                o.error(
                    nu.format("Directory '%s' doesn't appears to be a valid git project working copy", projectDir)
                );
            }
        });
    }

    initConfig(filename?:string){
        if(!cnf.Configuration.initConfig(filename, confLookup)) {
            this.fail();
        }
    }

    editConfig() {
        var s = require('child_process'),
            editor = "";

        if (_.isString(process.env.EDITOR)) {
            editor = process.env.EDITOR;
        } else {
            if (process.platform === "win32") {
                editor = "notepad.exe";
            }
        }

        if (_.isEmpty(editor)) {
            console.error("Not default text editor is defined, check your EDITOR environment variable");
            return;
        }

        s.spawn(editor, [this.configuration.filename], {
            stdio: 'inherit'
        });
    }

    setOption(path, value) {
        var parsed = u.dotNotationToObject(
            path,
            u.inferString(value)
        );
        var c = this.configuration;

        _.extend(c.content, parsed, (a, b) => {
            if (_.isObject(a) && _.isObject(b)) {
                return _.extend(a, b);
            }
            return b;
        });

        c.save();
    }

    unsetOption() {
        this.setOption(this.program['unsetOption'], undefined);
    }

    fail(code?:number) {
        if (!_.isNumber(code)) {
            code = 1;
        }

        if (readline_on_fail) {
            console.log("Error encountered, press any key to finish...");
            u.prompt(() => {
                process.exit(code);
            });
            return;
        }

        process.exit(code);
    }
}

export = App;
