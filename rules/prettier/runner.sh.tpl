#!/bin/bash -e
arg="$1"

exit=0

function format {
    if [ "$arg" = write ]; then
        if ! cmp "$1" "$2"; then
            echo "$1"
            cp "$2" "$1"
        fi
    elif ! diff --color=always -u0 "$1" "$2"; then
        exit=1
    fi
}

%{files}

exit "$exit"
