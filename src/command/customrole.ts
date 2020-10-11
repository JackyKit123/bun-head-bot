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
    }
    const memberHasCustomRole = member.roles.cache.find(role =>
        role.name.endsWith('(Custom)')
    );
    if (memberHasCustomRole) {
        await member.roles.remove(memberHasCustomRole);
        if (memberHasCustomRole.members.size === 0) {
            await memberHasCustomRole.delete();
        }
    }
    const rgbToHex = (r: number, g: number, b: number): string => {
        return (
            '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
        );
    };
    const guildExistsCustomRole = guild.roles.cache.find(
        role =>
            role.name === `${roleName} (Custom)` &&
            role.hexColor === rgbToHex(color.r, color.g, color.b)
    );
    if (guildExistsCustomRole) {
        await member.roles.add(guildExistsCustomRole);
        await channel.send(`Added ${guildExistsCustomRole.toString()} to you.`);
        return;
    }
    const newRole = await guild.roles.create({
        data: {
            name: `${roleName} (Custom)`,
            color: [color.r, color.g, color.b],
            mentionable: false,
            hoist: false,
        },
    });
    await member.roles.add(newRole);
    await channel.send(`Added ${newRole.toString()} to you.`);
}
