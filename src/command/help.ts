import * as Discord from 'discord.js';

export const commandList = [
    {
        command: '-usagi ping',
        description: 'Ping the bot.',
    },
    {
        command: '-usagi boys',
        description: '*boys will be boys*',
    },
    {
        command: '-usagi girls',
        description: '*girls will be girls*',
    },
    {
        command: '-usagi ban-all',
        description:
            '`ADMINISTRATOR` only, cast a fake ban-all command to scare your server member.',
    },
];

export default async function help(message: Discord.Message): Promise<void> {
    const { channel, author } = message;

    const helpMessage = new Discord.MessageEmbed()
        .setTitle('List of Commands')
        .setAuthor(
            'Bun Head',
            'https://cdn.discordapp.com/avatars/762967844781817906/a6fae5fd26f33cce0a337b76e17442cb.png?size=256'
        )
        .setColor('#34ebb4')
        .setDescription(
            'Here is a list commands, Bun Head bot suffix is `-usagi`'
        )
        .addFields(
            commandList.map(command => ({
                name: command.command,
                value: command.description,
            }))
        );

    await author.send(helpMessage);
    if (channel.type === 'text')
        await channel.send(
            '`The list of commands has been sent to your via DM.`'
        );
}
