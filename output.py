# -*- coding: utf-8 -*-
from __future__ import print_function

try:
    from gitfetcher import CONFIG, get_bool
except ImportError:
    pass

import sys

CAN_USE_COLORS = False

# Trying to enable coloring
try:
    # noinspection PyUnresolvedReferences
    import colorama
    # noinspection PyUnresolvedReferences
    import termcolor

    colorama.init()
    CAN_USE_COLORS = True

except ImportError:
    pass


def error(message, prefix='', ignr_exitforce=False):
    if get_bool(CONFIG['exit_on_fail']) and not ignr_exitforce:
        error_exitforce(message, prefix=prefix)
    else:
        color(message, "ERROR", "red", prefix, sys.stderr)


def error_exitforce(message, errcode=1, prefix=''):
    error(message, prefix, True)
    if get_bool(CONFIG['readline_on_fail']):
        raw_input()

    sys.exit(errcode)


def color(message, message_t, colorn, prefix='', out=sys.stdout):
    colored_type = message_t

    if CAN_USE_COLORS:
        colored_type = termcolor.colored(message_t, colorn, attrs=("bold",))

    print("%s[ %s ] %s" % (prefix, colored_type, message), file=out)


def warning(message, prefix=''):
    color(message, "WARN", "yellow", prefix)


def info(message, prefix=''):
    color(message, "INFO", "blue", prefix)


def ok(message, prefix=''):
    color(message, "OK", "green", prefix)


def outraw(out):
    if get_bool(CONFIG['print_git_out']):
        if not isinstance(out, str):
            if len(out) == 2:
                if out[0] != '':
                    print(out[0].strip())

                if out[1] != '':
                    print(out[1].strip())

        else:
            print(out.strip())