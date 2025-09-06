import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';
import type { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath: string): number => {
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

// Function to clean temp folder if size exceeds 100MB
const cleanTempFolderIfLarge = (): void => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 100) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log(`🧹 Cleaned temp folder: ${sizeMB.toFixed(2)}MB removed`);
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Start periodic cleanup check every 1 minute
setInterval(cleanTempFolderIfLarge, 60 * 1000);

interface AntideleteConfig {
    enabled: boolean;
}

// Load config
function loadAntideleteConfig(): AntideleteConfig {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: true }; // Default enabled
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        return { enabled: true }; // Default enabled
    }
}

// Save config
function saveAntideleteConfig(config: AntideleteConfig): void {
    try {
        const dataDir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

// Command Handler
export async function handleAntideleteCommand(sock: WASocket, chatId: string, message: WAMessage, match?: string): Promise<void> {
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '*Only the bot owner can use this command.*' });
        return;
    }

    const config = loadAntideleteConfig();

    if (!match) {
        await sock.sendMessage(chatId, {
            text: `*ANTIDELETE SETUP*\n\nCurrent Status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*.antidelete on* - Enable\n*.antidelete off* - Disable`
        });
        return;
    }

    if (match === 'on') {
        config.enabled = true;
    } else if (match === 'off') {
        config.enabled = false;
    } else {
        await sock.sendMessage(chatId, { text: '*Invalid command. Use .antidelete to see usage.*' });
        return;
    }

    saveAntideleteConfig(config);
    await sock.sendMessage(chatId, { text: `*Antidelete ${match === 'on' ? 'enabled' : 'disabled'}*` });
}

// Store incoming messages
export async function storeMessage(message: WAMessage): Promise<void> {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return; // Don't store if antidelete is disabled

        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';

        const sender = message.key.participant || message.key.remoteJid;

        // Detect content
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
                await writeFile(mediaPath, Buffer.from(await streamToBuffer(buffer)));
            } catch (err) {
                console.error('Image download error:', err);
            }
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            try {
                const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
                await writeFile(mediaPath, Buffer.from(await streamToBuffer(buffer)));
            } catch (err) {
                console.error('Sticker download error:', err);
            }
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            try {
                const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, Buffer.from(await streamToBuffer(buffer)));
            } catch (err) {
                console.error('Video download error:', err);
            }
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            group: message.key.remoteJid?.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

// Handle message deletion
export async function handleMessageRevocation(sock: WASocket, revocationMessage: WAMessage): Promise<void> {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message?.protocolMessage?.key?.id;
        if (!messageId) return;

        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = sock.user?.id.split(':')[0] + '@s.whatsapp.net';

        if (!deletedBy || !ownerNumber) return;
        if (deletedBy.includes(sock.user?.id || '') || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender?.split('@')[0] || 'Unknown';
        let groupName = '';
        
        if (original.group) {
            try {
                const groupMetadata = await sock.groupMetadata(original.group);
                groupName = groupMetadata.subject;
            } catch (err) {
                console.error('Group metadata error:', err);
            }
        }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Kolkata',
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

        if (groupName) text += `*👥 Group:* ${groupName}\n`;

        if (original.content) {
            text += `\n*💬 Deleted Message:*\n${original.content}`;
        }

        await sock.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        // Media sending
        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
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

            // Cleanup
            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {
                console.error('Media cleanup error:', err);
            }
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}