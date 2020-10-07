import * as Discord from 'discord.js';
import axios from 'axios';

export default async function gifhy(message: Discord.Message): Promise<void> {
    const { content, channel, author } = message;
    const searchString = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace('-usagi gifhy ', '');
    if (!searchString) {
        await channel.send(
            'You need to specify a search string as in `-usagi gif <search target>`'
        );
        return;
    }

    const { data } = await axios.get(
        `https://api.giphy.com/v1/gifs/search?api_key=${
            process.env.GIPHY_API_KEY
        }&q=${encodeURI(searchString)}&limit=1&lang=en`
    );
    const { url } = data.data?.[0]?.images?.original;
    await channel.send(
        new Discord.MessageEmbed()
            .setColor('#34ebb4')
            .setTitle(searchString)
            .setImage(url)
            .setFooter(
                `Requested by ${author.username}#${author.discriminator}`,
                author.displayAvatarURL()
            )
    );
}
