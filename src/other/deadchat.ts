import * as Discord from 'discord.js';
import axios from 'axios';

export default async function randomfact(
    message: Discord.Message,
    fromCommand: boolean
): Promise<void> {
    const { content, channel } = message;

    if (
        fromCommand ||
        /((?=.*\bdead\b)(?=.*\bchat\b)|(?=.*\bdeadchat\b)).*/.test(content)
    ) {
        const { data } = await axios.get(
            'https://uselessfacts.jsph.pl/random.json?language=en'
        );
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Did you know?')
                .setDescription(data.text)
                .setColor('#34ebb4')
        );
    }
}
