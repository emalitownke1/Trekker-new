import { commandRegistry, type CommandContext } from './command-registry.js';
import { storage } from '../storage.js';
import { AutoStatusService } from './auto-status.js';

// TREKKER-MD Essential Commands
console.log('✅ Enhanced commands loaded successfully');

// Owner Command
commandRegistry.register({
  name: 'owner',
  aliases: ['creator', 'dev'],
  description: 'Show bot owner and contact information',
  category: 'SYSTEM',
  handler: async (context: CommandContext) => {
    const { respond } = context;

    const ownerMessage = `
*✅sᴇssɪᴏɴ ɪᴅ ɢᴇɴᴇʀᴀᴛᴇᴅ✅*
______________________________
╔════◇
║『 𝐘𝐎𝐔'𝐕𝐄 𝐂𝐇𝐎𝐒𝐄𝐍 TREKKER-MD LIFETIME BOT  』
╚══════════════╝
╔═════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ TELEGRAM: https://t.me/trekkermd_
║❒ INSTAGRAM: https://www.instagram.com/nicholaso_tesla?igsh=eG5oNWVuNXF6eGU0
║📞 WhatsApp: +254704897825
║❒ PairSite: https://dc693d3f-99a0-4944-94cc-6b839418279c.e1-us-east-azure.choreoapps.dev/
║❒ 𝐖a𝐂𝐡𝐚𝐧𝐧𝐞𝐥: https://whatsapp.com/channel/0029Vb6vpSv6WaKiG6ZIy73H
║ 💜💜💜
╚══════════════╝ 
 DM the owner only for lifetime TREKKER-MD bot __No expiry__
______________________________

Use the Quoted Session ID to Deploy your Bot.
❤️Support us donations keeps this services running❤️

Powered by TREKKER-MD....ultra fast bot.`;

    await respond(ownerMessage);
  }
});

// Ping Command
commandRegistry.register({
  name: 'ping',
  aliases: ['pong', 'speed'],
  description: 'Check bot response time and status',
  category: 'SYSTEM',
  handler: async (context: CommandContext) => {
    const { respond } = context;

    const startTime = Date.now();
    const pingMessage = `🏃‍♂️ *TREKKER-MD LIFETIME BOT*\n\n⚡ *Speed:* ${Date.now() - startTime}ms\n🤖 *Status:* Online\n💚 *Health:* Perfect\n\n> Ultra fast response from TREKKER-MD`;

    await respond(pingMessage);
  }
});

// Add Custom Command - Admin Only
commandRegistry.register({
  name: 'addcmd',
  aliases: ['addcommand'],
  description: 'Add a custom command (Admin only)',
  category: 'ADMIN',
  handler: async (context: CommandContext) => {
    const { respond } = context;

    await respond(`🔧 *Custom Command Management*\n\nTo add custom commands, please use the admin panel:\n\n🌐 Access your bot dashboard\n📝 Navigate to Command Management\n➕ Click 'Add New Command'\n📋 Paste your command code\n💾 Save and deploy\n\n> Commands added through the panel are automatically synced across all bot instances.`);
  }
});

// List Commands
commandRegistry.register({
  name: 'commands',
  aliases: ['cmdlist', 'help'],
  description: 'Show all available commands',
  category: 'SYSTEM',
  handler: async (context: CommandContext) => {
    const { respond } = context;

    const allCommands = commandRegistry.getAllCommands();
    const categorizedCommands = commandRegistry.getCommandsByCategory();

    let commandsList = `*🤖 TREKKER-MD LIFETIME BOT COMMANDS*\n\n`;
    commandsList += `📊 *Total Commands:* ${allCommands.length}\n`;
    commandsList += `🔧 *Prefix:* .\n\n`;

    const sortedCategories = Object.keys(categorizedCommands).sort();

    for (const category of sortedCategories) {
      commandsList += `*╭━❮ ${category} ❯━╮*\n`;
      const sortedCommands = categorizedCommands[category].sort((a, b) => a.name.localeCompare(b.name));
      for (const command of sortedCommands) {
        commandsList += `┃✰ .${command.name}\n`;
      }
      commandsList += `╰─────────────━┈⊷\n\n`;
    }

    commandsList += `> Powered by TREKKER-MD Team`;

    await respond(commandsList);
  }
});

