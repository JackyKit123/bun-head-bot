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
            .find(
                entry =>
                    (entry.target as Discord.User | null)?.id === author.id &&
                    (entry.extra as Discord.Message | null)?.channel?.id ===
                        channel.id &&
                    Date.now() - entry.createdTimestamp < 20000
            )
            ?.executor.toString() || 'Unknown';

    await channel.send(
        `${mentionList.join(
            ' '
        )}, you were ghost pinged by ${author.toString()}.`,
        new Discord.MessageEmbed()
            .setColor('#34ebb4')
            .setTitle('Ghost Ping Detection')
            .addField('Deleted Message', content)
            .addField('In Channel', channel.toString())
            .addField('Deleted By', executor)
            .setTimestamp()
    );
}
