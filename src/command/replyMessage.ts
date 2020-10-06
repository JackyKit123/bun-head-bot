import * as Discord from 'discord.js';

export default async function replyMessage(
    message: Discord.Message
): Promise<void> {
    const { channel, content } = message;

    const [, command] = content.split(' ');

    const messageToReply = {
        boys: 'Boys will be boys.',
        girls: 'Girls will be girls.',
    } as { [key: string]: string };
    await channel.send(
        new Discord.MessageEmbed()
            .setTitle(messageToReply[command])
            .setColor('#34ebb4')
    );
}
