import * as Discord from 'discord.js';
import * as colorParser from 'color-parser';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function customRole(
    message: Discord.Message
): Promise<void> {
    const { guild, member, content, channel } = message;
    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    const colorArg = content.split(' ')[2];
    if (colorArg === 'channel' && member.hasPermission('MANAGE_ROLES')) {
        const sentMessage = await channel.send(
            'Use `-usagi customrole <color> <role name>` to create your custom role.```Example: -usagi customrole #ff0000 Best Player!```'
        );
        await sentMessage.pin();
        return;
    }
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
    await Promise.all(
        member.roles.cache.map(async role => {
            if (role.name === 'No Custom Role') {
                await member.roles.remove(role);
            }
        })
    );
    const newRole = await guild.roles.create({
        data: {
            name: `${roleName}‎‎‎`,
            color: [color.r, color.g, color.b].every(color => color === 0)
                ? [1, 1, 1]
                : [color.r, color.g, color.b],
            mentionable: false,
            hoist: false,
        },
    });
    await member.roles.add(newRole);
    await channel.send(`Added ${newRole.toString()} to you.`);
}

export async function claimRoleChannel(
    message: Discord.Message,
    client: Discord.Client
): Promise<void> {
    const channelMessages = await message.channel.messages.fetchPinned();

    if (
        channelMessages.find(
            msg =>
                msg.author.id === client.user?.id &&
                msg.content ===
                    'Use `-usagi customrole <color> <role name>` to create your custom role.```Example: -usagi customrole #ff0000 Best Player!```'
        )
    ) {
        await wait(5000);
        await message.delete();
    }
}

export async function manageJoin(member: Discord.GuildMember): Promise<void> {
    const noCustomRole =
        member.guild.roles.cache.find(role => role.name === 'No Custom Role') ||
        (await member.guild.roles.create({
            data: {
                name: 'No Custom Role',
                mentionable: false,
                hoist: false,
            },
        }));

    await member.roles.add(noCustomRole);
}

export async function manageLeave(guild: Discord.Guild): Promise<void> {
    await Promise.all([guild.members.fetch(), guild.roles.fetch()]);
    await Promise.all(
        guild.roles.cache.map(async role => {
            if (role.name.endsWith(`‎‎‎`)) {
                await role.delete();
            }
        })
    );
}
