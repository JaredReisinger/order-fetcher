import util from 'util';
import chalk from 'chalk';
import moment from 'moment-timezone';

let verbosity = 0;

// util.inspect.styles.number = 'grey';
// util.inspect.styles.boolean = 'grey';
// util.inspect.styles.string = 'grey';
// util.inspect.styles.date = 'grey';
// util.inspect.styles.regexp = 'grey';
// util.inspect.styles.null = 'grey';
// util.inspect.styles.undefined = 'red';
// util.inspect.styles.special = 'grey';
// util.inspect.styles.name = 'grey';

export function setVerbosity(v) {
  verbosity = v || 0;
  dbg(1, `setting verbosity to ${verbosity}`);
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

export function increment(ignored, total) {
  // console.error(chalk.white(`incrementing ${total}...`));
  return total + 1;
}

export function collect(val, memo) {
  memo.push(val);
  return memo;
}

export function asMoment(val) {
  const date = moment.tz(val, moment.tz.guess());
  if (!date.isValid()) {
    throw new Error(`date not understood: "${val}"`);
  }
  return date;
}

export function out(msg, chalker, outputter) {
  // eslint-disable-next-line no-param-reassign
  outputter = outputter || console.log.bind(console);
  if (chalker) {
    // eslint-disable-next-line no-param-reassign
    msg = chalker(msg);
  }
  outputter(msg);
}

// The additional colors only work with 256+ colors.  ConEmu can only support
// this if you disable scrollback.  Since I need scrollback, we're only using
// a small number of colors.
const levelChalkers = [
  // chalk.hex('#00ffff'), // "level zero" is a bogus, "forced debugging" level
  // chalk.hex('#aaaaaa'),
  // chalk.hex('#888888'),
  // chalk.hex('#666666'),
  // chalk.hex('#444444'),
  chalk.cyan,
  chalk.gray,
  chalk.gray,
  chalk.gray,
];

const objLevels = 2;
const maxLevels = levelChalkers.length - 1 - objLevels;

// We should *never* just show a bare object, as there's no context!
export function dbg(level, msg, obj) {
  if (verbosity < level) {
    return;
  }

  const msgChalkerLevel = level <= maxLevels ? level : maxLevels;
  const chalker = levelChalkers[msgChalkerLevel];

  if (obj !== undefined) {
    let extra = '';
    if (obj instanceof Array || obj.length !== undefined) {
      extra = ` (${obj.length})`;
    }
    // eslint-disable-next-line no-param-reassign
    msg = `${msg}${extra}:\n${levelChalkers[msgChalkerLevel + objLevels](
      util.inspect(obj, {
        colors: false,
        depth: 5,
        compact: true,
        sorted: true,
      })
    )}`;
  }
  // if (typeof msg !== 'string' && !(msg instanceof String)) {
  //     // The colors can be nice, but distracting!
  //     msg = util.inspect(msg, { colors: false, depth: 5 });
  // }

  // out(msg, level <= 1 ? chalk.gray : chalk.white);
  out(msg, chalker);
}

export function err(e, chalker) {
  let msg = e.toString();
  if (e.message) {
    msg = e.message;
  }
  out(msg, chalker || chalk.red, console.error.bind(console));
}
