import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { storage } from '../storage.js';
import type { BotInstance } from '@shared/schema';

// Types
interface StoredMessage {
  content: string;
  mediaType: string;
  mediaPath: string;
  sender: string;
  group: string | null;
  timestamp: string;
}

interface AntideleteConfig {
  enabled: boolean;
}

// Storage paths
const TEMP_MEDIA_DIR = path.join(process.cwd(), 'server/tmp');

// In-memory message store
const messageStore = new Map<string, StoredMessage>();

// Ensure temp directory exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Utility functions
export const getFolderSizeInMB = (folderPath: string): number => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024); // Convert bytes to MB
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

export const cleanTempFolderIfLarge = (): void => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 100) { // Clean if larger than 100MB
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log(`🧹 Cleaned temp folder (was ${sizeMB.toFixed(2)}MB)`);
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Config management - now uses database
export const loadAntideleteConfig = async (botInstanceId: string): Promise<AntideleteConfig> => {
    try {
        const botInstance = await storage.getBotInstance(botInstanceId);
        if (!botInstance) {
            return { enabled: false };
        }
        
        const settings = botInstance.settings as any || {};
        return { enabled: settings.antideleteEnabled || false };
    } catch (error) {
        console.error('Error loading antidelete config:', error);
        return { enabled: false };
    }
};

export const saveAntideleteConfig = async (botInstanceId: string, config: AntideleteConfig): Promise<void> => {
    try {
        const botInstance = await storage.getBotInstance(botInstanceId);
        if (!botInstance) {
            throw new Error('Bot instance not found');
        }
        
        const currentSettings = (botInstance.settings as any) || {};
        const updatedSettings = {
            ...currentSettings,
            antideleteEnabled: config.enabled
        };
        
        await storage.updateBotInstance(botInstanceId, {
            settings: updatedSettings
        });
    } catch (err) {
        console.error('Config save error:', err);
        throw err;
    }
};

// Message storage
export const storeMessage = async (message: any, botInstanceId: string): Promise<void> => {
    try {
        const config = await loadAntideleteConfig(botInstanceId);
        if (!config.enabled) return; // Don't store if antidelete is disabled

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';

        const sender = message.key.participant || message.key.remoteJid;

        // Detect content type
        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            try {
                const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                
                // Convert buffer to Uint8Array for writeFile
                const chunks: Buffer[] = [];
                for await (const chunk of buffer) {
                    chunks.push(chunk);
                }
                await writeFile(mediaPath, Buffer.concat(chunks));
            } catch (mediaError) {
                console.error('Error downloading image:', mediaError);
            }
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            try {
                const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
                
                const chunks: Buffer[] = [];
                for await (const chunk of buffer) {
                    chunks.push(chunk);
                }
                await writeFile(mediaPath, Buffer.concat(chunks));
            } catch (mediaError) {
                console.error('Error downloading sticker:', mediaError);
            }
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            try {
                const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                
                const chunks: Buffer[] = [];
                for await (const chunk of buffer) {
                    chunks.push(chunk);
                }
                await writeFile(mediaPath, Buffer.concat(chunks));
            } catch (mediaError) {
                console.error('Error downloading video:', mediaError);
            }
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('storeMessage error:', err);
    }
};

// Message deletion handler
export const handleMessageRevocation = async (sock: any, revocationMessage: any, botInstanceId: string): Promise<void> => {
    try {
        const config = await loadAntideleteConfig(botInstanceId);
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // Don't report if deleted by bot owner
        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        let groupName = '';

        // Get group name if it's a group message
        if (original.group) {
            try {
                const groupMetadata = await sock.groupMetadata(original.group);
                groupName = groupMetadata.subject;
            } catch (error) {
                console.error('Error getting group metadata:', error);
                groupName = 'Unknown Group';
            }
        }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Africa/Nairobi', // Using East Africa Time as per bot theme
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        let text = `*🔰 ANTIDELETE REPORT 🔰*\n\n` +
            `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
            `*👤 Sender:* @${senderName}\n` +
            `*📱 Number:* ${sender}\n` +
            `*🕒 Time:* ${time}\n`;

        if (groupName) {
            text += `*👥 Group:* ${groupName}\n`;
        }

        if (original.content) {
            text += `\n*💬 Deleted Message:*\n${original.content}`;
        }

        // Send the report to bot owner
        await sock.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        // Handle media if present
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `*Deleted ${original.mediaType}*\nFrom: @${senderName}`,
                mentions: [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                }
            } catch (err) {
                await sock.sendMessage(ownerNumber, {
                    text: `⚠️ Error sending media: ${err instanceof Error ? err.message : 'Unknown error'}`
                });
            }

            // Clean up the media file
            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {
                console.error('Media cleanup error:', err);
            }
        }

        // Remove from store
        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
};

// Start periodic cleanup (every 1 minute)
setInterval(cleanTempFolderIfLarge, 60 * 1000);

console.log('✅ Antidelete service initialized');