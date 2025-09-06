import { storage } from '../storage';
import type { BotInstance } from '@shared/schema';
import { proto } from '@whiskeysockets/baileys';
import type { WAProto } from '@whiskeysockets/baileys';

interface AutoviewConfig {
  enabled: boolean;
  reactOn: boolean;
}

interface ChannelInfo {
  contextInfo: {
    forwardingScore: number;
    isForwarded: boolean;
    forwardedNewsletterMessageInfo: {
      newsletterJid: string;
      newsletterName: string;
      serverMessageId: number;
    };
  };
}

const channelInfo: ChannelInfo = {
  contextInfo: {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363161513685998@newsletter',
      newsletterName: 'KnightBot MD',
      serverMessageId: -1
    }
  }
};

export class AutoviewService {
  private botInstance: BotInstance;

  constructor(botInstance: BotInstance) {
    this.botInstance = botInstance;
  }

  // Get current autoview configuration
  private getAutoviewConfig(): AutoviewConfig {
    try {
      if (this.botInstance.autoview && typeof this.botInstance.autoview === 'object') {
        const config = this.botInstance.autoview as any;
        return {
          enabled: config.enabled || false,
          reactOn: config.reactOn || false
        };
      }
    } catch (error) {
      console.error('Error reading autoview config:', error);
    }
    
    return { enabled: false, reactOn: false };
  }

  // Update autoview configuration
  private async updateAutoviewConfig(config: Partial<AutoviewConfig>): Promise<void> {
    try {
      const currentConfig = this.getAutoviewConfig();
      const newConfig = { ...currentConfig, ...config };
      
      await storage.updateBotInstance(this.botInstance.id, {
        autoview: newConfig
      });
      
      // Update local instance
      this.botInstance.autoview = newConfig;
      
      console.log(`Bot ${this.botInstance.name}: Autoview config updated`, newConfig);
    } catch (error) {
      console.error('Error updating autoview config:', error);
      throw error;
    }
  }

