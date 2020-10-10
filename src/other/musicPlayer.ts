import * as Discord from 'discord.js';
import * as ytdl from 'ytdl-core';
import * as ytsr from 'ytsr';

interface queueConstruct {
    voiceChannel?: Discord.VoiceChannel;
    connection?: Discord.VoiceConnection;
    playing: boolean;
    queue: ytdl.videoInfo[];
}

export default class MusicPlayer {
    private client: Discord.Client;
    private serversQueue = new Map<string, queueConstruct>();

    constructor(client: Discord.Client) {
        this.client = client;
    }

    private parseArg(raw: string): string {
        return raw.replace(/^\\?-usagi \w+ ?/i, '');
    }

    private async checkPermission(
        message: Discord.Message
    ): Promise<Discord.VoiceChannel | undefined> {
        const { channel, member } = message;
        const { user } = this.client;
        const voiceChannel = member?.voice.channel;
        if (!voiceChannel) {
            await channel.send(
                'You need to be in a voice channel to play music!'
            );
            return undefined;
        }

        const permissions = voiceChannel.permissionsFor(
            user as Discord.ClientUser
        );
        if (!permissions?.has('CONNECT') || !permissions?.has('SPEAK')) {
            await channel.send(
                'I need the permissions to join and speak in your voice channel!'
            );
            return undefined;
        }
        return voiceChannel;
    }

    public async addSong(message: Discord.Message): Promise<void> {
        const { guild, channel, content } = message;
        if (!guild) {
            await channel.send(`This command can only be used in a server`);
            return;
        }
        const arg = this.parseArg(content);
        if (!arg) {
            await channel.send(
                `You need to provide a search parameter or a video url.`
            );
            return;
        }
        const voiceChannel = await this.checkPermission(message);
        if (!voiceChannel) {
            return;
        }
        if (!ytdl.validateURL(arg)) {
            channel.startTyping();
            const filters = await ytsr.getFilters(arg);
            const filter1 = filters.get('Type')?.find(o => o.name === 'Video');
            const filters2 = await ytsr.getFilters(filter1?.ref || arg);
            const filter2 = filters2
                .get('Duration')
                ?.find(o => o.name.startsWith('Short'));
            const searchResults = await ytsr(null, {
                limit: 5,
                safeSearch: !(channel as Discord.TextChannel).nsfw,
                nextpageRef: filter2?.ref || undefined,
            });
            const items = searchResults.items as ytsr.Video[];
            const messageEmbed = new Discord.MessageEmbed()
                .setAuthor(
                    'Youtube Search Results',
                    'https://cdn4.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-youtube-circle-512.png',
                    `https://www.youtube.com/results?search_query=${encodeURI(
                        arg
                    )}`
                )
                .setColor('#34ebb4')
                .setDescription(
                    `Here are the search results for ${arg}, use \`1-5\` to select the song.`
                )
                .addFields(
                    items.map((item, i) => ({
                        name: `${i + 1}. ${item.title}`,
                        value: `Duration: \`${item.duration}\``,
                    }))
                );
            const sentMessage = await channel.send(messageEmbed);
            channel.stopTyping();
            let answer = 0;
            try {
                const awaitedMessage = await channel.awaitMessages(
                    (newMessage: Discord.Message) =>
                        newMessage.author === message.author &&
                        !!newMessage.content.match(
                            /^(\\?-usagi play ?)|^[1-5]$/i
                        ),
                    { time: 60000, max: 1, errors: ['time'] }
                );
                channel.startTyping();
                const selection = awaitedMessage.first()?.content;
                if (Number(selection)) {
                    answer = Number(selection);
                    await this.addVideoInfoToQueue(
                        guild,
                        voiceChannel,
                        channel as Discord.TextChannel,
                        await ytdl.getInfo(items[answer - 1].link)
                    );
                }
            } catch {
                await sentMessage.edit(
                    'Selection command expired, please use `-usagi play` to select new song',
                    sentMessage
                );
            }
        } else {
            await this.addVideoInfoToQueue(
                guild,
                voiceChannel,
                channel as Discord.TextChannel,
                await ytdl.getInfo(arg)
            );
        }
    }

    private async addVideoInfoToQueue(
        guild: Discord.Guild,
        voiceChannel: Discord.VoiceChannel,
        textChannel: Discord.TextChannel,
        videoInfo: ytdl.videoInfo
    ): Promise<void> {
        const serverQueue = this.serversQueue.get(guild.id) || {
            voiceChannel,
            playing: false,
            queue: [] as ytdl.videoInfo[],
        };
        serverQueue.queue.push(videoInfo);
        await textChannel.send(
            `Added \`${videoInfo.videoDetails.title}\` to the queue.`
        );
        textChannel.stopTyping();
        this.serversQueue.set(guild.id, serverQueue);
        await this.play(serverQueue);
    }

