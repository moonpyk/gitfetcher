#!/usr/bin/env python
# -*- coding: utf-8 -*-

__version__ = "0.4.2"
__author__ = 'Clément Bourgeois'

import os
import output as o
from optparse import OptionParser
from ConfigParser import ConfigParser
from subprocess import Popen, PIPE

E_ = os.path.expanduser

if os.name == 'posix':
    #noinspection PyUnresolvedReferences
    CONF_ERRCODE = os.EX_CONFIG
else:
    CONF_ERRCODE = 78

OPTION_SECTION_NAME = 'configuration'
CONFIGURATION_PLACES = (
    'gitfetcher.cfg',         # Current dir, all platforms
    E_('~/.gitfetcher.cfg'),  # Posix
    E_('~/gitfetcher.ini'),   # Nt
)

CONFIG_PARSER = ConfigParser()
OPT_PARSER = OptionParser(
    version='%prog' + ' %s' % __version__,
    usage='%prog [options] [project...]'
)

OPT_PARSER.add_option('-x', '--context', dest='context', help='Run inside context CONTEXT')
OPT_PARSER.add_option('-c', '--config', dest='config', help='Force use of specific config file FILE')
OPT_PARSER.add_option('-N', '--no-color', dest='nocolor', help='Disable output-coloring even if available',
                      default=False, action='store_true')

configuration = {
    'base_path': '',
    'git_bin': '/usr/bin/git',
    'print_git_out': True,
    'exit_on_fail': False,
    'readline_on_fail': False,
    'readline_on_finish': False,
    # TODO: 'write_log' : False,
    'default_enabled': True,
    'default_context': None,
    'default_fetch_all': False,
    'default_fetch_tags': False,
    'default_pull': False,
    'default_pull_ff_only': True,
    'default_force_gc': False,
    'default_force_gc_aggressive': False,
    # TODO: 'default_gc_interval' : 5,
    # TODO: 'default_aggressive_gc_interval' : 0
}


def configuration_open(specific_file=None):
    file_to_read = CONFIGURATION_PLACES

    if specific_file is not None:
        file_to_read = specific_file

    files_found = CONFIG_PARSER.read(file_to_read)

    if not len(files_found):
        if specific_file is None:
            o.error_exitforce("No config file found, aborting", CONF_ERRCODE)
        else:
            o.error_exitforce("Configuration file '%s' not found, aborting" % specific_file, CONF_ERRCODE)

    else:
        o.ok("Reading projects from : '%s'" % ', '.join(files_found))


def configuration_read():
    if OPTION_SECTION_NAME in CONFIG_PARSER.sections():
    # Merging default configuration with user's one, user's takes precedence
        configuration.update(CONFIG_PARSER.items(OPTION_SECTION_NAME))

    else:
        o.warning("No gitfetcher configuration section found. Using default one")


def project_config_default():
    ret = {}

    # All keys beginning by "default_" are default project configuration
    for key, value in list(configuration.items()):
        if key.startswith('default_'):
        # Removing the beginning of the key, it's now a valid project conf
            ret[key.replace('default_', '')] = value

    return ret


def projects_read():
    ret = {}

    for project in CONFIG_PARSER.sections():
        if project != OPTION_SECTION_NAME:
            project_config = dict(CONFIG_PARSER.items(project))  # Taking all available keys
            config = project_config_default()  # Taking default conf
            # Merging default config with project one, project taking precedence
            config.update(project_config)
            ret[project] = config

    return ret


def projects_handle_all(projects, global_opt):
    for project, config in list(projects.items()):
        project_handle(project, config, global_opt)


def project_handle(project, config, global_opt):
    # Checking very basic config
    if 'path' not in config:
        o.warning("No 'path' configuration specified for project '%s', skipping..")
        return

    else:
        o.info("Current project is '%s'" % project)

    # Is this right context ?
    if config['context'] is not None and config['context'] != global_opt.context:
        o.info("Skipping project not in current context '%s'" % global_opt.context, '\t')
        return

    # Is this project enabled ?
    if not get_bool(config['enabled']):
        o.info("Skipping project which is not enabled", ' ' * 2)
        return

    # Maybe the project path is a real one, trying...
    if os.path.exists(config['path']):
        project_path = config['path']
    else:
        project_path = E_(configuration['base_path'] + config['path'])

    bargs = [configuration['git_bin']]

    # FETCH
    fetch_info = ''
    fetch_args = bargs[:]
    fetch_args.append('fetch')

    fetch_all = get_bool(config['fetch_all'])

    if fetch_all:
        fetch_args.append('--all')
        fetch_info += " all"

    tags = get_bool(config['fetch_tags'])

    if tags:
        fetch_args.append('--tags')
        fetch_info += " tags"

    fetch_info = fetch_info.strip()
    if fetch_info != '':
        fetch_info = ' [%s]' % fetch_info.replace(' ', ', ')

    o.info("Fetching%s..." % fetch_info, ' ' * 2)

    try:
        p_git_fetch = Popen(fetch_args, cwd=project_path, stdout=PIPE, stderr=PIPE)

    except OSError:
        o.error("Unable to open project %s" % project, ' ' * 2)
        return

    o.outraw(p_git_fetch.communicate())

    if not p_git_fetch.returncode:
        o.ok("Fetching done", ' ' * 2)
    else:
        o.error("Error during fetch", ' ' * 2)

    # PULL
    if get_bool(config['pull']):
        o.info("Pulling...", ' ' * 2)
        pull_args = bargs[:]
        pull_args.append('pull')

        if get_bool(config['pull_ff_only']):
            pull_args.append('--ff-only')

        p_git_pull = Popen(pull_args, cwd=project_path, stdout=PIPE, stderr=PIPE)

        o.outraw(p_git_pull.communicate())

        o.ok("Pulling done", ' ' * 2)

        if get_bool(config['force_gc']):
            o.info('Forced garbage collect is enabled, doing it', ' ' * 2)
            aggressive = get_bool(config['force_gc_aggressive'])

            project_gitgc(bargs, project_path, aggressive)


def project_gitgc(git_bargs, project_path, aggressive):
    gc_args = git_bargs[:]
    gc_args.append('gc')

    if aggressive:
        gc_args.append('--aggressive')

    p_git_gc = Popen(gc_args, cwd=project_path, stdout=PIPE, stderr=PIPE)

    o.outraw(p_git_gc.communicate())
    o.ok('Garbage collecting is done', ' ' * 2)


def main():
    (options, args) = OPT_PARSER.parse_args()

    if options.nocolor:
        o.canUseColors = False

    configuration_open(options.config)
    configuration_read()

    # Check that git executable exists before doing anything
    if not os.path.exists(configuration['git_bin']):
        o.error_exitforce("Unable to find the git binary, please fix you 'git_bin' option in configuration",
                          CONF_ERRCODE)

    all_projects = projects_read()

    if not len(all_projects):
        o.warning("No project found in configuration")

    if not len(args):
        # Taking all projects
        projects_handle_all(all_projects, options)

    else:
        # Specific project(s) given
        # Before doing anything, checking that all projects have a configuration
        for project in args:
            if project not in all_projects:
                o.error_exitforce("Project '%s' doesn't exists in configuration file" % project, CONF_ERRCODE)

        for project in args:
            project_handle(project, all_projects[project], options)

    if configuration['readline_on_finish']:
        print("")
        o.ok("All work is done")
        raw_input()


def get_bool(value):
    ret = value
    if isinstance(value, str):
        ret = value.lower() in ["yes", "true", "t", "on", "1"]

    return ret


if __name__ == '__main__':
    main()
