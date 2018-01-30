'use strict';

import util from 'util';
import chalk from 'chalk';

let verbosity = 0;

util.inspect.styles.number = 'grey';
util.inspect.styles.boolean = 'grey';
util.inspect.styles.string = 'grey';
util.inspect.styles.date = 'grey';
util.inspect.styles.regexp = 'grey';
util.inspect.styles.null = 'grey';
util.inspect.styles.undefined = 'red';
util.inspect.styles.special = 'grey';
util.inspect.styles.name = 'white';

export function setVerbosity(v) {
    verbosity = v;
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

// We should *never* just show a bare object, as there's no context!
export function dbg(level, msg, obj) {
    if (verbosity >= level) {
        if (obj !== undefined) {
            let extra = '';
            if (obj instanceof Array || obj.length !== undefined) {
                extra = ` (${obj.length})`
            }
            msg = `${msg}${extra}:\n${util.inspect(obj, { colors: true, depth: 5 })}`;
        }
        // if (typeof msg !== 'string' && !(msg instanceof String)) {
        //     // The colors can be nice, but distracting!
        //     msg = util.inspect(msg, { colors: false, depth: 5 });
        // }


        out(msg, level <= 1 ? chalk.gray : chalk.white);
    }
}

export function err(msg, chalker) {
    out(msg, chalker || chalk.red, console.error.bind(console));
}
