import * as Discord from 'discord.js';

export default async function poll(message: Discord.Message): Promise<void> {
    const { guild, member, content, channel, author } = message;

    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    const poll = content.replace(/^\\?-usagi poll /i, '').split('|');

    const [pollTitle, ...pollOptions] = poll;

    if (!pollTitle) {
        await channel.send('`You need to include the title of the poll.`');
        return;
    }

    const isYesNoQuestion = pollOptions.length === 0;

    if (pollOptions.length === 1) {
        await channel.send(
            '`You need to include at least 2 options for the poll.`'
        );
        return;
    }
    if (pollOptions.length > 26) {
        await channel.send(
            '`You can only have up to 26 options for the poll.`'
        );
        return;
    }

    const sentPoll = await channel.send(
        new Discord.MessageEmbed()
            .setColor('#6ba4a5')
            .setAuthor(
                author.username,
                author.displayAvatarURL({ dynamic: true })
            )
            .setTitle(`Poll by ${author.username}#${author.discriminator}:`)
            .setDescription(pollTitle)
            .addFields(
                pollOptions.map((option, i) => ({
                    // A-Z
                    name: String.fromCharCode(65 + i),
                    value: option,
                }))
            )
    );

    await Promise.all(
        isYesNoQuestion
            ? [sentPoll.react('✅'), sentPoll.react('❎')]
            : pollOptions.map((_, i) =>
                  sentPoll.react(
                      String.fromCodePoint(/* emoji code point A-Z*/ 127462 + i)
                  )
              )
    );
}
