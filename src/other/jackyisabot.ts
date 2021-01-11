import * as Discord from 'discord.js';

export default async function eightball(
    message: Discord.Message
): Promise<void> {
    const { channel, content, author, member, attachments } = message;

    if (
        author.id === '195174308052467712' &&
        channel.type === 'text' &&
        member
    ) {
        const webhook = await channel.createWebhook(member.displayName, {
            avatar: author.avatarURL({ dynamic: true }) || undefined,
        });

        await webhook.send(
            content,
            attachments.map(attachment =>
                attachment.url.match(/\.(gif|jpe?g|tiff?|png|webp|bmp)/i)
                    ? new Discord.MessageEmbed().setImage(attachment.url)
                    : attachment
            )
        );
        await message.delete();
        await webhook.delete();
        return;
    }
}
