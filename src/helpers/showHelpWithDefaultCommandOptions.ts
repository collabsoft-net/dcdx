import { Command, Help } from 'commander';


export const showHelpWithDefaultCommandOptions: Partial<Help> = {
  visibleOptions: (cmd: Command) => {
    let options = cmd.options;
    if (!cmd.parent && options.length === 0) {
      const defaultCommandName = (cmd as unknown as Record<string, string>)._defaultCommandName;
      if (defaultCommandName) {
        const defaultCommand = cmd.commands.find(item => (item as unknown as Record<string, string>)._name === defaultCommandName);
        if (defaultCommand) {
          options = defaultCommand.options;
        }
      }
    }
    return Array.from(options);
  }
}