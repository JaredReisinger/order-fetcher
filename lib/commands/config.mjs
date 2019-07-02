import fs from 'fs';
import util from 'util';

import chalk from 'chalk';
import moment from 'moment-timezone';
import inquirer from 'inquirer';
import PromptBase from 'inquirer/lib/prompts/base';
import autocomplete from 'inquirer-autocomplete-prompt';

import * as helpers from '../helpers';

const writeFileAsync = util.promisify(fs.writeFile);

inquirer.registerPrompt('autocomplete', autocomplete);

class NopPrompt extends PromptBase {
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  _run(callback) {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    callback(this.opt.filter(this.opt.default));
  }
}

inquirer.registerPrompt('nop', NopPrompt);

export default class Config {
  constructor(cfg, handleGlobalOpts) {
    this.cfg = cfg;
    this.handleGlobalOpts = handleGlobalOpts;
  }

  async createCommands() {
    return [
      {
        command: 'config',
        describe: 'help manage the .order-fetcher.json configuration',
        builder: yargs => {
          yargs.command({
            command: 'view',
            describe: 'view the current configuration',
            handler: this.view.bind(this),
          });

          yargs.command({
            command: 'init',
            describe: 'create or overwrite the configuration',
            handler: this.init.bind(this),
          });

          yargs.command({
            command: 'add [host]',
            describe: 'add a new host to the configuration',
            handler: this.add.bind(this),
          });

          yargs.command({
            command: 'remove [host]',
            describe: 'remove a host from the configuration',
            handler: this.remove.bind(this),
          });

          yargs.command({
            command: 'timezone [zone]',
            aliases: ['tz'],
            describe: 'set the timezone in the configuration',
            handler: this.timezone.bind(this),
          });
        },
      },
    ];
  }

  async view() {
    if (this.cfg._missing) {
      helpers.out('no configuration', chalk.yellow);
      return;
    }

    helpers.out(chalk`
timezone: {cyan ${!this.cfg.timezone ||
      chalk`{yellow (none configured, using ${moment.tz.guess()})}`}}

{gray hosts}${Object.entries(this.cfg.hosts)
      .map(
        ([name, host]) => chalk`
  {cyan ${name}}
    url   : {cyan.underline ${host.url}}
    key   : {gray ${host.key}}
    secret: {gray ${host.secret}}`
      )
      .join('')}
`);
  }

  async init() {
    if (!this.cfg._missing) {
      const answers = await inquirer.prompt([
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

    const questions = [];

    questions.push(...Config.hostQuestions());
    questions.push(...Config.timezoneQuestions());

    const answers = await inquirer.prompt(questions);

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

  async add(argv) {
    const { host } = await inquirer.prompt(Config.hostQuestions(argv.host));
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

  async remove(argv) {
    const { host } = argv;
    if (!this.cfg.hosts[host]) {
      const hosts = `"${Object.keys(this.cfg.hosts).join('", "')}"`;
      throw new helpers.UserError(
        `host "${host}" not found in configuration; try one of: ${hosts}`
      );
    }

    const cfg = { ...this.cfg };
    delete cfg.hosts[host];
    this.writeConfig(cfg);
  }

  async timezone(argv) {
    const { timezone } = await inquirer.prompt(
      Config.timezoneQuestions(argv.zone)
    );

    const cfg = {
      ...this.cfg,
      timezone,
    };

    this.writeConfig(cfg);
  }

  // eslint-disable-next-line class-methods-use-this
  async writeConfig(cfg) {
    const toWrite = { ...cfg }; // shallow copy
    delete toWrite._missing;
    delete toWrite._filename;

    const formatted = JSON.stringify(toWrite, null, '  ');
    // helpers.out(`writing to "${cfg._filename}"...\n---\n${formatted}\n---`);
    helpers.out(`writing to "${cfg._filename}"...`);
    await writeFileAsync(cfg._filename, formatted, 'utf8');
  }

  // eslint-disable-next-line class-methods-use-this
  static hostQuestions(hostName) {
    return [
      {
        name: 'host.name',
        message: 'What is the nickname for your WooCommerce site?',
        type: hostName ? 'nop' : 'input',
        default: hostName,
        validate: name =>
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

  static timezoneQuestions(zone) {
    const allTimezones = moment.tz.names();
    const guessTimezone = moment.tz.guess();

    let type = 'autocomplete';
    let defaultTimezone = zone;
    if (zone) {
      const filtered = allTimezones.filter(uncaseFilter(zone));
      if (filtered.length === 1) {
        type = 'nop';
        [defaultTimezone] = filtered;
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
        source: async (a, input) => {
          return allTimezones.filter(uncaseFilter(input || guessTimezone));
        },
      },
    ];
  }
}

function required(name) {
  return input => {
    if (input) {
      return true;
    }
    return `A value is required for ${name}.`;
  };
}

function uncaseFilter(substring) {
  const lower = substring.toLowerCase();
  return item => item.toLowerCase().includes(lower);
}