// Auto Status Command
commandRegistry.register({
  name: 'autostatus',
  aliases: ['statusview', 'autoview'],
  description: 'Manage auto status viewing and reactions',
  category: 'AUTOMATION',
  handler: async (context: CommandContext) => {
    const { respond, message, args, client } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    try {
      // Get bot instance from the context (we'll need to find a way to pass this)
      // For now, we'll create a dummy autoStatus service
      // This will be properly integrated when we update the WhatsApp bot service

      const channelInfo = {
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'TREKKER-MD LIFETIME BOT',
            serverMessageId: -1
          }
        }
      };

      // If no arguments, show current status
      if (!args || args.length === 0) {
        const statusMessage = `🔄 *Auto Status Settings*\n\n📱 *Auto Status View:* enabled/disabled\n💫 *Status Reactions:* enabled/disabled\n\n*Commands:*\n.autostatus on - Enable auto status view\n.autostatus off - Disable auto status view\n.autostatus react on - Enable status reactions\n.autostatus react off - Disable status reactions`;
        await respond(statusMessage);
        return;
      }

      // Handle on/off commands
      const command = args[0].toLowerCase();

      if (command === 'on') {
        await respond('✅ Auto status view has been enabled!\nBot will now automatically view all contact statuses.');
      } else if (command === 'off') {
        await respond('❌ Auto status view has been disabled!\nBot will no longer automatically view statuses.');
      } else if (command === 'react') {
        // Handle react subcommand
        if (!args[1]) {
          await respond('❌ Please specify on/off for reactions!\nUse: .autostatus react on/off');
          return;
        }

        const reactCommand = args[1].toLowerCase();
        if (reactCommand === 'on') {
          await respond('💫 Status reactions have been enabled!\nBot will now react to status updates.');
        } else if (reactCommand === 'off') {
          await respond('❌ Status reactions have been disabled!\nBot will no longer react to status updates.');
        } else {
          await respond('❌ Invalid reaction command! Use: .autostatus react on/off');
        }
      } else {
        await respond('❌ Invalid command! Use:\n.autostatus on/off - Enable/disable auto status view\n.autostatus react on/off - Enable/disable status reactions');
      }

    } catch (error) {
      console.error('Error in autostatus command:', error);
      await respond('❌ Error occurred while managing auto status!\n' + (error as Error).message);
    }
  }
});

// Anti ViewOnce Command
commandRegistry.register({
  name: 'antiviewonce',
  aliases: ['viewonce'],
  description: 'Intercept and save ViewOnce messages',
  category: 'AUTOMATION',
  handler: async (context: CommandContext) => {
    const { respond, message, args, botId } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    try {
      // Get the bot ID from the context
      const currentBotId = botId || 'default';
      
      // Import antiviewonce service
      const { getAntiViewOnceService } = await import('./antiviewonce.js');
      const antiViewOnceService = getAntiViewOnceService(currentBotId);

      if (!antiViewOnceService) {
        await respond('❌ Anti-viewonce service is not available.');
        return;
      }

      // If no arguments, show current status
      if (!args || args.length === 0) {
        const statusMessage = antiViewOnceService.getStatusMessage();
        await respond(statusMessage);
        return;
      }

      // Handle on/off commands
      const command = args[0].toLowerCase();

      if (command === 'on') {
        antiViewOnceService.setEnabled(true);
        await respond('✅ Anti ViewOnce has been enabled!\nAll ViewOnce messages will now be intercepted and saved.');
      } else if (command === 'off') {
        antiViewOnceService.setEnabled(false);
        await respond('❌ Anti ViewOnce has been disabled!\nViewOnce messages will no longer be intercepted.');
      } else {
        await respond('❌ Invalid command! Use: .antiviewonce on/off');
      }

    } catch (error) {
      console.error('Error in antiviewonce command:', error);
      await respond('❌ Error occurred while managing Anti ViewOnce!\n' + (error as Error).message);
    }
  }
});


