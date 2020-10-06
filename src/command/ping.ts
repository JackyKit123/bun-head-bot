import * as Discord from 'discord.js';

export default async function ping(message: Discord.Message): Promise<void> {
    const { createdTimestamp, channel } = message;

    const latency = new Date().valueOf() - createdTimestamp;
    await channel.send(
        new Discord.MessageEmbed()
            .setTitle('Pong')
            .setDescription(`Time elapsed: ${latency}ms`)
            .setColor('#34ebb4')
            .setThumbnail(
                'https://cdn.discordapp.com/avatars/762967844781817906/a6fae5fd26f33cce0a337b76e17442cb.png?size=256'
            )
    );
}
