#!/bin/sh

open_new_tab() {
        pwd=`pwd`
        osascript -e "tell application \"Terminal\"" \
        -e "tell application \"System Events\" to keystroke \"t\" using {command down}" \
        -e "do script \"cd $pwd; clear; $1;\" in front window" \
        -e "end tell"
        > /dev/null
}

#TODO: Get window and tab id correctly. Or just close every tabs other than the executing one
close_tab(){
    #osascript -e "tell application \"Terminal\" to close tab 2 of window 1"
    osascript -e "tell application \"Terminal\"" \
    -e "close rest of (get windows)" \
    -e "end tell"
}

run_without_bot(){
    open_new_tab "./test-client.sh $1 $2"
    browserify test-bots/"donothing-bot.js" | testling -x "open -a /Applications/Google\ Chrome.app"
}

run_with_bot(){
    open_new_tab "./test-client.sh $1 $2"
    browserify test-bots/"$1-bot.js" | testling -x "open -a /Applications/Google\ Chrome.app"
}

run_with_bot async chrome
run_without_bot helper chrome
# close_tab
# run_with_bot async firefox
# run_without_bot helper firefox