// Group Management Commands
commandRegistry.register({
  name: 'promote',
  aliases: ['admin'],
  description: 'Promote user to admin (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    // Get the actual chat ID (group ID)
    const chatId = message.key.remoteJid || from;
    
    // Check if it's a group chat
    if (!chatId || !chatId.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      // Get quoted message or tagged user - improved extraction
      let quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
      
      // Alternative ways to get the user
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        quotedUser = message.message.extendedTextMessage.contextInfo.participant;
      }
      
      // Check if user mentioned with @
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        quotedUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }

      if (!quotedUser) {
        await respond('❌ Please reply to a message or mention a user to promote!\n\nExample: Reply to their message or use @username');
        return;
      }

      // Get group metadata to check admin status
      const groupMetadata = await client.groupMetadata(chatId);
      const botNumber = client.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
      const senderNumber = message.key.participant || message.key.remoteJid || '';

      // Check if sender is admin - improved logic
      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      const senderIsAdmin = senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin');
      
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can promote users!');
        return;
      }

      // Check if bot is admin - improved logic
      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botNumber);
      const botIsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
      
      if (!botIsAdmin) {
        await respond('❌ Bot needs admin privileges to promote users!');
        return;
      }

      // Check if user is already admin
      const targetParticipant = groupMetadata.participants.find((p: any) => p.id === quotedUser);
      if (targetParticipant && (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin')) {
        await respond(`❌ @${quotedUser.split('@')[0]} is already an admin!`);
        return;
      }

      // Promote user
      await client.groupParticipantsUpdate(chatId, [quotedUser], 'promote');
      await respond(`✅ Successfully promoted @${quotedUser.split('@')[0]} to admin!`);

    } catch (error) {
      console.error('Error promoting user:', error);
      await respond('❌ Failed to promote user. Make sure I have admin privileges and the user is in the group!');
    }
  }
});

commandRegistry.register({
  name: 'demote',
  aliases: ['unadmin'],
  description: 'Demote user from admin (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    // Get the actual chat ID (group ID)
    const chatId = message.key.remoteJid || from;
    
    if (!chatId || !chatId.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      // Get quoted message or tagged user - improved extraction
      let quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
      
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        quotedUser = message.message.extendedTextMessage.contextInfo.participant;
      }
      
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        quotedUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }

      if (!quotedUser) {
        await respond('❌ Please reply to a message or mention a user to demote!\n\nExample: Reply to their message or use @username');
        return;
      }

      const groupMetadata = await client.groupMetadata(chatId);
      const botNumber = client.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
      const senderNumber = message.key.participant || message.key.remoteJid || '';

      // Check if sender is admin - improved logic
      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      const senderIsAdmin = senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin');
      
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can demote users!');
        return;
      }

      // Check if bot is admin - improved logic
      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botNumber);
      const botIsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
      
      if (!botIsAdmin) {
        await respond('❌ Bot needs admin privileges to demote users!');
        return;
      }

      // Check if user is actually an admin
      const targetParticipant = groupMetadata.participants.find((p: any) => p.id === quotedUser);
      if (!targetParticipant || (targetParticipant.admin !== 'admin' && targetParticipant.admin !== 'superadmin')) {
        await respond(`❌ @${quotedUser.split('@')[0]} is not an admin!`);
        return;
      }

      await client.groupParticipantsUpdate(chatId, [quotedUser], 'demote');
      await respond(`✅ Successfully demoted @${quotedUser.split('@')[0]} from admin!`);

    } catch (error) {
      console.error('Error demoting user:', error);
      await respond('❌ Failed to demote user. Make sure I have admin privileges and the user is an admin!');
    }
  }
});

commandRegistry.register({
  name: 'kick',
  aliases: ['remove'],
  description: 'Remove user from group (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    // Get the actual chat ID (group ID)
    const chatId = message.key.remoteJid || from;
    
    if (!chatId || !chatId.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      // Get quoted message or tagged user - improved extraction
      let quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
      
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        quotedUser = message.message.extendedTextMessage.contextInfo.participant;
      }
      
      if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        quotedUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }

      if (!quotedUser) {
        await respond('❌ Please reply to a message or mention a user to remove!\n\nExample: Reply to their message or use @username');
        return;
      }

      const groupMetadata = await client.groupMetadata(chatId);
      const botNumber = client.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
      const senderNumber = message.key.participant || message.key.remoteJid || '';

      // Check if sender is admin - improved logic
      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      const senderIsAdmin = senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin');
      
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can remove users!');
        return;
      }

      // Check if bot is admin - improved logic
      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botNumber);
      const botIsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');
      
      if (!botIsAdmin) {
        await respond('❌ Bot needs admin privileges to remove users!');
        return;
      }

      // Check if trying to remove bot itself
      if (quotedUser === botNumber) {
        await respond('❌ I cannot remove myself from the group!');
        return;
      }

      // Check if user is in the group
      const targetParticipant = groupMetadata.participants.find((p: any) => p.id === quotedUser);
      if (!targetParticipant) {
        await respond(`❌ @${quotedUser.split('@')[0]} is not in this group!`);
        return;
      }

      await client.groupParticipantsUpdate(chatId, [quotedUser], 'remove');
      await respond(`✅ Successfully removed @${quotedUser.split('@')[0]} from the group!`);

    } catch (error) {
      console.error('Error removing user:', error);
      await respond('❌ Failed to remove user. Make sure I have admin privileges and the user is in the group!');
    }
  }
});

