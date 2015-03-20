#!/bin/sh

# karma should only run a single test suite here
# Temporary solution: use different karma config files
# Possible to accept argument to karma and load only specific files ?
# TODO: Replace chrome with parameter
karma start karma-config/"$2"/karma-"$1".conf.js

#After test was run, close all remaining bots and node processes
killall -9 "Google Chrome"
killall -9 node
