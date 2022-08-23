// eslint-disable-next-line max-classes-per-file
import fs from 'fs';
import util from 'util';

import yargs from 'yargs';
import chalk from 'chalk';
import chalkTemplate from 'chalk-template';
import moment from 'moment-timezone';
import inquirer, {
  Answers,
  DistinctQuestion,
  QuestionCollection,
} from 'inquirer';
import PromptBase from 'inquirer/lib/prompts/base.js';
import autocomplete from 'inquirer-autocomplete-prompt';

import * as helpers from '../helpers.js';

const writeFileAsync = util.promisify(fs.writeFile);

// for testing, we need a hook to inject a fake "prompt" handler...
type PromptFn<T extends Answers = Answers> = (
  questions: QuestionCollection<T>,
  initialAnswers?: Partial<T>
) => Promise<T> & { ui: inquirer.ui.Prompt<T> };

inquirer.registerPrompt('autocomplete', autocomplete);

// The NopQuestion is a sub-in for any other question...
// interface NopQuestion<T extends Answers = Answers> {
//   type: 'nop',
// }
type NopQuestion<T extends Answers = Answers> = Omit<
  DistinctQuestion<T>,
  'type'
> & { type: 'nop' };

type AutocompleteQuestion<T extends Answers = Answers> = Omit<
  DistinctQuestion<T>,
  'type'
> & {
  type: 'autocomplete';
  source: (_: unknown, input: string) => Promise<string[]>;
};

type AnyQuestion<T extends Answers = Answers> =
  | DistinctQuestion<T>
  | AutocompleteQuestion<T>
  | NopQuestion<T>;

class NopPrompt extends PromptBase {
  _run(callback: (_: unknown) => void) {
    callback(this.opt.filter?.(this.opt.default, {}));
  }
}

inquirer.registerPrompt('nop', NopPrompt);

// Need a type for our config...
interface ConfigHostInfo {
  url: string;
  key: string;
  secret: string;
}

export interface ConfigFile {
  _filename?: string;
  _missing?: true;
  hosts: Record<string, ConfigHostInfo>;
  timezone?: string;
}

export interface OptsHandler {
  (_: unknown): void;
}

interface Args {
  host?: string;
  zone?: string;
}

interface MyAnswers {
  host: {
    name: string;
    secure: boolean;
    url: string;
    key: string;
    secret: string;
  };
  timezone: string;
}

export default class Config {
  cfg: ConfigFile;
  handleGlobalOpts: OptsHandler;

  constructor(cfg: ConfigFile, handleGlobalOpts: OptsHandler) {
    this.cfg = cfg;
    this.handleGlobalOpts = handleGlobalOpts;
  }

  async createCommands(): Promise<yargs.CommandModule<Args, Args>[]> {
    return [
      {
        command: 'config',
        describe: 'help manage the .order-fetcher.json configuration',

        handler: () => {
          helpers.dbg(1, 'dummy handler to keep typescript happy?');
        },

        builder: (yargs) =>
          yargs
            .command({
              command: 'view',
              describe: 'view the current configuration',
              handler: this.view.bind(this),
            })
            .command({
              command: 'init',
              describe: 'create or overwrite the configuration',
              handler: this.init.bind(this),
            })
            .command({
              command: 'add [host]',
              describe: 'add a new host to the configuration',
              handler: this.add.bind(this),
            })
            .command({
              command: 'remove [host]',
              describe: 'remove a host from the configuration',
              handler: this.remove.bind(this),
            })
            .command({
              command: 'timezone [zone]',
              aliases: ['tz'],
              describe: 'set the timezone in the configuration',
              handler: this.timezone.bind(this),
            }),
      },
    ];
  }

  async view() {
    if (this.cfg._missing) {
      helpers.out('no configuration', chalk.yellow);
      return;
    }

    helpers.out(chalkTemplate`
timezone: {cyan ${
      !this.cfg.timezone ||
      chalkTemplate`{yellow (none configured, using ${moment.tz.guess()})}`
    }}

{gray hosts}${Object.entries(this.cfg.hosts)
      .map(
        ([name, host]) => chalkTemplate`
  {cyan ${name}}
    url   : {cyan.underline ${host.url}}
    key   : {gray ${host.key}}
    secret: {gray ${host.secret}}`
      )
      .join('')}
`);
  }

  async init(_: yargs.ArgumentsCamelCase<Args>, promptOverride?: PromptFn) {
    if (!this.cfg._missing) {
      const answers = await (promptOverride ?? inquirer.prompt)([
        {
          name: 'overwrite',
          message: 'Do you want to overwrite the existing configuration?',
          type: 'confirm',
          default: false,
        },
      ]);

      if (!answers.overwrite) {
        // bail now!
        helpers.out(
          '\nTry "orders config add" or "orders config tz" to update the configuration.',
          chalk.cyan
        );
        return;
      }
    }

    const questions: AnyQuestion<MyAnswers>[] = [];

    questions.push(...Config.hostQuestions());
    questions.push(...Config.timezoneQuestions());

    const answers = await (promptOverride ?? inquirer.prompt)(questions);

    // console.dir({ answers });
    const { timezone, host } = answers;
    const { name, url, key, secret } = host;
    const cfg = {
      timezone,
      hosts: {
        [name]: { url, key, secret },
      },
    };

    this.writeConfig(cfg);
  }

