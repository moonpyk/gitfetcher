#!/usr/bin/env python
# -*- coding: utf-8 -*-

__version__ = "0.4.1"
__author__ = 'Clément Bourgeois'

import os
import output as o
from optparse import OptionParser
from ConfigParser import ConfigParser
from subprocess import Popen, PIPE

_e = os.path.expanduser

if os.name == 'posix':
    #noinspection PyUnresolvedReferences
    _configErrCode = os.EX_CONFIG
else:
    _configErrCode = 78

OPTION_SECTION_NAME = 'configuration'
CONFIGURATION_PLACES = (
    'gitfetcher.cfg', # Current dir, all platforms
    _e('~/.gitfetcher.cfg'), # Posix
    _e('~/gitfetcher.ini'), # Nt
    )

configParser = ConfigParser()
optionsParser = OptionParser(
    version='%prog' + ' %s' % __version__,
    usage='%prog [options] [project...]'
)

optionsParser.add_option('-x', '--context', dest='context', help='Run inside context CONTEXT')
optionsParser.add_option('-c', '--config', dest='config', help='Force use of specific config file FILE')
optionsParser.add_option('-N', '--no-color', dest='nocolor', help='Disable output-coloring even if available',
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

def openConfiguration(specificFile=None):
    filesToRead = CONFIGURATION_PLACES

    if specificFile is not None:
        filesToRead = specificFile

    filesFound = configParser.read(filesToRead)

    if not len(filesFound):
        if specificFile is None:
            o.errorExitForce("No config file found, aborting", _configErrCode)
        else:
            o.errorExitForce("Configuration file '%s' not found, aborting" % specificFile, _configErrCode)

    else:
        o.ok("Reading projects from : '%s'" % ', '.join(filesFound))


def readConfiguration():
    if OPTION_SECTION_NAME in configParser.sections():
    # Merging default configuration with user's one, user's takes precedence
        configuration.update(configParser.items(OPTION_SECTION_NAME))

    else:
        o.warning("No gitfetcher configuration section found. Using default one")


def getDefaultProjectConfig():
    retVal = {}

    # All keys beginning by "default_" are default project configuration
    for key, value in list(configuration.items()):
        if key.startswith('default_'):
        # Removing the beginning of the key, it's now a valid project conf
            retVal[key.replace('default_', '')] = value

    return retVal


def readProjects():
    retVal = {}

    for project in configParser.sections():
        if project != OPTION_SECTION_NAME:
            projectConfig = dict(configParser.items(project)) # Taking all available keys
            config = getDefaultProjectConfig() # Taking default conf
            # Merging default config with project one, project taking precedence
            config.update(projectConfig)
            retVal[project] = config

    return retVal


def handleAllProjects(projects, globalOptions):
    for project, config in list(projects.items()):
        handleProject(project, config, globalOptions)


def doGarbageCollect(gitBaseArgs, projectPath, aggressive):
    gcArgs = gitBaseArgs[:]
    gcArgs.append('gc')

    if aggressive:
        gcArgs.append('--aggressive')

    gitForceGcProcess = Popen(gcArgs, cwd=projectPath, stdout=PIPE, stderr=PIPE)

    o.out(gitForceGcProcess.communicate())
    o.ok('Garbage collecting is done', ' ' * 2)


def handleProject(project, config, globalOptions):
    # Checking very basic config
    if 'path' not in config:
        o.warning("No 'path' configuration specified for project '%s', skipping..")
        return

    else:
        o.info("Current project is '%s'" % project)

    # Is this right context ?
    if config['context'] is not None and config['context'] != globalOptions.context:
        o.info("Skipping project not in current context '%s'" % globalOptions.context, '\t')
        return

    # Is this project enabled ?
    if not getBool(config['enabled']):
        o.info("Skipping project which is not enabled", ' ' * 2)
        return

    # Maybe the project path is a real one, trying...
    if os.path.exists(config['path']):
        projectPath = config['path']
    else:
        projectPath = _e(configuration['base_path'] + config['path'])

    gitBaseArgs = [configuration['git_bin']]

    # FETCH
    fetchInfo = ''
    fetchArgs = gitBaseArgs[:]
    fetchArgs.append('fetch')

    all = getBool(config['fetch_all'])

    if all:
        fetchArgs.append('--all')
        fetchInfo += " all"

    tags = getBool(config['fetch_tags'])

    if tags:
        fetchArgs.append('--tags')
        fetchInfo += " tags"

    fetchInfo = fetchInfo.strip()
    if fetchInfo != '':
        fetchInfo = ' [%s]' % fetchInfo.replace(' ', ', ')

    o.info("Fetching%s..." % fetchInfo, ' ' * 2)

    try:
        gitFetch = Popen(fetchArgs, cwd=projectPath, stdout=PIPE, stderr=PIPE)

    except OSError:
        o.error("Unable to open project %s" % project, ' ' * 2)
        return

    o.out(gitFetch.communicate())

    if not gitFetch.returncode:
        o.ok("Fetching done", ' ' * 2)
    else:
        o.error("Error during fetch", ' ' * 2)

    # PULL
    if getBool(config['pull']):
        o.info("Pulling...", ' ' * 2)
        pullArgs = gitBaseArgs[:]
        pullArgs.append('pull')

        if getBool(config['pull_ff_only']):
            pullArgs.append('--ff-only')

        gitPullProcess = Popen(pullArgs, cwd=projectPath, stdout=PIPE, stderr=PIPE)

        o.out(gitPullProcess.communicate())

        o.ok("Pulling done", ' ' * 2)

        if getBool(config['force_gc']):
            o.info('Forced garbage collect is enabled, doing it', ' ' * 2)
            aggressive = getBool(config['force_gc_aggressive'])

            doGarbageCollect(gitBaseArgs, projectPath, aggressive)


def main():
    (options, args) = optionsParser.parse_args()

    if options.nocolor:
        o.canUseColors = False

    openConfiguration(options.config)
    readConfiguration()

    # Check that git executable exists before doing anything
    if not os.path.exists(configuration['git_bin']):
        o.errorExitForce("Unable to find the git binary, please fix you 'git_bin' option in configuration",
            _configErrCode)

    allProjects = readProjects()

    if not len(allProjects):
        o.warning("No project found in configuration")

    if not len(args):
        # Taking all projects
        handleAllProjects(allProjects, options)

    else:
        # Specific project(s) given
        # Before doing anything, checking that all projects have a configuration
        for project in args:
            if project not in allProjects:
                o.errorExitForce("Project '%s' doesn't exists in configuration file" % project, _configErrCode)

        for project in args:
            handleProject(project, allProjects[project], options)

    if configuration['readline_on_finish']:
        print("")
        o.ok("All work is done")
        raw_input()

def getBool(value):
    retVal = value
    if isinstance(value, str):
        retVal = value.lower() in ["yes", "true", "t", "on", "1"]

    return retVal

if __name__ == '__main__':
    main()