commandRegistry.register({
  name: 'tagall',
  aliases: ['everyone', 'all'],
  description: 'Tag all group members (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      if (!senderParticipant || (!senderParticipant.admin && senderParticipant.admin !== 'admin' && senderParticipant.admin !== 'superadmin')) {
        await respond('❌ Only group admins can tag everyone!');
        return;
      }

      const participants = groupMetadata.participants.map((p: any) => p.id);
      const messageText = args.length > 0 ? args.join(' ') : 'Group announcement';

      let tagMessage = `📢 *${messageText}*\n\n`;
      participants.forEach((participant: any, index: number) => {
        tagMessage += `${index + 1}. @${participant.split('@')[0]}\n`;
      });

      await client.sendMessage(from, {
        text: tagMessage,
        mentions: participants
      });

    } catch (error) {
      console.error('Error tagging all:', error);
      await respond('❌ Failed to tag all members! Make sure I have permission to send messages.');
    }
  }
});

commandRegistry.register({
  name: 'groupinfo',
  aliases: ['ginfo'],
  description: 'Get group information',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const adminCount = groupMetadata.participants.filter((p: any) => p.admin).length;
      const memberCount = groupMetadata.participants.length;

      const groupInfo = `📋 *Group Information*\n\n` +
        `🏷️ *Name:* ${groupMetadata.subject}\n` +
        `📝 *Description:* ${groupMetadata.desc || 'No description'}\n` +
        `👥 *Total Members:* ${memberCount}\n` +
        `👑 *Admins:* ${adminCount}\n` +
        `📅 *Created:* ${new Date(groupMetadata.creation * 1000).toDateString()}\n` +
        `🆔 *Group ID:* ${from}`;

      await respond(groupInfo);

    } catch (error) {
      console.error('Error getting group info:', error);
      await respond('❌ Failed to get group information!');
    }
  }
});

commandRegistry.register({
  name: 'invite',
  aliases: ['link'],
  description: 'Generate group invite link (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can generate invite links!');
        return;
      }

      const inviteCode = await client.groupInviteCode(from);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      await respond(`🔗 *Group Invite Link*\n\n${inviteLink}\n\n⚠️ Share this link carefully!`);

    } catch (error) {
      console.error('Error generating invite link:', error);
      await respond('❌ Failed to generate invite link! Make sure I have admin privileges.');
    }
  }
});

// Additional Group Management Commands (to reach 15 total)

commandRegistry.register({
  name: 'add',
  aliases: ['invite-user'],
  description: 'Add user to group (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a phone number!\n\n*Example:* .add 254712345678');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const botNumber = client.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      if (!senderParticipant || (!senderParticipant.admin && senderParticipant.admin !== 'admin' && senderParticipant.admin !== 'superadmin')) {
        await respond('❌ Only group admins can add users!');
        return;
      }

      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botNumber);
      if (!botParticipant || (!botParticipant.admin && botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
        await respond('❌ Bot needs admin privileges to add users!');
        return;
      }

      const phoneNumber = args[0].replace(/[^\d]/g, '');
      const userToAdd = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
      const userJid = userToAdd + '@s.whatsapp.net';

      await client.groupParticipantsUpdate(from, [userJid], 'add');
      await respond(`✅ Successfully added @${userToAdd} to the group!`);

    } catch (error) {
      console.error('Error adding user:', error);
      await respond('❌ Failed to add user. Make sure the number is registered on WhatsApp and not already in the group!');
    }
  }
});

