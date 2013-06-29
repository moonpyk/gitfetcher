# GitFetcher #

A pretty cool utility to fetch/pull from multiple git repositories configured as projects.

## Requirements

 * NodeJS >= 0.8.0
 * Git

## Configuration

Configuration file can reside in multiple locations, lookup is done in order :

 * ~/.gitfetcher.json
 * ~/gitfetcher.json 
 * gitfetcher.json inside the working directory

Configuration location may be overridden with the `--config` switch.

"~" is user's home directory, on *unix `/home/$yourusername$`, on Windows `C:\Users\$yourusername$`.

## Configuration format

Configuration is a JSON format file. 

An example configuration is available inside the project directory.

On *nix, git is usually available at `/usr/bin/git` location, on Windows `C:\Program Files\Git\cmd\git.exe` or `C:\Program Files (x86)\Git\cmd\git.exe` on 64bits versions.