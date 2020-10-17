import * as Discord from 'discord.js';

export async function roleClaimCommand(
    message: Discord.Message
): Promise<void> {
    const { guild, channel, member, mentions } = message;

    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    if (!member.hasPermission('MANAGE_ROLES')) {
        await channel.send('You do not have `MANAGE_ROLES` permissions.');
        return;
    }

    const role = mentions.roles.first();

    if (!role) {
        await channel.send(
            'You did not mention a role. Please execute the command like `-usagi create-role-claim <@role>`'
        );
        return;
    }

    if (!guild.roles.cache.has(typeof role === 'string' ? role : role.id)) {
        await channel.send(
            `Role <@&${
                typeof role === 'string' ? role : role.id
            }> does not exist in this server. I cannot create the message.`
        );
        return;
    }

    await message.delete();
    const sentMessage = await channel.send(
        `React to ✅ to claim your <@&${
            typeof role === 'string' ? role : role.id
        }> role. React to ❎ to remove your claimed role.`
    );
    await sentMessage.react('✅');
    await sentMessage.react('❎');
}

export async function roleAdd(
    client: Discord.Client,
    reaction: Discord.MessageReaction,
    user: Discord.PartialUser | Discord.User
): Promise<void> {
    const { message, emoji } = reaction;
    const { content, author, mentions, guild } = message;
    const clientUser = client.user as Discord.ClientUser;

    if (user.id !== client.user?.id) {
        await reaction.users.remove(user.id);
    }
    if (
        !guild ||
        !guild.member(clientUser)?.hasPermission('MANAGE_ROLES') ||
        !emoji.name.match(/✅|❎/) ||
        !content.match(
            /^React to ✅ to claim your <@&[0-9]+> role. React to ❎ to remove your claimed role.$/
        ) ||
        author.id !== clientUser.id
    ) {
        return;
    }

    const role = mentions.roles.first();

    if (!role) {
        return;
    }

    const member = guild.members.cache.find(member => member.id === user.id);

    if (!member) {
        return;
    }

    if (emoji.name === '✅') {
        await member.roles.add(role);
    } else if (emoji.name === '❎') {
        await member.roles.remove(role);
    }
}
