import * as Discord from 'discord.js';
import * as stringSimilarity from 'string-similarity';
import banAll from './command/fakebanall';
import help, { commandList } from './command/help';
import ping from './command/ping';
import replyMessage from './command/replyMessage';
import { spank, pat } from './command/spank';
import logMessage from './dev-command/logMessage';
import eightball from './other/8ball';

// eslint-disable-next-line no-console
console.log('Starting client...');
const client = new Discord.Client();

client.on('ready', () => {
    client.user?.setActivity('-usagi help', {
        type: 'PLAYING',
    });
    const bootMessage = `Timestamp: ${new Date().toTimeString()}, bot is booted on ${
        process.env.NODE_ENV
    }`;
    logMessage(client, bootMessage);
    // eslint-disable-next-line no-console
    console.log(bootMessage);
});

client.on('message', async message => {
    const { content, channel, guild, author } = message;
    const [suffix, command] = content.split(' ');

    if (author.bot) {
        return;
    }

    eightball(message);

    if (!suffix.replace(/[^\040-\176\200-\377]/gi, '').match(/^\\?-usagi\b/i)) {
        return;
    }

    const { NODE_ENV, DEV_TEST_CHANNEL_ID } = process.env;
    if (
        (NODE_ENV === 'production' && channel.id === DEV_TEST_CHANNEL_ID) ||
        (NODE_ENV === 'development' && channel.id !== DEV_TEST_CHANNEL_ID)
    ) {
        return;
    }

    try {
        switch (command?.toLowerCase()) {
            case 'ping':
                await ping(message);
                break;
            case 'boys':
            case 'girls':
                await replyMessage(message);
                break;
            case 'ban-all':
                await banAll(message);
                break;
            case 'spank':
                await spank(message);
                break;
            case 'pat':
                await pat(message);
                break;
            case 'help':
                await help(message);
                break;
            case undefined:
            case '':
                await channel.send(
                    'I am Sailor Moon, the champion of justice. In the name of the moon, I will right wrong and triumph over evil… Do you need me? type `-usagi help`'
                );
                break;
            default: {
                const listOfCommands = Object.values(commandList).map(
                    command => command.command
                );
                const { bestMatch } = stringSimilarity.findBestMatch(
                    command,
                    listOfCommands
                );
                if (bestMatch.rating >= 0.5) {
                    const sentMessage = await channel.send(
                        `I am Sailor Moon, the champion of justice. In the name of the moon, I will right wrong and triumph over evil… but I don't understand your command for \`${command}\`. Did you mean to do \`-usagi ${bestMatch.target}\`? You may answer \`Yes\` to execute the new command.`
                    );
                    let answeredYes = false;
                    try {
                        const awaitedMessage = await channel.awaitMessages(
                            (newMessage: Discord.Message) =>
                                newMessage.author === message.author &&
                                !!newMessage.content
                                    .replace(/[^\040-\176\200-\377]/gi, '')
                                    .match(/^(y(es)?|no?|\\?-usagi ?)/i),
                            { time: 60000, max: 1, errors: ['time'] }
                        );
                        if (
                            awaitedMessage
                                .first()
                                ?.content.replace(/[^\040-\176\200-\377]/gi, '')
                                .match(/^y(es)?/i)
                        ) {
                            await awaitedMessage.first()?.delete();
                            answeredYes = true;
                        }
                    } catch {
                        await sentMessage.edit(
                            `I am Sailor Moon, the champion of justice. In the name of the moon, I will right wrong and triumph over evil… but I don't understand your command for \`${command}\`. Did you mean to do \`-usagi ${bestMatch.target}\`?`
                        );
                    }
                    if (answeredYes) {
                        const editedCommandString = content
                            .replace(/[^\040-\176\200-\377]/gi, '')
                            .replace(
                                `-usagi ${command}`,
                                `-usagi ${bestMatch.target}`
                            );
                        // eslint-disable-next-line no-param-reassign
                        message.content = editedCommandString;
                        client.emit('message', message);
                        await sentMessage.delete();
                    } else {
                        await sentMessage.edit(
                            `I am Sailor Moon, the champion of justice. In the name of the moon, I will right wrong and triumph over evil… but I don't understand your command for \`${command}\`. Did you mean to do \`-usagi ${bestMatch.target}\`?`
                        );
                    }
                } else {
                    await channel.send(
                        `I am Sailor Moon, the champion of justice. In the name of the moon, I will right wrong and triumph over evil… but I don't understand your command for \`${command}\`. If you need help, type \`-usagi help\``
                    );
                }
            }
        }
    } catch (err) {
        try {
            await channel.send(`Oops, something went wrong: ${err.message}`);

            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${author.id}>`
                } : ${
                    err.message
                }\nCommand Attempting to execute:\`${content}\``
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
});

client.login(process.env.BOT_TOKEN);

process.on('exit', () => client.destroy());
