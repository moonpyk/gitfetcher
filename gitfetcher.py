#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os, sys

from termcolor import colored
from optparse import OptionParser
from ConfigParser import ConfigParser
from subprocess import Popen, PIPE

_e = os.path.expanduser

OPTION_SECTION_NAME = 'configuration'
CONFIGURATION_PLACES = (
    'gitfetcher.cfg',
    _e('~/.gitfetcher.cfg'),
)

configParser = ConfigParser()
optionsParser = OptionParser(version='%prog 0.1', usage='%prog [options] [project...]')

optionsParser.add_option('-x', '--context', dest='context', help='Run inside context CONTEXT')
optionsParser.add_option('-c', '--config', dest='config', help='Force use of specific config file FILE')

configuration = {
    'base_path' : '',
    'git_bin' : '/usr/bin/git',
    'print_git_out' : True,
     # TODO: 'write_log' : False,
    'default_enabled' : True,
    'default_context' : None,
    'default_fetch_all' : False,
    'default_fetch_tags' : False,
    'default_pull' : False,
    # TODO: 'default_force_gc' : False,
    # TODO: 'default_gc_interval' : 5,
    # TODO: 'default_aggressive_gc_interval' : 0
}

def openConfiguration(specificFile=None):
    filesToRead = CONFIGURATION_PLACES
    
    if(specificFile is not None):
        filesToRead = specificFile
    
    filesFound = configParser.read(filesToRead)
    
    if len(filesFound) == 0:
        if specificFile is None:
            printError("No config file found, aborting", os.EX_CONFIG)
        else:
            printError("Configuration file '%s' not found, aborting" % specificFile, os.EX_CONFIG)
                
    else:
        printOK("Reading projects from : '%s'" % ', '.join(filesFound))
        
def readConfiguration():
    if OPTION_SECTION_NAME in configParser.sections():
        configuration.update(configParser.items(OPTION_SECTION_NAME))
    else:
        printWarning("No gitfetcher configuration section found. Using default one")
        
def getDefaultProjectConf():
    retVal = {}
    
    for key, value in configuration.items():
        if(key.startswith('default_')):
            retVal[key.replace('default_', '')] = value
    
    return retVal

def readProjects():
    retVal = {}
    
    for project in configParser.sections():
        if project != OPTION_SECTION_NAME:     
            projectConfig = dict(configParser.items(project))
            config = getDefaultProjectConf()
            config.update(projectConfig)
            retVal[project] = config
            
    return retVal

def handleAllProjects(projects, globalOptions):
    for project, config in projects.items():
        handleProject(project, config, globalOptions)

def handleProject(project, config, globalOptions):
    #print('\t', project, config)

    # Checking very basic config
    if 'path' not in config:
        printWarning("No 'path' configuration specied for project '%s', skipping..")
        return
    else:
        printInfo("Current project is '%s'" % project)

    # Is this right context ?
    if config['context'] is not None:
        if config['context'] != globalOptions.context:
            printInfo("Skipping project not in current context '%s'" % globalOptions.context, '\t')
            return   
    
    # Is this project enabled ?
    if getBool(config['enabled']) == False:
        printInfo("Skipping project which is not enabled", ' ' * 2)
        return 
    
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
    if(fetchInfo != ''):
        fetchInfo = ' [%s]' % fetchInfo.replace(' ', ', ')
    
    printInfo("Fetching%s..." % fetchInfo, ' ' * 2)
    
    gitFetch = Popen(fetchArgs, cwd=projectPath, stdout=PIPE, stderr=PIPE)
    
    printOut(gitFetch.communicate())
    printOK("Fetching done", ' ' * 2)
    
    # PULL
    if getBool(config['pull']):
        printInfo("Pulling...", ' ' * 2)
        pullArgs = gitBaseArgs[:]
        pullArgs.append('pull')
        
        gitPull = Popen(pullArgs, cwd=projectPath, stdout=PIPE, stderr=PIPE)
        
        printOut(gitPull.communicate())
        
        printOK("Pulling done", ' ' * 2)
        
    # TODO: GC
     
def main():   
    (options, args) = optionsParser.parse_args()
        
    openConfiguration(options.config)
    readConfiguration()
    
    allProjects = readProjects()
    
    if len(allProjects) == 0:
        printWarning("No project found in configuration")
    
    if len(args) == 0:
        # Taking all projects
        handleAllProjects(allProjects, options)
        
    else:
        """ 
        Specific project(s) given
        Before doing anything, checking that all projects have a configuration
        """
        for project in args:
            if project not in allProjects:
                printError("Project '%s' doesn't exists in configuration file" % project, os.EX_CONFIG)
                
        for project in args:
            handleProject(project, allProjects[project], options)

def getBool(value):   
    if(value.__class__ is str):
        value = value.lower() in ["yes", "true", "t", "1"]
    
    return value
        
def printError(message, errorCode=1, prefix=''):
    printColor(message, "ERROR", "red", prefix, sys.stderr)
    exit(errorCode)
    
def printWarning(message, prefix=''):
    printColor(message, "WARN", "yellow", prefix) 

def printInfo(message, prefix=''):
    printColor(message, "INFO", "blue", prefix)

def printOK(message, prefix=''):
    printColor(message, "OK", "green", prefix)

def printOut(out):
    if(getBool(configuration['print_git_out'])):
        if(len(out) == 2):
            if out[0] != '': print out[0].strip()
            if out[1] != '': print out[1].strip()
        
        else:
            print out.strip()

def printColor(message, type, color, prefix='', out=sys.stdout):
    type = colored(type, color, attrs=("bold",)) if canUseColors() else type
    
    print >> out, "%s[ %s ] %s" % (prefix, type, message) 

def canUseColors():    
    if hasattr(sys.stderr, "fileno"): # Thanks to René 'Necoro' Neumann
        return os.isatty(sys.stderr.fileno())
    
    return False

if __name__ == '__main__':
    main()

