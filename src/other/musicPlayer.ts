import * as Discord from 'discord.js';
import axios from 'axios';
import * as ytdl from 'ytdl-core';
import * as ytsr from 'ytsr';
import * as ytpl from 'ytpl';

interface Queue {
    url: string;
    title: string;
    duration: string;
}

interface queueConstruct {
    voiceChannel?: Discord.VoiceChannel;
    connection?: Discord.VoiceConnection;
    playing: boolean;
    queue: Queue[];
    shuffle: boolean;
}

export default class MusicPlayer {
    private client: Discord.Client;
    private serversQueue = new Map<string, queueConstruct>();
    private spotifyAccessToken: null | string = null;

    constructor(client: Discord.Client) {
        this.client = client;
        this.loginSpotify();
    }

    private async loginSpotify(): Promise<void> {
        const res = await axios.post(
            `https://accounts.spotify.com/api/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                    ).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        this.spotifyAccessToken = res.data.access_token;
        setTimeout(() => (this.spotifyAccessToken = null), 3600000);
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

    private async searchYoutube(
        searchString: string,
        limit: number,
        safeSearch: boolean
    ): Promise<ytsr.Result> {
        try {
            const filters = await ytsr.getFilters(searchString);
            const filter1 = filters.get('Type')?.find(o => o.name === 'Video');
            const filters2 = await ytsr.getFilters(
                filter1?.ref || searchString
            );
            const filter2 = filters2
                .get('Duration')
                ?.find(o => o.name.startsWith('Short'));
            const searchResults = await ytsr(null, {
                limit,
                safeSearch,
                nextpageRef: filter2?.ref || undefined,
            });
            return searchResults;
        } catch (err) {
            if (err.message === 'Unexpected token < in JSON at position 0') {
                return this.searchYoutube(searchString, limit, safeSearch);
            }
            throw err;
        }
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
        const { nsfw } = channel as Discord.TextChannel;
        const isSpotifyPlayList = arg.match(
            /spotify(?:\.com)?(?:\/user\/.+)?[/:]playlist[/:](.+)[\s?]/
        );
        const isSpotifyTrack = arg.match(
            /spotify(?:\.com)?[/:]track[/:](.+)[\s?]/
        );
        const isYoutubePlaylist = arg.match(/[&?]list=([^&]+)/);
        channel.startTyping();
        if (ytdl.validateURL(arg)) {
            const { videoDetails } = await ytdl.getBasicInfo(arg);
            await this.addVideoInfoToQueue(
                guild,
                voiceChannel,
                channel as Discord.TextChannel,
                {
                    url: videoDetails.video_url,
                    title: videoDetails.title,
                    duration: `${Math.floor(
                        Number(videoDetails.lengthSeconds) / 60
                    )}:${Number(videoDetails.lengthSeconds) % 60}`,
                }
            );
            return;
        }
        if (isSpotifyPlayList) {
            const playListId = isSpotifyPlayList[1];
            if (!this.spotifyAccessToken) {
                await this.loginSpotify();
            }
            const res = await axios.get(
                `https://api.spotify.com/v1/playlists/${playListId}/tracks`,
                {
                    headers: {
                        Authorization: `Bearer ${this.spotifyAccessToken}`,
                    },
                }
            );
            const { data } = res;
            const tracks = (data.items as {
                track: {
                    name: string;
                    is_local: boolean;
                    artists: {
                        name: string;
                    }[];
                };
            }[])
                .filter(item => !item.track.is_local)
                .map(
                    item =>
                        `${item.track.name} ${item.track.artists
                            .map(artist => artist.name)
                            .join(' ')}`
                );
            const results = await Promise.all(
                tracks
                    .map(async track => {
                        const data = (await this.searchYoutube(track, 1, !nsfw))
                            .items[0] as ytsr.Video;
                        if (!data) return null;
                        return {
                            url: data.link,
                            title: data.title,
                            duration: data.duration || '0:0',
                        };
                    })
                    .filter(result => result) as Promise<Queue>[]
            );
            await this.addVideoInfoToQueue(
                guild,
                voiceChannel,
                channel as Discord.TextChannel,
                results
            );
            return;
        }
        if (isSpotifyTrack) {
            const trackId = isSpotifyTrack[1];
            if (!this.spotifyAccessToken) {
                await this.loginSpotify();
            }
            const res = await axios.get(
                `https://api.spotify.com/v1/tracks/${trackId}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.spotifyAccessToken}`,
                    },
                }
            );
            const { data } = res;
            const track = data as {
                name: string;
                is_local: boolean;
                artists: {
                    name: string;
                }[];
            };
            const result = (
                await this.searchYoutube(
                    `${track.name} ${track.artists
                        .map(artist => artist.name)
                        .join(' ')}`,
                    1,
                    !nsfw
                )
            ).items[0] as ytsr.Video;
            if (!result) {
                throw new Error(
                    `Cannot find music for track \`${track.name}\`.`
                );
            }
            await this.addVideoInfoToQueue(
                guild,
                voiceChannel,
                channel as Discord.TextChannel,
                {
                    url: result.link,
                    title: result.title,
                    duration: result.duration || '0:0',
                }
            );
            return;
        }
        if (isYoutubePlaylist) {
            const playlistID = isYoutubePlaylist[1];
            const playlist = await ytpl(playlistID);
            const results = playlist.items.map(item => ({
                url: item.url,
                title: item.title,
                duration: item.duration || '0:0',
            }));
            await this.addVideoInfoToQueue(
                guild,
                voiceChannel,
                channel as Discord.TextChannel,
                results
            );
            return;
        }
        const searchResults = await this.searchYoutube(arg, 5, !nsfw);
        const items = searchResults.items as ytsr.Video[];
        const messageEmbed = new Discord.MessageEmbed()
            .setAuthor(
                'Youtube Search Results',
                'https://cdn4.iconfinder.com/data/icons/social-messaging-ui-color-shapes-2-free/128/social-youtube-circle-512.png',
                `https://www.youtube.com/results?search_query=${encodeURI(arg)}`
            )
            .setColor('#34ebb4')
            .setDescription(
                `Here are the search results for ${arg}, type \`1-5\` to select the song.`
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
                    !!newMessage.content.match(/^(\\?-usagi play ?)|^[1-5]$/i),
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
                    {
                        url: items[answer - 1].link,
                        title: items[answer - 1].title,
                        duration: items[answer - 1].duration || '0:0',
                    }
                );
            }
        } catch {
            await sentMessage.edit(
                'Selection command expired, please use `-usagi play` to select new song',
                messageEmbed
            );
        }
    }

    private async addVideoInfoToQueue(
        guild: Discord.Guild,
        voiceChannel: Discord.VoiceChannel,
        textChannel: Discord.TextChannel,
        videoInfo: Queue | Queue[]
    ): Promise<void> {
        const serverQueue = this.serversQueue.get(guild.id) || {
            voiceChannel,
            playing: false,
            queue: [] as Queue[],
            shuffle: false,
        };
        if (Array.isArray(videoInfo)) {
            serverQueue.queue = [...serverQueue.queue, ...videoInfo];
            await textChannel.send(
                `Added \`${videoInfo.length} tracks\` to the queue.`
            );
        } else {
            serverQueue.queue.push(videoInfo);
            await textChannel.send(
                `Added \`${videoInfo.title}\` to the queue.`
            );
        }
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
        let nextSong = serverQueue.queue[0];
        if (serverQueue.shuffle) {
            const randomNext = Math.floor(
                Math.random() * serverQueue.queue.length
            );
            nextSong = serverQueue.queue[randomNext];
            serverQueue.queue.splice(randomNext, 1);
            serverQueue.queue.unshift(nextSong);
        }
        if (!replay && serverQueue.playing) {
            return;
        }
        serverQueue.playing = true;
        connection
            .play(
                ytdl(nextSong.url, {
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
        serverQueue.connection?.dispatcher?.end();
        serverQueue.connection = undefined;
        if (stop) {
            serverQueue.queue = [];
            await channel.send(`Stopped everything and cleared and the queue.`);
        } else {
            await channel.send(`Skipped \`${serverQueue.queue[0].title}\`…`);
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
            return {
                name:
                    i === 0
                        ? `**Now Playing: ${videoInfo.title}**`
                        : `#${i + 1}: ${videoInfo.title}`,
                value: `Length: \`${videoInfo.duration}\``,
            };
        });
        const pages = Math.ceil(serverQueue.queue.length / 10);
        let currentPage = 0;
        const embeds = Array(pages)
            .fill('')
            .map((_, i) =>
                new Discord.MessageEmbed()
                    .setTitle('Music Queue')
                    .setDescription(
                        `This is the current music queue. There are \`${
                            serverQueue.queue.length
                        }\` songs in the queue at the moment. Shuffle mode has been toggled ${
                            serverQueue.shuffle ? 'on' : 'off'
                        }.`
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

    public async toggleShuffle(message: Discord.Message): Promise<void> {
        const { guild, channel, content } = message;
        const shuffle = content.split(' ')[2];
        if (!guild) {
            await channel.send(`This command can only be used in a server`);
            return;
        }
        const serverQueue = this.serversQueue.get(guild.id) || {
            playing: false,
            queue: [] as Queue[],
            shuffle: false,
        };
        if (shuffle === 'on') {
            serverQueue.shuffle = true;
        } else if (shuffle === 'off') {
            serverQueue.shuffle = false;
        } else if (shuffle === 'toggle') {
            serverQueue.shuffle = !serverQueue.shuffle;
        } else {
            await channel.send(
                'Please specify `on` `off` `toggle` for the shuffle command.'
            );
            return;
        }
        this.serversQueue.set(guild.id, serverQueue);
        await channel.send(
            `The queue will now be played in ${
                serverQueue.shuffle ? 'random' : 'order'
            }.`
        );
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
