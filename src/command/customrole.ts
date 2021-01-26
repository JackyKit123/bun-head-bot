import * as Discord from 'discord.js';
import * as colorParser from 'color-parser';

export default async function customRole(
    message: Discord.Message
): Promise<void> {
    const { guild, member, content, channel } = message;
    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }
    const colorArg = content.split(' ')[2];
    const color = colorParser(colorArg);
    const roleName = content.split(' ').slice(3).join(' ').trim();
    if (!color) {
        await channel.send(
            `\`${colorArg}\` is not a valid color. Please include a valid color in the first command parameter.`
        );
        return;
    }
    if (!roleName) {
        await channel.send(
            `Please include a role name for your custom role after color.`
        );
        return;
    }
    await member.roles.cache.find(role => role.name.endsWith('‎‎‎'))?.delete();
    const newRole = await guild.roles.create({
        data: {
            name: `${roleName}‎‎‎`,
            color: [color.r, color.g, color.b],
            mentionable: false,
            hoist: false,
        },
    });
    await member.roles.add(newRole);
    await channel.send(`Added ${newRole.toString()} to you.`);
}
