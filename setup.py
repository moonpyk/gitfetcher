#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__ = 'Clément Bourgeois'

from gitfetcher import version

from distutils.core import setup

setup(
        name = "GitFetcher",
        description = "Utility to fetch/pull from multiple git repositories configured as projects",
        author = __author__,
        author_email = "moonpyk@gmail.com",
        version = version,
        url = "http://www.moonpyk.net",
        py_modules = ['gitfetcher', 'termcolor'],
        license = "GPLv3"
        )