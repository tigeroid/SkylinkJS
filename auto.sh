#!/bin/sh

open_new_tab() {
        pwd=`pwd`
        osascript -e "tell application \"Terminal\"" \
        -e "tell application \"System Events\" to keystroke \"t\" using {command down}" \
        -e "do script \"cd $pwd; clear; $1;\" in front window" \
        -e "end tell"
        > /dev/null
}
 
run_without_bot(){
    open_new_tab "./test-client.sh $1"
    browserify test-bots/"donothing-bot.js" | testling -x "open -a /Applications/Google\ Chrome.app"
}

run_with_bot(){
    open_new_tab "./test-client.sh $1"
    browserify test-bots/"$1-bot.js" | testling -x "open -a /Applications/Google\ Chrome.app"
}
 
run_without_bot helper
run_with_bot async
