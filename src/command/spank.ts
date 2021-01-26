import * as Discord from 'discord.js';

export async function spank(message: Discord.Message): Promise<void> {
    const { guild, channel, member, mentions, author } = message;

    if (!member || !guild || channel.type !== 'text') {
        await channel.send(
            '`This command is only available in a text channel in a server.`'
        );
        return;
    }

    const spankedMember = mentions.members?.first();
    if (!spankedMember) {
        await channel.send('Mhm... You are spanking no one.');
        return;
    }

    if (spankedMember.id === author.id) {
        await channel.send(
            'We do not promote self-abuse here. Why would you spank yourself?'
        );
        return;
    }

    if (!spankedMember.manageable) {
        await channel.send('`This member cannot be spanked`.');
        return;
    }

    let spankedRole = guild.roles.cache.find(
        role => !!role.name.match(/spanked/i)
    );
    if (!spankedRole) {
        spankedRole = await guild.roles.create({
            data: {
                name: '🤕Spanked🤕',
                color: 'ff0000',
            },
        });
    }

    const nickname = spankedMember.nickname || spankedMember.displayName;

    if (spankedMember.roles.cache.has(spankedRole.id)) {
        await channel.send(
            `\`${nickname}\` has already been spanked, don't spank this little poor excessively.`
        );
        return;
    }

    const tempWebhook = await channel.createWebhook(member.displayName, {
        avatar: author.avatarURL({ dynamic: true }) ?? undefined,
    });

    await Promise.all([
        await spankedMember.roles.add(spankedRole),
        await spankedMember.setNickname(
            `🤕${
                nickname?.length >= 29
                    ? `${nickname.slice(0, nickname.length)}…`
                    : nickname
            }🤕`
        ),
        await tempWebhook.send(
            spankedMember.toString(),
            new Discord.MessageEmbed()
                .setTitle('**I SPANK YOU!**')
                .setColor('#34ebb4')
                .setImage(
                    `https://media1.tenor.com/images/3d153d35e5d9dde75c259285fdf66321/tenor.gif?itemid=14781946`
                )
        ),
    ]);

    await tempWebhook.delete();
}

export async function pat(message: Discord.Message): Promise<void> {
    const { guild, channel, member, mentions, author } = message;

    if (!member || !guild || channel.type !== 'text') {
        await channel.send(
            '`This command is only available in a text channel in a server.`'
        );
        return;
    }

    const patMember = mentions.members?.first();
    if (!patMember) {
        await channel.send('Mhm... You are patting no one.');
        return;
    }

    if (patMember.id === author.id) {
        await channel.send(
            'It is good to love yourself, but you cannot pat yourself.'
        );
        return;
    }

    if (!patMember.manageable) {
        await channel.send('This member cannot be pat.');
        return;
    }

    const spankedRole = guild.roles.cache.find(
        role => !!role.name.match(/spanked/i)
    );
    if (!spankedRole) {
        throw new Error('Spanked role is missing on the server.');
    }

    const nickname = patMember.nickname
        ? patMember.nickname.replace(/\u{1F915}/gu, '')
        : patMember.displayName;

    const spanked = patMember.roles.cache.has(spankedRole.id);

    const tempWebhook = await channel.createWebhook(member.displayName, {
        avatar: author.avatarURL({ dynamic: true }) ?? undefined,
    });

    await Promise.all([
        await patMember.roles.remove(spankedRole),
        await patMember.setNickname(nickname),
        await tempWebhook.send(
            patMember.toString(),
            new Discord.MessageEmbed()
                .setTitle(
                    `**~PAT PAT~**${
                        spanked ? ` Don't get spanked so hard next time.` : ' '
                    }`
                )
                .setColor('#34ebb4')
                .setImage(
                    `https://media1.tenor.com/images/3f3e1d2187bc5815c2dc3cbcb075535f/tenor.gif?itemid=15118749`
                )
        ),
    ]);

    await tempWebhook.delete();
}