  async add(argv: yargs.ArgumentsCamelCase<Args>, promptOverride?: PromptFn) {
    const { host } = await (promptOverride ?? inquirer.prompt)(
      Config.hostQuestions(argv.host)
    );
    // console.dir({ argv, host });
    const { name, url, key, secret } = host;

    const cfg = {
      ...this.cfg,
      hosts: {
        ...this.cfg.hosts,
        [name]: { url, key, secret },
      },
    };

    this.writeConfig(cfg);
  }

  async remove(argv: yargs.ArgumentsCamelCase<Args>) {
    const { host } = argv;
    if (!host || !this.cfg.hosts[host]) {
      const hosts = `"${Object.keys(this.cfg.hosts).join('", "')}"`;
      throw new helpers.UserError(
        `host "${host}" not found in configuration; try one of: ${hosts}`
      );
    }

    const cfg = { ...this.cfg };
    delete cfg.hosts[host];
    this.writeConfig(cfg);
  }

  async timezone(
    argv: yargs.ArgumentsCamelCase<Args>,
    promptOverride?: PromptFn
  ) {
    const { timezone } = await (promptOverride ?? inquirer.prompt)(
      Config.timezoneQuestions(argv.zone)
    );

    const cfg = {
      ...this.cfg,
      timezone,
    };

    this.writeConfig(cfg);
  }

  async writeConfig(cfg: ConfigFile) {
    if (!cfg._filename) {
      helpers.err(new Error('no filename found in config object'));
      return;
    }
    const toWrite = { ...cfg }; // shallow copy
    delete toWrite._missing;
    delete toWrite._filename;

    const formatted = JSON.stringify(toWrite, null, '  ');
    // helpers.out(`writing to "${cfg._filename}"...\n---\n${formatted}\n---`);
    helpers.out(`writing to "${cfg._filename}"...`);
    await writeFileAsync(cfg._filename, formatted, 'utf8');
  }

  // eslint-disable-next-line class-methods-use-this
  static hostQuestions(hostName?: string): AnyQuestion<MyAnswers>[] {
    return [
      {
        name: 'host.name',
        message: 'What is the nickname for your WooCommerce site?',
        type: hostName ? 'nop' : 'input',
        default: hostName,
        validate: (name: string) =>
          name && name.length > 0
            ? true
            : 'Please provide a name, it will be used as a convenient subcommand.',
      },
      {
        name: 'host.secure',
        message: ({ host }) =>
          `Is the site for ${host.name} secure (uses https)?`,
        type: 'confirm',
        default: true,
      },
      {
        name: 'host.url',
        message: ({ host }) => `What is the URL for ${host.name}?`,
        type: 'input',
        transformer: (input, { host }) => {
          const prefix = `http${host.secure ? 's' : ''}://`;
          if (!input || input === '') {
            return `${prefix}${host.name}.com`;
          }
          return `${prefix}${input}`;
        },
        filter: (input, { host }) => {
          // console.dir({ input, host });
          const prefix = `http${host.secure ? 's' : ''}://`;
          return `${prefix}${input || `${host.name}.com`}`;
        },
      },
      {
        name: 'host.key',
        message: ({ host }) =>
          `What is the WooCommerce key for ${host.name}?\n(Visit ${chalk.blue(
            `${host.url}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
          )} to create a key, only Read permission is needed.)\n?`,
        type: 'input',
        // default: 'ck_...',
        validate: required('the WooCommerce key'),
      },
      {
        name: 'host.secret',
        message: ({ host }) =>
          `What is the WooCommerce secret for ${host.name}?`,
        type: 'input',
        // default: 'cs_...',
        validate: required('the WooCommerce secret'),
      },
    ];
  }

  static timezoneQuestions(zone?: string): AnyQuestion<MyAnswers>[] {
    const allTimezones = moment.tz.names();
    const guessTimezone = moment.tz.guess();

    let type: 'autocomplete' | 'nop' = 'autocomplete';
    let defaultTimezone = zone;
    if (zone) {
      const exact = allTimezones.find(uncaseExact(zone));
      const filtered = allTimezones.filter(uncaseIncludes(zone));
      if (exact || filtered.length === 1) {
        type = 'nop';
        defaultTimezone = exact || filtered[0];
      } else {
        helpers.err(`unknown timezone "${zone}"`);
      }
    }

    return [
      {
        name: 'timezone',
        message: 'What timezone do you want to use?',
        type,
        default: defaultTimezone,
        source: async (a: unknown, input: string) => {
          return allTimezones.filter(uncaseIncludes(input || guessTimezone));
        },
      },
    ];
  }
}

function required(name: string) {
  return (input: string) => {
    if (input) {
      return true;
    }
    return `A value is required for ${name}.`;
  };
}

function uncaseExact(substring: string) {
  const lower = substring.toLowerCase();
  return (item: string) => item.toLowerCase() === lower;
}

function uncaseIncludes(substring: string) {
  const lower = substring.toLowerCase();
  return (item: string) => item.toLowerCase().includes(lower);
}
