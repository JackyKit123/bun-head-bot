import * as Discord from 'discord.js';

export default async function banAll(message: Discord.Message): Promise<void> {
    const { channel, guild, member } = message;
    if (!guild || !member?.hasPermission('ADMINISTRATOR')) {
        await channel.send(
            'This command is only available as `ADMINISTRATOR` in server chat.'
        );
        return;
    }
    const list = guild.members.cache.map(
        member => `\`${member.user.username}#${member.user.discriminator}\``
    );
    const sentMessage = await channel.send('Banning all members: ...');
    let i = 0;
    const timeout = setInterval(async () => {
        if (i > list.length) {
            clearInterval(timeout);
            await sentMessage.edit(
                `Banning all members: ... \nBanned: ${list.join(
                    ' '
                )}\nAll members are successfully banned.`
            );
            return;
        }
        await sentMessage.edit(
            `Banning all members: ... \nBanned: ${list
                .filter((_, j) => j <= i)
                .join(' ')}`
        );
        i += 1;
    }, 1000);
}
