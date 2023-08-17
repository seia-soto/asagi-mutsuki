import {type Message, type PossiblyUncachedTextableChannel} from 'eris';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

// eslint-disable-next-line no-bitwise
const suppressEmbeds = 1 << 2;

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	const xLinkPattern = /https?:\/\/(?:x|twitter|fxtwitter)\.com\/\w+(?:\/status\/\d+)?/gmi;
	const links = [...message.content.matchAll(xLinkPattern)];

	if (!links.length) {
		return;
	}

	const {discord} = mutsuki.integrations;

	aContext();

	const content = links
		.map(link => link.toString().split('/').slice(1).join('/'))
		.map(link => (link.includes('/status/') ? 'https://vxtwitter.com/' : 'https://twitter.com/') + link)
		.join('\n');

	if (links[0].toString() === message.content) {
		await Promise.all([
			discord.client.createMessage(message.channel.id, {
				allowedMentions: {
					users: true,
				},
				content: `<@${message.author.id}> — ${content}`,
			}),
			discord.client.deleteMessage(message.channel.id, message.id),
		]);
	} else {
		await Promise.all([
			discord.client.createMessage(message.channel.id, {
				allowedMentions: {
					repliedUser: false,
				},
				content,
				messageReference: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					messageID: message.id,
				},
			}),
			discord.client.editMessage(message.channel.id, message.id, {
				// eslint-disable-next-line no-bitwise
				flags: suppressEmbeds | message.flags,
			}),
		]);
	}
});

export const enableXtwitterTransition = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info({
		feature: 'xTwitterTransition',
		integration: 'discord',
		state: 'enabled',
	}, 'enabled x-twitter transition');
};
