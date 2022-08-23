import Config, { ConfigFile, OptsHandler } from './config.js';
import Get from './get.js';

export async function createCommands(
  cfg: ConfigFile,
  handleGlobalOpts: OptsHandler
) {
  const config = new Config(cfg, handleGlobalOpts);
  const get = new Get(cfg, handleGlobalOpts);

  // each createCommands() call must be awaited, and then flattened into the
  // final list of commands
  const commands = (
    await Promise.all([config.createCommands(), get.createCommands()])
  ).reduce((memo, cmds) => {
    memo.push(...cmds);
    return memo;
  }, []);

  return commands;
}