  // Handle autoview command
  async handleAutoviewCommand(sock: any, chatId: string, msg: WAProto.IWebMessageInfo, args: string[]): Promise<void> {
    try {
      // Check if sender is owner (bot owner or from the bot itself)
      if (!msg.key?.fromMe) {
        await sock.sendMessage(chatId, { 
          text: '❌ This command can only be used by the owner!',
          ...channelInfo
        });
        return;
      }

      const config = this.getAutoviewConfig();

      // If no arguments, show current status
      if (!args || args.length === 0) {
        const status = config.enabled ? 'enabled' : 'disabled';
        const reactStatus = config.reactOn ? 'enabled' : 'disabled';
        
        await sock.sendMessage(chatId, { 
          text: `🔄 *Auto Status Settings*\n\n📱 *Auto Status View:* ${status}\n💫 *Status Reactions:* ${reactStatus}\n\n*Commands:*\n.autoview on - Enable auto status view\n.autoview off - Disable auto status view\n.autoview react on - Enable status reactions\n.autoview react off - Disable status reactions`,
          ...channelInfo
        });
        return;
      }

      // Handle on/off commands
      const command = args[0].toLowerCase();
      
      if (command === 'on') {
        await this.updateAutoviewConfig({ enabled: true });
        await sock.sendMessage(chatId, { 
          text: '✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.',
          ...channelInfo
        });
        
        await storage.createActivity({
          botInstanceId: this.botInstance.id,
          type: 'autoview_enabled',
          description: 'Auto status view enabled'
        });
        
      } else if (command === 'off') {
        await this.updateAutoviewConfig({ enabled: false });
        await sock.sendMessage(chatId, { 
          text: '❌ Auto status view has been disabled!\nBot will no longer automatically view statuses.',
          ...channelInfo
        });
        
        await storage.createActivity({
          botInstanceId: this.botInstance.id,
          type: 'autoview_disabled',
          description: 'Auto status view disabled'
        });
        
      } else if (command === 'react') {
        // Handle react subcommand
        if (!args[1]) {
          await sock.sendMessage(chatId, { 
            text: '❌ Please specify on/off for reactions!\nUse: .autoview react on/off',
            ...channelInfo
          });
          return;
        }
        
        const reactCommand = args[1].toLowerCase();
        if (reactCommand === 'on') {
          await this.updateAutoviewConfig({ reactOn: true });
          await sock.sendMessage(chatId, { 
            text: '💫 Status reactions have been enabled!\nBot will now react to status updates.',
            ...channelInfo
          });
          
          await storage.createActivity({
            botInstanceId: this.botInstance.id,
            type: 'autoview_reactions_enabled',
            description: 'Auto status reactions enabled'
          });
          
        } else if (reactCommand === 'off') {
          await this.updateAutoviewConfig({ reactOn: false });
          await sock.sendMessage(chatId, { 
            text: '❌ Status reactions have been disabled!\nBot will no longer react to status updates.',
            ...channelInfo
          });
          
          await storage.createActivity({
            botInstanceId: this.botInstance.id,
            type: 'autoview_reactions_disabled',
            description: 'Auto status reactions disabled'
          });
          
        } else {
          await sock.sendMessage(chatId, { 
            text: '❌ Invalid reaction command! Use: .autoview react on/off',
            ...channelInfo
          });
        }
      } else {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid command! Use:\n.autoview on/off - Enable/disable auto status view\n.autoview react on/off - Enable/disable status reactions',
          ...channelInfo
        });
      }

    } catch (error) {
      console.error('Error in autoview command:', error);
      await sock.sendMessage(chatId, { 
        text: '❌ Error occurred while managing auto status!\n' + (error as Error).message,
        ...channelInfo
      });
    }
  }

  // Check if auto status viewing is enabled
  isAutoStatusEnabled(): boolean {
    const config = this.getAutoviewConfig();
    return config.enabled;
  }

  // Check if status reactions are enabled
  isStatusReactionEnabled(): boolean {
    const config = this.getAutoviewConfig();
    return config.reactOn;
  }

  // React to status using proper method
  async reactToStatus(sock: any, statusKey: any): Promise<void> {
    try {
      if (!this.isStatusReactionEnabled()) {
        return;
      }

      // Use the proper relayMessage method for status reactions
      await sock.relayMessage(
        'status@broadcast',
        {
          reactionMessage: {
            key: {
              remoteJid: 'status@broadcast',
              id: statusKey.id,
              participant: statusKey.participant || statusKey.remoteJid,
              fromMe: false
            },
            text: '💚'
          }
        },
        {
          messageId: statusKey.id,
          statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
        }
      );
      
      // Log activity
      await storage.createActivity({
        botInstanceId: this.botInstance.id,
        type: 'status_reaction',
        description: `Reacted to status from ${statusKey.participant || statusKey.remoteJid}`,
        metadata: { statusId: statusKey.id }
      });
      
    } catch (error) {
      console.error('❌ Error reacting to status:', (error as Error).message);
    }
  }

  // Handle status updates
  async handleStatusUpdate(sock: any, status: any): Promise<void> {
    try {
      if (!this.isAutoStatusEnabled()) {
        return;
      }

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Handle status from messages.upsert
      if (status.messages && status.messages.length > 0) {
        const msg = status.messages[0];
        if (msg.key && msg.key.remoteJid === 'status@broadcast') {
          try {
            await sock.readMessages([msg.key]);
            const sender = msg.key.participant || msg.key.remoteJid;
            
            // React to status if enabled
            await this.reactToStatus(sock, msg.key);
            
            // Log activity
            await storage.createActivity({
              botInstanceId: this.botInstance.id,
              type: 'status_viewed',
              description: `Viewed status from ${sender}`,
              metadata: { statusId: msg.key.id, sender }
            });
            
          } catch (err: any) {
            if (err.message?.includes('rate-overlimit')) {
              console.log('⚠️ Rate limit hit, waiting before retrying...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              await sock.readMessages([msg.key]);
            } else {
              throw err;
            }
          }
          return;
        }
      }

      // Handle direct status updates
      if (status.key && status.key.remoteJid === 'status@broadcast') {
        try {
          await sock.readMessages([status.key]);
          const sender = status.key.participant || status.key.remoteJid;
          
          // React to status if enabled
          await this.reactToStatus(sock, status.key);
          
          // Log activity
          await storage.createActivity({
            botInstanceId: this.botInstance.id,
            type: 'status_viewed',
            description: `Viewed status from ${sender}`,
            metadata: { statusId: status.key.id, sender }
          });
          
        } catch (err: any) {
          if (err.message?.includes('rate-overlimit')) {
            console.log('⚠️ Rate limit hit, waiting before retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sock.readMessages([status.key]);
          } else {
            throw err;
          }
        }
        return;
      }

      // Handle status in reactions
      if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
        try {
          await sock.readMessages([status.reaction.key]);
          const sender = status.reaction.key.participant || status.reaction.key.remoteJid;
          
          // React to status if enabled
          await this.reactToStatus(sock, status.reaction.key);
          
          // Log activity
          await storage.createActivity({
            botInstanceId: this.botInstance.id,
            type: 'status_viewed',
            description: `Viewed status from ${sender}`,
            metadata: { statusId: status.reaction.key.id, sender }
          });
          
        } catch (err: any) {
          if (err.message?.includes('rate-overlimit')) {
            console.log('⚠️ Rate limit hit, waiting before retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await sock.readMessages([status.reaction.key]);
          } else {
            throw err;
          }
        }
        return;
      }

    } catch (error) {
      console.error('❌ Error in auto status view:', (error as Error).message);
    }
  }
}