    private async play(
        serverQueue: queueConstruct,
        replay?: true
    ): Promise<void> {
        const connection =
            serverQueue.connection || (await serverQueue.voiceChannel?.join());
        if (!connection) {
            throw new Error('Cannot create connection into voice channel.');
        }
        serverQueue.connection = connection;
        const nextSong = serverQueue.queue[0];
        if (!replay && serverQueue.playing) {
            return;
        }
        serverQueue.playing = true;
        connection
            .play(
                ytdl(nextSong.videoDetails.video_url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                }),
                { volume: 1 }
            )
            .on('finish', () => {
                serverQueue.playing = false;
                serverQueue.queue.shift();
                if (serverQueue.queue.length) {
                    this.play(serverQueue);
                }
            });
    }

    public async replay(message: Discord.Message): Promise<void> {
        const { guild, channel } = message;
        if (!guild) {
            await channel.send(`This command can only be used in a server`);
            return;
        }
        const serverQueue = this.serversQueue.get(guild.id);
        if (!serverQueue || !serverQueue.playing) {
            await channel.send(
                `Nothing is currently being played, unable to restart.`
            );
            return;
        }
        await channel.send(`Replayig \`${serverQueue.queue[0].title}\`…`);
        this.play(serverQueue, true);
    }

    public async skip(message: Discord.Message, stop?: true): Promise<void> {
        const { guild, channel } = message;
        if (!guild) {
            await channel.send(`This command can only be used in a server.`);
            return;
        }
        const serverQueue = this.serversQueue.get(guild.id);
        if (!serverQueue || !serverQueue.queue.length) {
            await channel.send(
                `The queue is empty, there is nothing to ${
                    stop ? 'stop' : 'skip'
                }`
            );
            return;
        }
        serverQueue.connection?.dispatcher.end();
        if (stop) {
            serverQueue.queue = [];
            await channel.send(`Stopped everything and cleared and the queue.`);
        } else {
            await channel.send(
                `Skipped \`${serverQueue.queue[0].videoDetails.title}\`…`
            );
        }
    }

    public async showQueue(message: Discord.Message): Promise<void> {
        const { guild, channel, author } = message;
        if (!guild) {
            await channel.send(`This command can only be used in a server.`);
            return;
        }
        const serverQueue = this.serversQueue.get(guild.id);
        if (!serverQueue?.queue.length) {
            await channel.send(
                'The queue is currently empty, use `-usagi play` to start playing music.`'
            );
            return;
        }
        const embedField = serverQueue.queue.map((videoInfo, i) => {
            const duration = `${Math.floor(
                Number(videoInfo.videoDetails.lengthSeconds) / 60
            )}:${Number(videoInfo.videoDetails.lengthSeconds) % 60}`;
            return {
                name:
                    i === 0
                        ? `**Now Playing: ${videoInfo.videoDetails.title}**`
                        : `#${i + 1}: ${videoInfo.videoDetails.title}`,
                value: `Length: \`${duration}\``,
            };
        });
        const totalDurationSeconds = serverQueue.queue
            .map(videoInfo => Number(videoInfo.videoDetails.lengthSeconds))
            .reduce((acc, curVal) => acc + curVal);
        const pages = Math.ceil(serverQueue.queue.length / 10);
        let currentPage = 0;
        const embeds = Array(pages)
            .fill('')
            .map((_, i) =>
                new Discord.MessageEmbed()
                    .setTitle('Music Queue')
                    .setDescription(
                        `This is the current Music Queue. There are \`${
                            serverQueue.queue.length
                        }\` songs in the queue At the moment. It takes \`${Math.floor(
                            totalDurationSeconds / 60
                        )}:${totalDurationSeconds % 60}\` to Finish the queue.`
                    )
                    .setColor('#6ba4a5')
                    .setFooter(
                        `Requested by ${author.username}#${author.discriminator}`,
                        author.displayAvatarURL()
                    )
                    .addFields(embedField.slice(i * 10, i * 10 + 10))
            );
        const sentMessage = await channel.send(embeds);
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

    public disconnect(guildId: string): void {
        const serverQueue = this.serversQueue.get(guildId);
        if (serverQueue) {
            serverQueue.connection?.dispatcher.end();
            serverQueue.connection = undefined;
            serverQueue.queue = [];
            serverQueue.voiceChannel?.leave();
        }
    }
}
