import * as Discord from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

interface SpankData {
    servers: {
        [serverId: string]: {
            [member: string]: {
                spank: number;
                spanked: number;
                pat: number;
                patted: number;
            };
        };
    };
}

async function sendLeaderboard(
    channel: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel,
    embeds: Discord.MessageEmbed[],
    pages: number
) {
    let currentPage = 0;
    const sentMessage = await channel.send(embeds[currentPage]);
    if (pages <= 1) {
        return;
    }
    await sentMessage.react('⏪');
    await sentMessage.react('◀️');
    await sentMessage.react('▶️');
    await sentMessage.react('⏩');
    const collector = sentMessage.createReactionCollector(
        reaction => ['⏪', '◀️', '▶️', '⏩'].includes(reaction.emoji.name),
        {
            time: 180000,
        }
    );

    collector.on('collect', async (reaction, user) => {
        if (reaction.emoji.name === '⏪') {
            currentPage = 0;
        }
        if (reaction.emoji.name === '◀️' && currentPage > 0) {
            currentPage -= 1;
        }
        if (reaction.emoji.name === '▶️' && currentPage < pages - 1) {
            currentPage += 1;
        }
        if (reaction.emoji.name === '⏩') {
            currentPage = pages - 1;
        }
        await sentMessage.edit(embeds[currentPage]);
        await reaction.users.remove(user.id);
    });

    collector.on('end', sentMessage.reactions.removeAll);
}

export async function spank(message: Discord.Message): Promise<void> {
    const { guild, channel, member, mentions, content, author } = message;

    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    const spankedMember = mentions.members?.first();
    if (!fs.existsSync(path.join(__dirname, '..', 'data', 'spankData.json'))) {
        fs.writeFileSync(
            path.join(__dirname, '..', 'data', 'spankData.json'),
            '{"servers": {}}'
        );
    }
    let spankedData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'data', 'spankData.json'), {
            encoding: 'utf-8',
        })
    ) as SpankData;
    if (!spankedMember) {
        if (
            content
                .replace(/[^\040-\176\200-\377]/gi, '')
                .match(/^\\?-usagi spank leaderboard\b/i)
        ) {
            const leaderboard = Object.entries(
                spankedData.servers[guild.id] || {}
            ).map(([memberId, data]) => ({
                memberId,
                spank: data.spank,
                spanked: data.spanked,
            }));
            const sortBySpank = Array.from(leaderboard).sort(
                (a, b) => (b.spank || 0) - (a.spank || 0)
            );
            const sortBySpanked = Array.from(leaderboard).sort(
                (a, b) => (b.spanked || 0) - (a.spanked || 0)
            );

            const pages = Math.ceil(leaderboard.length / 5) || 1;
            const fields = Array(pages)
                .fill('')
                .map((_, i) => [
                    {
                        name: 'Top Spanker',
                        value: Array(5)
                            .fill('')
                            .map((_, j) =>
                                sortBySpank[i + j]
                                    ? `#${i + j + 1} : <@!${
                                          sortBySpank[i + j].memberId
                                      }> \`${
                                          sortBySpank[i + j].spank || 0
                                      } Spanks\``
                                    : `#${i + j + 1} : `
                            )
                            .join('\n'),
                        inline: true,
                    },
                    {
                        name: 'Top Spanked',
                        value: Array(5)
                            .fill('')
                            .map((_, j) =>
                                sortBySpanked[i + j]
                                    ? `#${i + j + 1} : <@!${
                                          sortBySpanked[i + j].memberId
                                      }> \`${
                                          sortBySpanked[i + j].spanked || 0
                                      } Spanked\``
                                    : `#${i + j + 1} : `
                            )
                            .join('\n'),
                        inline: true,
                    },
                ])
                .flat();
            const embeds = Array(pages)
                .fill('')
                .map((_, i) =>
                    new Discord.MessageEmbed()
                        .setColor('#6ba4a5')
                        .setAuthor(
                            'Spank Leaderboard',
                            'https://media1.tenor.com/images/3d153d35e5d9dde75c259285fdf66321/tenor.gif?itemid=1478194'
                        )
                        .addFields(fields.slice(i * 2, i * 2 + 2))
                );
            await sendLeaderboard(channel, embeds, pages);
            return;
        }
        await channel.send('`Mhm... You are spanking no one.`');
        return;
    }

    if (spankedMember.id === author.id) {
        await channel.send(
            '`We do not promote self-abuse here. Why would you spank yourself?`'
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
            `\`${nickname} has already been spanked, don't spank this little poor excessively.\``
        );
        return;
    }

    spankedData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'data', 'spankData.json'), {
            encoding: 'utf-8',
        })
    ) as SpankData;
    spankedData.servers[guild.id] = spankedData.servers[guild.id] || {};
    spankedData.servers[guild.id][spankedMember.id] =
        spankedData.servers[guild.id][spankedMember.id] || {};
    spankedData.servers[guild.id][author.id] =
        spankedData.servers[guild.id][author.id] || {};
    spankedData.servers[guild.id][spankedMember.id].spanked =
        (spankedData.servers[guild.id][spankedMember.id].spanked || 0) + 1;
    spankedData.servers[guild.id][author.id].spank =
        (spankedData.servers[guild.id][spankedMember.id].spank || 0) + 1;

    fs.writeFileSync(
        path.join(__dirname, '..', 'data', 'spankData.json'),
        JSON.stringify(spankedData)
    );

    await Promise.all([
        await spankedMember.roles.add(spankedRole),
        await spankedMember.setNickname(
            `🤕${
                nickname?.length >= 29
                    ? `${nickname.slice(0, nickname.length)}…`
                    : nickname
            }🤕`
        ),
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('**SPANKED**')
                .setColor('#34ebb4')
                .setDescription(
                    `${spankedMember.toString()} has been spanked by ${author.toString()}.`
                )
                .setImage(
                    `https://media1.tenor.com/images/3d153d35e5d9dde75c259285fdf66321/tenor.gif?itemid=14781946`
                )
        ),
    ]);
}