commandRegistry.register({
  name: 'mute',
  aliases: ['silence'],
  description: 'Mute group chat (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const botNumber = client.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net';
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderParticipant = groupMetadata.participants.find((p: any) => p.id === senderNumber);
      if (!senderParticipant || (!senderParticipant.admin && senderParticipant.admin !== 'admin' && senderParticipant.admin !== 'superadmin')) {
        await respond('❌ Only group admins can mute the group!');
        return;
      }

      const botParticipant = groupMetadata.participants.find((p: any) => p.id === botNumber);
      if (!botParticipant || (!botParticipant.admin && botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
        await respond('❌ Bot needs admin privileges to mute the group!');
        return;
      }

      const duration = args[0] ? parseInt(args[0]) : 24; // Default 24 hours
      const muteUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
      
      await client.groupSettingUpdate(from, 'announcement');
      await respond(`🔇 Group has been muted for ${duration} hour(s)!\nOnly admins can send messages until ${muteUntil.toLocaleString()}`);

    } catch (error) {
      console.error('Error muting group:', error);
      await respond('❌ Failed to mute group! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'unmute',
  aliases: ['unsilence'],
  description: 'Unmute group chat (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can unmute the group!');
        return;
      }

      await client.groupSettingUpdate(from, 'not_announcement');
      await respond('🔊 Group has been unmuted! All members can now send messages.');

    } catch (error) {
      console.error('Error unmuting group:', error);
      await respond('❌ Failed to unmute group! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'lock',
  aliases: ['lockgroup'],
  description: 'Lock group settings (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can lock group settings!');
        return;
      }

      await client.groupSettingUpdate(from, 'locked');
      await respond('🔒 Group settings have been locked! Only admins can edit group info.');

    } catch (error) {
      console.error('Error locking group:', error);
      await respond('❌ Failed to lock group! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'unlock',
  aliases: ['unlockgroup'],
  description: 'Unlock group settings (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can unlock group settings!');
        return;
      }

      await client.groupSettingUpdate(from, 'unlocked');
      await respond('🔓 Group settings have been unlocked! All members can edit group info.');

    } catch (error) {
      console.error('Error unlocking group:', error);
      await respond('❌ Failed to unlock group! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'setname',
  aliases: ['changename'],
  description: 'Change group name (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a new group name!\n\n*Example:* .setname My New Group');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can change group name!');
        return;
      }

      const newName = args.join(' ');
      await client.groupUpdateSubject(from, newName);
      await respond(`✅ Group name changed to: *${newName}*`);

    } catch (error) {
      console.error('Error changing group name:', error);
      await respond('❌ Failed to change group name! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'setdesc',
  aliases: ['changedesc'],
  description: 'Change group description (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a new group description!\n\n*Example:* .setdesc Welcome to our group!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can change group description!');
        return;
      }

      const newDesc = args.join(' ');
      await client.groupUpdateDescription(from, newDesc);
      await respond(`✅ Group description updated successfully!`);

    } catch (error) {
      console.error('Error changing group description:', error);
      await respond('❌ Failed to change group description! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'revoke',
  aliases: ['resetlink'],
  description: 'Revoke and regenerate group invite link (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can revoke invite links!');
        return;
      }

      await client.groupRevokeInvite(from);
      const newInviteCode = await client.groupInviteCode(from);
      const newInviteLink = `https://chat.whatsapp.com/${newInviteCode}`;

      await respond(`🔄 *Group invite link revoked!*\n\n🔗 *New invite link:*\n${newInviteLink}\n\n⚠️ Previous link is no longer valid!`);

    } catch (error) {
      console.error('Error revoking invite link:', error);
      await respond('❌ Failed to revoke invite link! Make sure I have admin privileges.');
    }
  }
});

