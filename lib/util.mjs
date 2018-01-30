'use strict';

import util from 'util';
import chalk from 'chalk';

let verbose = false;

export function setVerbose(v) {
    verbose = v;
}

// it's lame that String.compare() doesn't exist!
export function stringCompare(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}

export function out(msg, chalker, outputter) {
    outputter = outputter || console.log.bind(console);
    if (chalker) {
        msg = chalker(msg);
    }
    outputter(msg);
}

export function dbg(msg, chalker) {
    if (verbose) {
        if (typeof msg !== 'string' && !(msg instanceof String)) {
            // The colors can be nice, but distracting!
            msg = util.inspect(msg, { colors: false, depth: 5 });
        }
        err(msg, chalker || chalk.white);
    }
}

export function err(msg, chalker) {
    out(msg, chalker || chalk.red, console.error.bind(console));
}
