
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { WAMessage, WASocket } from '@whiskeysockets/baileys';

interface ViewOnceData {
  content: any;
  messageType: string;
  mediaType: string;
  data: any;
}

interface ViewOnceConfig {
  enabled: boolean;
  saveMedia: boolean;
  notifyOwner: boolean;
}

export class AntiViewOnceService {
  private configPath: string;
  private mediaDir: string;
  private processedMessages = new Set<string>();

  constructor(botId: string) {
    const dataDir = join(process.cwd(), 'data', 'antiviewonce');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    this.configPath = join(dataDir, `${botId}.json`);
    this.mediaDir = join(dataDir, 'media');
    
    if (!existsSync(this.mediaDir)) {
      mkdirSync(this.mediaDir, { recursive: true });
    }
    
    this.initializeConfig();
  }

  private initializeConfig(): void {
    if (!existsSync(this.configPath)) {
      const defaultConfig: ViewOnceConfig = {
        enabled: true,
        saveMedia: true,
        notifyOwner: true
      };
      writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
    }
  }

  private getConfig(): ViewOnceConfig {
    try {
      const configData = readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Error reading antiviewonce config:', error);
      return { enabled: true, saveMedia: true, notifyOwner: true };
    }
  }

  private saveConfig(config: ViewOnceConfig): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving antiviewonce config:', error);
    }
  }

  public isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  public setEnabled(enabled: boolean): void {
    const config = this.getConfig();
    config.enabled = enabled;
    this.saveConfig(config);
  }

  public async handleMessage(sock: WASocket, message: WAMessage): Promise<void> {
    try {
      console.log(`🔄 [AntiViewOnce] Starting handleMessage processing...`);
      console.log(`🔄 [AntiViewOnce] Service enabled: ${this.isEnabled()}`);
      
      if (!this.isEnabled()) {
        console.log(`❌ [AntiViewOnce] Service is disabled, skipping`);
        return;
      }

      const messageId = message.key.id;
      console.log(`🔄 [AntiViewOnce] Message ID: ${messageId}`);
      
      if (!messageId || this.processedMessages.has(messageId)) {
        console.log(`⚠️ [AntiViewOnce] Message already processed or no ID, skipping`);
        return;
      }

      this.processedMessages.add(messageId);
      console.log(`✅ [AntiViewOnce] Message marked as processing`);

      const viewOnceData = this.extractViewOnceFromMessage(message.message);
      if (!viewOnceData) {
        console.log(`❌ [AntiViewOnce] No ViewOnce data extracted from message`);
        return;
      }

      console.log(`🎯 [AntiViewOnce] ViewOnce data extracted:`, {
        messageType: viewOnceData.messageType,
        mediaType: viewOnceData.mediaType,
        hasData: !!viewOnceData.data,
        dataKeys: viewOnceData.data ? Object.keys(viewOnceData.data) : 'No data'
      });

      console.log(`🔍 [AntiViewOnce] *** PROCESSING VIEWONCE MESSAGE ***`);
      console.log(`📱 From: ${message.key.remoteJid}`);
      console.log(`👤 Sender: ${message.pushName || 'Unknown'}`);
      console.log(`🎭 Type: ${viewOnceData.messageType} (${viewOnceData.mediaType})`);

      // Attempt to download the media
      console.log(`⬇️ [AntiViewOnce] Starting download attempt...`);
      const buffer = await this.attemptDownload(viewOnceData, message);
      
      if (buffer && buffer.length > 0) {
        console.log(`✅ [AntiViewOnce] Download successful! Size: ${buffer.length} bytes`);
        
        // Save media if configured
        const config = this.getConfig();
        if (config.saveMedia) {
          console.log(`💾 [AntiViewOnce] Saving media to disk...`);
          await this.saveMedia(buffer, viewOnceData.mediaType, messageId);
        }

        // Send the intercepted content back to the chat
        console.log(`📤 [AntiViewOnce] Sending intercepted content...`);
        await this.sendInterceptedContent(sock, message, buffer, viewOnceData);
        console.log(`✅ [AntiViewOnce] Content sent successfully!`);
      } else {
        console.log(`❌ [AntiViewOnce] Download failed - sending detection notification only`);
        // Send detection notification even if download failed
        await this.sendDetectionNotification(sock, message, viewOnceData);
      }

    } catch (error) {
      console.error('❌ [AntiViewOnce] Error handling ViewOnce message:', error);
      console.error('❌ [AntiViewOnce] Error stack:', (error as Error).stack);
    }
  }

  private extractViewOnceFromMessage(message: any): ViewOnceData | null {
    if (!message) return null;

    console.log('📋 Analyzing message for ViewOnce content:', Object.keys(message));

    // Check for viewOnceMessage
    if (message.viewOnceMessage?.message) {
      const content = message.viewOnceMessage.message;
      const messageType = Object.keys(content)[0];
      console.log(`✅ Found viewOnceMessage with type: ${messageType}`);
      return {
        content,
        messageType,
        mediaType: this.getMediaType(messageType),
        data: content[messageType]
      };
    }

    // Check for viewOnceMessageV2
    if (message.viewOnceMessageV2?.message) {
      const content = message.viewOnceMessageV2.message;
      const messageType = Object.keys(content)[0];
      console.log(`✅ Found viewOnceMessageV2 with type: ${messageType}`);
      return {
        content,
        messageType,
        mediaType: this.getMediaType(messageType),
        data: content[messageType]
      };
    }

    // Check for viewOnceMessageV2Extension
    if (message.viewOnceMessageV2Extension?.message) {
      const content = message.viewOnceMessageV2Extension.message;
      const messageType = Object.keys(content)[0];
      console.log(`✅ Found viewOnceMessageV2Extension with type: ${messageType}`);
      return {
        content,
        messageType,
        mediaType: this.getMediaType(messageType),
        data: content[messageType]
      };
    }

    // Check for direct viewOnce properties in media messages
    if (message.imageMessage && message.imageMessage.viewOnce) {
      console.log(`✅ Found direct ViewOnce imageMessage`);
      return {
        content: message,
        messageType: 'imageMessage',
        mediaType: 'image',
        data: message.imageMessage
      };
    }

    if (message.videoMessage && message.videoMessage.viewOnce) {
      console.log(`✅ Found direct ViewOnce videoMessage`);
      return {
        content: message,
        messageType: 'videoMessage',
        mediaType: 'video',
        data: message.videoMessage
      };
    }

    if (message.audioMessage && message.audioMessage.viewOnce) {
      console.log(`✅ Found direct ViewOnce audioMessage`);
      return {
        content: message,
        messageType: 'audioMessage',
        mediaType: 'audio',
        data: message.audioMessage
      };
    }

    // Check for direct viewOnce properties in any message type
    for (const [key, value] of Object.entries(message)) {
      if (value && typeof value === 'object' && (value as any).viewOnce === true) {
        console.log(`✅ Found ViewOnce property in ${key}`);
        return {
          content: message,
          messageType: key,
          mediaType: this.getMediaType(key),
          data: value
        };
      }
    }

    console.log('❌ No ViewOnce content found in message');
    return null;
  }

  private getMediaType(messageType: string): string {
    if (messageType.includes('image')) return 'image';
    if (messageType.includes('video')) return 'video';
    if (messageType.includes('audio')) return 'audio';
    if (messageType.includes('document')) return 'document';
    return 'unknown';
  }

  private async attemptDownload(viewOnceData: ViewOnceData, message: WAMessage): Promise<Buffer | null> {
    const downloadMethods = [
      // Method 1: Download from data object directly
      async (): Promise<Buffer | null> => {
        if (!viewOnceData.data) return null;
        console.log(`🔄 Method 1: Downloading from data object (${viewOnceData.mediaType})`);
        const stream = await downloadContentFromMessage(viewOnceData.data, viewOnceData.mediaType as any);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer.length > 0 ? buffer : null;
      },

      // Method 2: Download from wrapped viewOnce message
      async (): Promise<Buffer | null> => {
        if (!message.message?.viewOnceMessage?.message) return null;
        const innerMessage = message.message.viewOnceMessage.message;
        const messageType = Object.keys(innerMessage)[0];
        const mediaData = innerMessage[messageType];
        console.log(`🔄 Method 2: Downloading from viewOnceMessage.${messageType}`);
        const stream = await downloadContentFromMessage(mediaData, this.getMediaType(messageType) as any);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer.length > 0 ? buffer : null;
      },

      // Method 3: Download from viewOnceMessageV2
      async (): Promise<Buffer | null> => {
        if (!message.message?.viewOnceMessageV2?.message) return null;
        const innerMessage = message.message.viewOnceMessageV2.message;
        const messageType = Object.keys(innerMessage)[0];
        const mediaData = innerMessage[messageType];
        console.log(`🔄 Method 3: Downloading from viewOnceMessageV2.${messageType}`);
        const stream = await downloadContentFromMessage(mediaData, this.getMediaType(messageType) as any);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer.length > 0 ? buffer : null;
      },

      // Method 4: Direct media message download
      async (): Promise<Buffer | null> => {
        const msg = message.message;
        if (!msg) return null;
        
        let mediaData = null;
        let mediaType = '';
        
        if (msg.imageMessage?.viewOnce) {
          mediaData = msg.imageMessage;
          mediaType = 'image';
        } else if (msg.videoMessage?.viewOnce) {
          mediaData = msg.videoMessage;
          mediaType = 'video';
        } else if (msg.audioMessage?.viewOnce) {
          mediaData = msg.audioMessage;
          mediaType = 'audio';
        }
        
        if (!mediaData) return null;
        
        console.log(`🔄 Method 4: Downloading direct ${mediaType} message`);
        const stream = await downloadContentFromMessage(mediaData, mediaType as any);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer.length > 0 ? buffer : null;
      },

      // Method 5: Try with entire message object
      async (): Promise<Buffer | null> => {
        if (!message.message) return null;
        console.log(`🔄 Method 5: Downloading from entire message (${viewOnceData.mediaType})`);
        const stream = await downloadContentFromMessage(message.message, viewOnceData.mediaType as any);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer.length > 0 ? buffer : null;
      }
    ];

    for (let i = 0; i < downloadMethods.length; i++) {
      try {
        const result = await downloadMethods[i]();
        if (result && result.length > 0) {
          console.log(`✅ Download successful with method ${i + 1} (${result.length} bytes)`);
          return result;
        } else {
          console.log(`⚠️ Method ${i + 1} returned empty buffer`);
        }
      } catch (error) {
        console.log(`❌ Download method ${i + 1} failed:`, (error as Error).message);
      }
    }

    console.log('❌ All download methods failed');
    return null;
  }

  private async saveMedia(buffer: Buffer, mediaType: string, messageId: string): Promise<void> {
    try {
      const extension = this.getFileExtension(mediaType);
      const filename = `viewonce_${messageId}.${extension}`;
      const filepath = join(this.mediaDir, filename);
      
      writeFileSync(filepath, buffer);
      console.log(`💾 ViewOnce media saved: ${filename}`);
    } catch (error) {
      console.error('Error saving ViewOnce media:', error);
    }
  }

  private getFileExtension(mediaType: string): string {
    switch (mediaType) {
      case 'image': return 'jpg';
      case 'video': return 'mp4';
      case 'audio': return 'ogg';
      case 'document': return 'bin';
      default: return 'dat';
    }
  }

  private async sendInterceptedContent(sock: WASocket, originalMessage: WAMessage, buffer: Buffer, viewOnceData: ViewOnceData): Promise<void> {
    try {
      const originalChatId = originalMessage.key.remoteJid;
      if (!originalChatId) return;

      // Get bot owner's number (the bot's own number)
      const botOwnerJid = sock.user?.id;
      if (!botOwnerJid) {
        console.log('❌ Bot owner JID not found, cannot send ViewOnce content');
        return;
      }

      // Send to bot owner
      const caption = `🔍 *Anti-ViewOnce Intercepted* 🔍\n\n📱 ViewOnce message captured!\n👤 From: ${originalMessage.pushName || 'Unknown'}\n📞 Number: ${originalMessage.key.participant || originalMessage.key.remoteJid}\n💬 Chat: ${originalChatId}\n⏰ Time: ${new Date().toLocaleString()}\n📝 Original Caption: ${viewOnceData.data?.caption || 'No caption'}\n\n🛡️ This message was automatically intercepted and saved by Anti-ViewOnce.`;

      const messageOptions = {};

      switch (viewOnceData.mediaType) {
        case 'image':
          await sock.sendMessage(botOwnerJid, {
            image: buffer,
            caption,
            mimetype: viewOnceData.data?.mimetype || 'image/jpeg'
          }, messageOptions);
          break;

        case 'video':
          await sock.sendMessage(botOwnerJid, {
            video: buffer,
            caption,
            mimetype: viewOnceData.data?.mimetype || 'video/mp4'
          }, messageOptions);
          break;

        case 'audio':
          await sock.sendMessage(botOwnerJid, {
            audio: buffer,
            ptt: viewOnceData.data?.ptt || false,
            mimetype: viewOnceData.data?.mimetype || 'audio/ogg; codecs=opus'
          }, messageOptions);
          
          // Also send a text message with details for audio
          await sock.sendMessage(botOwnerJid, {
            text: `🎵 *Audio ViewOnce Intercepted*\n\n${caption}`
          }, messageOptions);
          break;

        default:
          await sock.sendMessage(botOwnerJid, {
            document: buffer,
            fileName: `viewonce_intercepted.${this.getFileExtension(viewOnceData.mediaType)}`,
            caption
          }, messageOptions);
          break;
      }

      console.log(`✅ ViewOnce content sent to bot owner: ${botOwnerJid}`);

      // Also send a notification to the original chat that the ViewOnce was intercepted
      await sock.sendMessage(originalChatId, {
        text: `🔍 *ViewOnce Detected* 🔍\n\n⚠️ A ViewOnce message was detected and automatically saved.\n👤 From: ${originalMessage.pushName || 'Unknown'}\n⏰ Time: ${new Date().toLocaleString()}\n\n💡 ViewOnce messages are automatically intercepted and saved by Anti-ViewOnce protection.`
      }, { quoted: originalMessage });

    } catch (error) {
      console.error('Error sending intercepted content:', error);
    }
  }

  private async sendDetectionNotification(sock: WASocket, originalMessage: WAMessage, viewOnceData: ViewOnceData): Promise<void> {
    try {
      const originalChatId = originalMessage.key.remoteJid;
      if (!originalChatId) return;

      // Get bot owner's number
      const botOwnerJid = sock.user?.id;

      const message = `🔍 *Anti-ViewOnce Detection* 🔍\n\n⚠️ ViewOnce message detected but content could not be retrieved\n\n📱 Type: ${viewOnceData.messageType}\n🎭 Media: ${viewOnceData.mediaType}\n👤 From: ${originalMessage.pushName || 'Unknown'}\n📞 Number: ${originalMessage.key.participant || originalMessage.key.remoteJid}\n💬 Chat: ${originalChatId}\n⏰ Time: ${new Date().toLocaleString()}\n\n💡 The message was already processed or encrypted before interception.`;

      // Send to bot owner if available
      if (botOwnerJid) {
        await sock.sendMessage(botOwnerJid, { text: message });
        console.log(`📢 ViewOnce detection notification sent to bot owner: ${botOwnerJid}`);
      }

      // Also notify the original chat
      await sock.sendMessage(originalChatId, { 
        text: `🔍 *ViewOnce Detected* 🔍\n\n⚠️ A ViewOnce message was detected but could not be intercepted.\n👤 From: ${originalMessage.pushName || 'Unknown'}\n⏰ Time: ${new Date().toLocaleString()}`
      }, { quoted: originalMessage });

      console.log(`📢 ViewOnce detection notification sent to original chat: ${originalChatId}`);
    } catch (error) {
      console.error('Error sending detection notification:', error);
    }
  }

  public getStatusMessage(): string {
    const config = this.getConfig();
    const status = config.enabled ? 'enabled' : 'disabled';
    const saveStatus = config.saveMedia ? 'enabled' : 'disabled';
    
    return `🔍 *Anti-ViewOnce Settings*\n\n👁️ *Status:* ${status}\n💾 *Save Media:* ${saveStatus}\n\n*Commands:*\n.antiviewonce on - Enable anti-viewonce\n.antiviewonce off - Disable anti-viewonce\n.antiviewonce save on - Enable media saving\n.antiviewonce save off - Disable media saving`;
  }
}

// Export singleton-style factory
const antiViewOnceInstances = new Map<string, AntiViewOnceService>();

export const getAntiViewOnceService = (botId: string): AntiViewOnceService => {
  if (!antiViewOnceInstances.has(botId)) {
    antiViewOnceInstances.set(botId, new AntiViewOnceService(botId));
  }
  return antiViewOnceInstances.get(botId)!;
};