commandRegistry.register({
  name: 'hidetag',
  aliases: ['htag'],
  description: 'Send message with hidden mentions (Group admin only)',
  category: 'GROUP',
  handler: async (context: CommandContext) => {
    const { respond, message, client, from, args } = context;

    if (!from.endsWith('@g.us')) {
      await respond('❌ This command can only be used in group chats!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a message!\n\n*Example:* .hidetag Hello everyone!');
      return;
    }

    try {
      const groupMetadata = await client.groupMetadata(from);
      const senderNumber = message.key.participant || message.key.remoteJid;

      const senderIsAdmin = groupMetadata.participants.find((p: any) => p.id === senderNumber)?.admin;
      if (!senderIsAdmin) {
        await respond('❌ Only group admins can use hidetag!');
        return;
      }

      const messageText = args.join(' ');
      const participants = groupMetadata.participants.map((p: any) => p.id);

      await client.sendMessage(from, {
        text: messageText,
        mentions: participants
      });

    } catch (error) {
      console.error('Error sending hidetag:', error);
      await respond('❌ Failed to send hidetag message!');
    }
  }
});

// User Management Commands

commandRegistry.register({
  name: 'block',
  aliases: ['blockuser'],
  description: 'Block a user (Owner only)',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args, from } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    try {
      let userToBlock: string;
      const chatId = message.key.remoteJid || from;

      // If no arguments provided
      if (!args.length) {
        // Check if it's a reply to a message (in group or private)
        let quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
        
        // Alternative ways to get the user
        if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
          quotedUser = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!quotedUser && message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
          quotedUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }

        if (quotedUser) {
          userToBlock = quotedUser;
        } else if (chatId && chatId.endsWith('@s.whatsapp.net')) {
          // If it's a private chat, block the chat itself
          userToBlock = chatId;
        } else {
          await respond('❌ Please reply to a message, mention a user, provide a phone number, or use this command in a private chat!\n\n*Example:* .block 254712345678');
          return;
        }
      } else {
        // If phone number is provided as argument
        const phoneNumber = args[0].replace(/[^\d]/g, '');
        const formattedNumber = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
        userToBlock = formattedNumber + '@s.whatsapp.net';
      }

      await client.updateBlockStatus(userToBlock, 'block');
      const displayNumber = userToBlock.split('@')[0];
      await respond(`🚫 Successfully blocked @${displayNumber}!`);

    } catch (error) {
      console.error('Error blocking user:', error);
      await respond('❌ Failed to block user! Make sure the number is valid.');
    }
  }
});

commandRegistry.register({
  name: 'unblock',
  aliases: ['unblockuser'],
  description: 'Unblock a user (Owner only)',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a phone number!\n\n*Example:* .unblock 254712345678');
      return;
    }

    try {
      const phoneNumber = args[0].replace(/[^\d]/g, '');
      const userToUnblock = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
      const userJid = userToUnblock + '@s.whatsapp.net';

      await client.updateBlockStatus(userJid, 'unblock');
      await respond(`✅ Successfully unblocked @${userToUnblock}!`);

    } catch (error) {
      console.error('Error unblocking user:', error);
      await respond('❌ Failed to unblock user!');
    }
  }
});

commandRegistry.register({
  name: 'setprofile',
  aliases: ['setpfp'],
  description: 'Change bot profile picture (Owner only)',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    try {
      // Check if message has an image
      const messageType = Object.keys(message.message || {})[0];
      if (messageType !== 'imageMessage') {
        await respond('❌ Please send an image with this command!\n\n*Usage:* Send an image with caption .setprofile');
        return;
      }

      const imageMessage = message.message?.imageMessage;
      if (!imageMessage) {
        await respond('❌ No image found in the message!');
        return;
      }

      // Download the image
      const buffer = await client.downloadMediaMessage(message);
      
      // Update profile picture
      await client.updateProfilePicture(client.user!.id, buffer);
      await respond('✅ Profile picture updated successfully!');

    } catch (error) {
      console.error('Error updating profile picture:', error);
      await respond('❌ Failed to update profile picture!');
    }
  }
});

commandRegistry.register({
  name: 'setstatus',
  aliases: ['setbio'],
  description: 'Change bot status/bio (Owner only)',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args } = context;

    // Check if sender is bot owner (from own number)
    if (!message.key.fromMe) {
      await respond('❌ This command can only be used by the bot owner!');
      return;
    }

    if (!args.length) {
      await respond('❌ Please provide a new status!\n\n*Example:* .setstatus I am TREKKER-MD Bot!');
      return;
    }

    try {
      const newStatus = args.join(' ');
      await client.updateProfileStatus(newStatus);
      await respond(`✅ Status updated to: *${newStatus}*`);

    } catch (error) {
      console.error('Error updating status:', error);
      await respond('❌ Failed to update status!');
    }
  }
});

