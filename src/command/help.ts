import * as Discord from 'discord.js';

export const commandList = [
    {
        command: '`-usagi ping`',
        description: 'Ping the bot.',
    },
    {
        command: '`-usagi boys`',
        description: '*boys will be boys*',
    },
    {
        command: '`-usagi girls`',
        description: '*girls will be girls*',
    },
    {
        command: '`-usagi customrole <color> <rolename>`',
        description: 'Assign yourself a custom role!',
    },
    {
        command: '`-usagi play <search|url>`',
        description:
            'Play music by supplying search param or youtube video url. Currently supporting: *Youtube Video*, *Youtube Playlist*, *Spotify Track*, *Spotify Playlist*',
    },
    {
        command: '`-usagi replay`',
        description: 'Replay the current music.',
    },
    {
        command: '`-usagi skip [index]`',
        description:
            'Skip the current music, if provided an optional parameter, you can remove certain index of song from the queue.',
    },
    {
        command: '`-usagi shuffle <on|off|toggle>`',
        description: 'Toggle the shuffle mode for music',
    },
    {
        command: '`-usagi stop`',
        description:
            'Skip the current music and clear the current music queue.',
    },
    {
        command: '`-usagi queue`',
        description: 'Show the current music queue.',
    },
    {
        command: '`-usagi ban-all`',
        description:
            '`ADMINISTRATOR` only, cast a fake ban-all command to scare your server member.',
    },
    {
        command: '`-usagi spank @Member`',
        description: 'Spank a member.',
    },
    {
        command: '`-usagi randomfact`',
        description: 'Tells you a random fact',
    },
    {
        command: '`-usagi giphy <search target>`',
        description: 'Search and send a gif from giphy',
    },
    {
        command: '`-usagi pat @Member`',
        description: 'Pat a member. Removing their spanked role.',
    },
    {
        command: '`-usagi spank leaderboard`',
        description: 'Leaderboard for whoever spank, being spanked the most.',
    },
    {
        command: '`-usagi pat leaderboard`',
        description: 'Leaderboard for whoever pat, being patted the most.',
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
