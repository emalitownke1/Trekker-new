import { commandRegistry, type BotCommand, type CommandContext } from './command-registry';
import { handleAntideleteCommand } from './antidelete-service';

// Register the antidelete command
const antideleteCommand: BotCommand = {
  name: 'antidelete',
  aliases: ['ad', 'anti'],
  description: 'Detects and reports deleted messages with media backup. Usage: .antidelete [on/off]',
  category: 'Moderation',
  handler: async (context: CommandContext) => {
    const { message, client, from, args } = context;
    const match = args[0]; // 'on', 'off', or undefined
    
    await handleAntideleteCommand(client, from, message, match);
  }
};

// Register the command
commandRegistry.register(antideleteCommand);

export { antideleteCommand };