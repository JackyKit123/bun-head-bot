import * as Discord from 'discord.js';

export default async function ghostPingDetection(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { guild, author, content, mentions, channel } = message;

    if (!guild || author.id === client.user?.id) {
        return;
    }

    const mentionList = [
        ...mentions.users.values(),
        ...mentions.roles.values(),
        ...(content.includes('@everyone') ? ['@everyone'] : []),
        ...(content.includes('@here') ? ['@here'] : []),
    ];

    if (!mentionList.length) {
        return;
    }

    const fetchedLogs = await guild.fetchAuditLogs({
        limit: 6,
        type: 'MESSAGE_DELETE',
    });

    const executor =
        fetchedLogs.entries
            .filter(
                entry =>
                    (entry.target as Discord.User).id === author.id &&
                    (entry.extra as {
                        channel: Discord.TextChannel;
                    })?.channel?.id === channel.id &&
                    Date.now() - entry.createdTimestamp < 20000
            )
            .first()?.executor || author;

    await channel.send(
        `${mentionList.join(' ')}`,
        new Discord.MessageEmbed()
            .setColor('#34ebb4')
            .setTitle('Ghost Ping Detection')
            .setAuthor(
                'Bun Head',
                'https://cdn.discordapp.com/avatars/762967844781817906/a6fae5fd26f33cce0a337b76e17442cb.png?size=256'
            )
            .setDescription(
                "I have picked up a ghost pinged. Here's the detail for the removed message."
            )
            .addField('Deleted Message', content)
            .addField('In Channel', channel.toString())
            .addField('Message Sent By', author.toString())
            .addField('Deleted By', executor)
            .setTimestamp()
    );
}
