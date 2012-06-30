#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os

__author__ = 'Clément Bourgeois'

from gitfetcher import __version__

if os.name == 'nt':
    import py2exe

from distutils.core import setup

setup(
        name = "GitFetcher",
        description = "Utility to fetch/pull from multiple git repositories configured as projects",
        author = __author__,
        author_email = "moonpyk@gmail.com",
        version = __version__,
        url = "http://www.moonpyk.net",
        py_modules = ['gitfetcher', 'termcolor'],
        license = "GPLv3",
        console = ["gitfetcher.py"], requires=['colorama', "termcolor"]
        )