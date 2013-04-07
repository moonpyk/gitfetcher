#!/usr/bin/env python
# -*- coding: utf-8 -*-

from distutils.core import setup

try:
    import py2exe
except ImportError:
    pass

from gitfetcher import __version__, __author__

setup(
    name="GitFetcher",
    description="Utility to fetch/pull from multiple git repositories configured as projects",
    author=__author__,
    author_email="moonpyk@gmail.com",
    version=__version__,
    url="http://www.moonpyk.net",
    py_modules=['gitfetcher', 'output'],
    license="GPLv3",
    console=["gitfetcher.py"], requires=['colorama', "termcolor"]
)