import chalk from 'chalk';

export function addCommand(commander /* , cfg */) {
  commander.command('init').action(() => {
    console.log(chalk.cyan('TODO!'));
  });
}
