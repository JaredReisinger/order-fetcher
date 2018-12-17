import chalk from 'chalk';

export function addCommand(commander /* , cfg */) {
  commander.command('config').action(() => {
    console.log(chalk.cyan('TODO!'));
  });
}
