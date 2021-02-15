import * as Discord from 'discord.js';

const snipeStore = {
    snipe: new Map<string, Discord.Message>(),
    editsnipe: new Map<string, Discord.Message>(),
};

export async function snipeListener(
    type: 'edit' | 'delete',
    message: Discord.Message | Discord.PartialMessage
): Promise<void> {
    if (message.partial) {
        if (type === 'delete') {
            return;
        }
        // eslint-disable-next-line no-param-reassign
        message = await message.fetch();
    }

    const { guild, channel, author } = message;

    if (guild?.id !== process.env.COMMUNITY_SERVER_ID || author.bot) {
        return;
    }

    snipeStore[type === 'delete' ? 'snipe' : 'editsnipe'].set(
        channel.id,
        message
    );
}

export default async function snipe(message: Discord.Message): Promise<void> {
    const { member, channel, content, author } = message;
    const command = content.toLowerCase().trim();

    if (!member) {
        return;
    }

    const sniped = snipeStore[
        command.toLowerCase() === '!snipe' ? 'snipe' : 'editsnipe'
    ].get(channel.id);

    if (!sniped) {
        await channel.send("There's nothing to snipe here");
        return;
    }

    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${sniped.author.username}#${sniped.author.discriminator}`,
            sniped.author.displayAvatarURL({
                dynamic: true,
            })
        )
        .setDescription(sniped.content)
        .setFooter(`Sniped by: ${author.username}#${author.discriminator}`)
        .setTimestamp();

    if (sniped.member && sniped.member.displayHexColor !== '#000000') {
        embed = embed.setColor(sniped.member?.displayHexColor);
    }

    await channel.send(embed);
}
