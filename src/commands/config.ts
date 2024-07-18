import fs from 'fs';
import util from 'util';

import { ArgumentsCamelCase, CommandModule } from 'yargs';
import chalk from 'chalk';
import chalkTemplate from 'chalk-template';
import moment from 'moment-timezone';
import { confirm, input, select } from '@inquirer/prompts';
import { Context } from '@inquirer/type';

import * as helpers from '../helpers.js';

const writeFileAsync = util.promisify(fs.writeFile);

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

export interface Args {
  host?: string;
  zone?: string;
}

export type OptsHandler = (_: ArgumentsCamelCase<Args>) => void;

export default class Config {
  cfg: ConfigFile;
  handleGlobalOpts: OptsHandler;

  constructor(cfg: ConfigFile, handleGlobalOpts: OptsHandler) {
    this.cfg = cfg;
    this.handleGlobalOpts = handleGlobalOpts;
  }

  async createCommands(): Promise<CommandModule<Args, Args>[]> {
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
timezone: ${
      this.cfg.timezone
        ? chalk.cyan(this.cfg.timezone)
        : chalk.yellow(`(none configured, using ${moment.tz.guess()})`)
    }

hosts:${Object.entries(this.cfg.hosts)
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

  async init(argv?: ArgumentsCamelCase<Args>, context?: Context) {
    if (!this.cfg._missing) {
      const overwrite = await confirm(
        {
          message: 'Do you want to overwrite the existing configuration?',
          default: false,
        },
        context
      );

      if (!overwrite) {
        // bail now!
        helpers.out(
          '\nTry "orders config add" or "orders config tz" to update the configuration.',
          chalk.cyan
        );
        return;
      }
    }

    const host = await Config.hostQuestions(undefined, context);
    const timezone = await Config.timezoneQuestions(undefined, context);

    const { name, url, key, secret } = host;
    const cfg = {
      timezone,
      hosts: {
        [name]: { url, key, secret },
      },
    };

    this.writeConfig(cfg);
  }

  async add(argv?: ArgumentsCamelCase<Args>, context?: Context) {
    const host = await Config.hostQuestions(argv?.host, context);
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

  async remove(argv: ArgumentsCamelCase<Args>) {
    const { host } = argv;

    if (!host || !this.cfg.hosts[host]) {
      const hosts = `"${Object.keys(this.cfg.hosts).join('", "')}"`;
      throw new helpers.UserError(
        `host "${host}" not found in configuration; try one of: ${hosts}`
      );
    }

    const cfg = { ...this.cfg };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete cfg.hosts[host];
    this.writeConfig(cfg);
  }

  async timezone(argv?: ArgumentsCamelCase<Args>, context?: Context) {
    const timezone = await Config.timezoneQuestions(argv?.zone, context);

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

  static async hostQuestions(hostName?: string, context?: Context) {
    let name = hostName;
    if (!name) {
      name = await input(
        {
          message: 'What is the nickname for your WooCommerce site?',
          default: name,
          required: true,
          // validate: (name: string) =>
          //   name && name.length > 0
          //     ? true
          //     : 'Please provide a name, it will be used as a convenient subcommand.',
        },
        context
      );
    }

    const secure = await confirm(
      {
        message: `Is the site for ${name} secure (uses https)?`,
        default: true,
      },
      context
    );

    const url = await input(
      {
        message: `What is the URL for ${name}?`,
        transformer: (input /*, { isFinal }*/) => {
          return `http${secure ? 's' : ''}://${input || `${name}.com`}`;
        },
      },
      context
    );

    const key = await input(
      {
        message: `What is the WooCommerce key for ${name}?\n(Visit ${chalk.blue(
          `${url}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
        )} to create a key, only Read permission is needed.)\n?`,
        // required: true,
        validate: required('the WooCommerce key'),
      },
      context
    );

    const secret = await input(
      {
        message: `What is the WooCommerce secret for ${name}?`,
        validate: required('the WooCommerce secret'),
      },
      context
    );

    return {
      name,
      secure,
      url,
      key,
      secret,
    };
  }

  static async timezoneQuestions(zone?: string, context?: Context) {
    // TODO: switch to Luxon?
    const allTimezones = moment.tz.names();
    const guessTimezone = moment.tz.guess();

    // The previous implementation used a community "autocomplete" prompt, but
    // it hasn't been updated to the new inquirer API.  We'll use a simple
    // select prompt for the moment.
    const exact = zone && allTimezones.find(uncaseExact(zone));
    const filtered = zone && allTimezones.filter(uncaseIncludes(zone));

    let timezone: string;

    if (exact) {
      timezone = exact;
    } else if (filtered?.length === 1) {
      timezone = filtered[0];
    } else {
      timezone = await select(
        {
          message: 'What timezone do you want to use?',
          choices: allTimezones.map((tz) => ({ value: tz })),
          default: zone || guessTimezone,
        },
        context
      );
    }

    return timezone;
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
