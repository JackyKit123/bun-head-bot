import * as Discord from 'discord.js';
import axios from 'axios';

export default async function giphy(message: Discord.Message): Promise<void> {
    const { content, channel, author } = message;
    const searchString = content
        .replace(/[^\040-\176\200-\377]/gi, '')
        .replace(/^\\?-usagi giphy ?/, '');

    let { data } = await axios.get(
        `https://api.giphy.com/v1/gifs/search?api_key=${
            process.env.GIPHY_API_KEY
        }&q=${encodeURI(searchString)}&lang=en`
    );
    let results = data.data;
    const embed = new Discord.MessageEmbed()
        .setColor('#34ebb4')
        .setFooter(
            `Requested by ${author.username}#${author.discriminator}`,
            author.displayAvatarURL()
        );
    if (!results.length) {
        data = (
            await axios.get(
                `https://api.giphy.com/v1/gifs/random?api_key=${process.env.GIPHY_API_KEY}&lang=en`
            )
        ).data;
        results = data.data;
        const randomGif = results;
        const { id } = randomGif;
        await channel.send(
            searchString
                ? `Cannot find a gif for \`${searchString}\`, how about we look at a random one?`
                : undefined,
            embed
                .setTitle('Random Gif')
                .setImage(`https://media1.giphy.com/media/${id}/giphy.gif`)
        );
    } else {
        const randomGif = results[Math.floor(Math.random() * results.length)];
        const { id } = randomGif;
        await channel.send(
            embed
                .setTitle(searchString)
                .setImage(`https://media1.giphy.com/media/${id}/giphy.gif`)
        );
    }
}