export async function pat(message: Discord.Message): Promise<void> {
    const { guild, channel, member, mentions, content, author } = message;

    if (!member || !guild) {
        await channel.send('`This command is only available in a server.`');
        return;
    }

    const patMember = mentions.members?.first();
    if (!fs.existsSync(path.join(__dirname, '..', 'data', 'spankData.json'))) {
        fs.writeFileSync(
            path.join(__dirname, '..', 'data', 'spankData.json'),
            '{"servers": {}}'
        );
    }
    const spankedData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'data', 'spankData.json'), {
            encoding: 'utf-8',
        })
    ) as SpankData;
    if (!patMember) {
        if (
            content
                .replace(/[^\040-\176\200-\377]/gi, '')
                .match(/^\\?-usagi pat leaderboard\b/i)
        ) {
            const leaderboard = Object.entries(
                spankedData.servers[guild.id] || {}
            ).map(([memberId, data]) => ({
                memberId,
                pat: data.pat,
                patted: data.patted,
            }));
            const sortByPat = Array.from(leaderboard).sort(
                (a, b) => (b.pat || 0) - (a.pat || 0)
            );
            const sortByPatted = Array.from(leaderboard).sort(
                (a, b) => (b.patted || 0) - (a.patted || 0)
            );

            const pages = Math.ceil(leaderboard.length / 5) || 1;
            const fields = Array(pages)
                .fill('')
                .map((_, i) => [
                    {
                        name: 'Top Patter',
                        value: Array(5)
                            .fill('')
                            .map((_, j) =>
                                sortByPat[i * 5 + j]
                                    ? `#${i * 5 + j + 1} : <@!${
                                          sortByPat[i * 5 + j].memberId
                                      }> \`${
                                          sortByPat[i * 5 + j].pat || 0
                                      } Pats\``
                                    : `#${i * 5 + j + 1} : `
                            )
                            .join('\n'),
                        inline: true,
                    },
                    {
                        name: 'Top Patted',
                        value: Array(5)
                            .fill('')
                            .map((_, j) =>
                                sortByPatted[i * 5 + j]
                                    ? `#${i * 5 + j + 1} : <@!${
                                          sortByPatted[i * 5 + j].memberId
                                      }> \`${
                                          sortByPatted[i * 5 + j].patted || 0
                                      } Patted\``
                                    : `#${i * 5 + j + 1} : `
                            )
                            .join('\n'),
                        inline: true,
                    },
                ])
                .flat();
            const embeds = Array(pages)
                .fill('')
                .map((_, i) =>
                    new Discord.MessageEmbed()
                        .setColor('#6ba4a5')
                        .setAuthor(
                            'Pat Leaderboard',
                            'https://media1.tenor.com/images/3f3e1d2187bc5815c2dc3cbcb075535f/tenor.gif?itemid=15118749'
                        )
                        .addFields(fields.slice(i * 2, i * 2 + 2))
                );
            await sendLeaderboard(channel, embeds, pages);
            return;
        }
        await channel.send('`Mhm... You are patting no one.`');
        return;
    }

    if (patMember.id === author.id) {
        await channel.send(
            '`It is good to love yourself, but you cannot pat yourself.`'
        );
        return;
    }

    if (!patMember.manageable) {
        await channel.send('`This member cannot be pat.`');
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

    spankedData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'data', 'spankData.json'), {
            encoding: 'utf-8',
        })
    ) as SpankData;
    spankedData.servers[guild.id] = spankedData.servers[guild.id] || {};
    spankedData.servers[guild.id][patMember.id] =
        spankedData.servers[guild.id][patMember.id] || {};
    spankedData.servers[guild.id][author.id] =
        spankedData.servers[guild.id][author.id] || {};
    spankedData.servers[guild.id][patMember.id].patted =
        (spankedData.servers[guild.id][patMember.id].patted || 0) + 1;
    spankedData.servers[guild.id][author.id].pat =
        (spankedData.servers[guild.id][patMember.id].pat || 0) + 1;

    fs.writeFileSync(
        path.join(__dirname, '..', 'data', 'spankData.json'),
        JSON.stringify(spankedData)
    );

    await Promise.all([
        await patMember.roles.remove(spankedRole),
        await patMember.setNickname(nickname),
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('**PAT**')
                .setColor('#34ebb4')
                .setDescription(
                    `${patMember.toString()} has been pat by ${author.toString()}.${
                        spanked
                            ? ` ${patMember.toString()} is no longer ${spankedRole.toString()}.`
                            : ''
                    }`
                )
                .setImage(
                    `https://media1.tenor.com/images/3f3e1d2187bc5815c2dc3cbcb075535f/tenor.gif?itemid=15118749`
                )
        ),
    ]);
}
