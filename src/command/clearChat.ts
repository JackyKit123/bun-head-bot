import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);
export default async function clear(message: Discord.Message): Promise<void> {
    const { member, channel, content, guild } = message;
    if (!member || !guild) {
        await channel.send('You can only use this command in a server.');
        return;
    }

    if (!member.hasPermission('MANAGE_MESSAGES')) {
        await channel.send('You are missing `MANAGE_MESSAGES` permission.');
        return;
    }

    const clearArg = content.split(' ')[2];
    const clearNumber = Number(clearArg);
    const clearMember = clearArg.match(/^<@!?([0-9]+)>$/)?.[1];

    if (!Number.isNaN(clearNumber)) {
        if (clearNumber < 1 || clearNumber > 100) {
            await channel.send('You can only delete 1 to 100 messages.');
            return;
        }
        await (channel as Discord.TextChannel).bulkDelete(clearNumber + 1);
        const sentMessage = await channel.send(
            `Deleted ${clearNumber} messages.`
        );
        await wait(3000);
        await sentMessage.delete();
        return;
    }

    if (clearMember) {
        const targetMember = guild.members.cache.get(clearMember);
        const messages = await channel.messages.fetch({ limit: 100 });
        const memberMessages = messages.filter(
            msg => msg.author.id === targetMember?.id
        );
        await message.delete();
        await (channel as Discord.TextChannel).bulkDelete(memberMessages);
        await channel.send(
            `Deleted ${memberMessages.size} messages from ${targetMember}.`
        );
        return;
    }

    await channel.send(
        `\`${clearArg}\` is not an acceptable argument for clear command. Acceptable arguments are @member mention or clear number`
    );
}