commandRegistry.register({
  name: 'getprofile',
  aliases: ['profile'],
  description: 'Get user profile information',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args } = context;

    try {
      let targetUser: string;
      
      if (args.length > 0) {
        const phoneNumber = args[0].replace(/[^\d]/g, '');
        targetUser = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
        targetUser = targetUser + '@s.whatsapp.net';
      } else {
        const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedUser) {
          targetUser = quotedUser;
        } else {
          targetUser = message.key.participant || message.key.remoteJid || '';
        }
      }

      if (!targetUser) {
        await respond('❌ Could not determine target user!');
        return;
      }

      // Get user profile
      const profilePicUrl = await client.profilePictureUrl(targetUser, 'image').catch(() => null);
      const status = await client.fetchStatus(targetUser).catch(() => null);
      
      const profileInfo = `👤 *User Profile*\n\n` +
        `📱 *Number:* @${targetUser.split('@')[0]}\n` +
        `📝 *Status:* ${status?.status || 'No status'}\n` +
        `📅 *Status Date:* ${status?.setAt ? new Date(status.setAt).toDateString() : 'Unknown'}\n` +
        `🖼️ *Profile Picture:* ${profilePicUrl ? 'Available' : 'No profile picture'}`;

      if (profilePicUrl) {
        await client.sendMessage(message.key.remoteJid!, {
          image: { url: profilePicUrl },
          caption: profileInfo,
          mentions: [targetUser]
        });
      } else {
        await respond(profileInfo);
      }

    } catch (error) {
      console.error('Error getting profile:', error);
      await respond('❌ Failed to get user profile!');
    }
  }
});

commandRegistry.register({
  name: 'online',
  aliases: ['presence'],
  description: 'Check if user is online',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args } = context;

    try {
      let targetUser: string;
      
      if (args.length > 0) {
        const phoneNumber = args[0].replace(/[^\d]/g, '');
        targetUser = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
        targetUser = targetUser + '@s.whatsapp.net';
      } else {
        const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedUser) {
          targetUser = quotedUser;
        } else {
          await respond('❌ Please reply to a message or provide a phone number!\n\n*Example:* .online 254712345678');
          return;
        }
      }

      // Subscribe to presence updates
      await client.presenceSubscribe(targetUser);
      
      // Check current presence
      const presence = await client.chatModify({ markRead: false }, targetUser);
      
      await respond(`👁️ *Presence Status*\n\n📱 *User:* @${targetUser.split('@')[0]}\n🔍 *Checking presence...*\n\n⚠️ *Note:* Presence status depends on user's privacy settings.`);

    } catch (error) {
      console.error('Error checking presence:', error);
      await respond('❌ Failed to check user presence!');
    }
  }
});

commandRegistry.register({
  name: 'dp',
  aliases: ['getdp'],
  description: 'Get user profile picture',
  category: 'USER',
  handler: async (context: CommandContext) => {
    const { respond, message, client, args } = context;

    try {
      let targetUser: string;
      
      if (args.length > 0) {
        const phoneNumber = args[0].replace(/[^\d]/g, '');
        targetUser = phoneNumber.startsWith('254') ? phoneNumber : '254' + phoneNumber;
        targetUser = targetUser + '@s.whatsapp.net';
      } else {
        const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedUser) {
          targetUser = quotedUser;
        } else {
          targetUser = message.key.participant || message.key.remoteJid || '';
        }
      }

      if (!targetUser) {
        await respond('❌ Could not determine target user!');
        return;
      }

      // Get profile picture
      const profilePicUrl = await client.profilePictureUrl(targetUser, 'image');
      
      await client.sendMessage(message.key.remoteJid!, {
        image: { url: profilePicUrl },
        caption: `📸 *Profile Picture*\n\n👤 *User:* @${targetUser.split('@')[0]}`,
        mentions: [targetUser]
      });

    } catch (error) {
      console.error('Error getting profile picture:', error);
      await respond('❌ Failed to get profile picture! User may not have a profile picture or privacy settings prevent access.');
    }
  }
});

console.log('✅ TREKKER-MD essential commands loaded successfully');