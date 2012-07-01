# -*- coding: utf-8 -*-
from __future__ import print_function
from gitfetcher import configuration, getBool

import sys

canUseColors = False

# Trying to enable coloring
try:
    import colorama
    import termcolor

    colorama.init()
    canUseColors = True

except ImportError:
    pass

def error(message, prefix='', ignoreExitForce=False):
    if getBool(configuration['exit_on_fail']) and not ignoreExitForce:
        errorExitForce(message, prefix=prefix)
    else:
        color(message, "ERROR", "red", prefix, sys.stderr)


def errorExitForce(message, errorCode=1, prefix=''):
    error(message, prefix, True)
    if getBool(configuration['readline_on_fail']):
        raw_input()

    sys.exit(errorCode)


def color(message, type, color, prefix='', out=sys.stdout):
    coloredType = type

    if canUseColors:
        coloredType = termcolor.colored(type, color, attrs=("bold",))

    print("%s[ %s ] %s" % (prefix, coloredType, message), file=out)


def warning(message, prefix=''):
    color(message, "WARN", "yellow", prefix)


def info(message, prefix=''):
    color(message, "INFO", "blue", prefix)


def ok(message, prefix=''):
    color(message, "OK", "green", prefix)


def out(out):
    if getBool(configuration['print_git_out']):
        if not isinstance(out, str):
            if len(out) == 2:
                if out[0] != '': print(out[0].strip())
                if out[1] != '': print(out[1].strip())

        else:
            print(out.strip())