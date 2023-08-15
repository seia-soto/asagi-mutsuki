import {type Client, type Message, type PossiblyUncachedTextableChannel} from 'eris';

import {downstreamEvents} from '../downstream.js';
import {uncontrollableChannels} from '../limit.js';

// eslint-disable-next-line no-bitwise
const suppressEmbeds = 1 << 2;

const handleMessageCreate = async (client: Client, message: Message<PossiblyUncachedTextableChannel>) => {
	const xLinkPattern = /x\.com\/[^ ?\n]+/gi;
	const links = [...message.content.matchAll(xLinkPattern)];

	if (!links.length) {
		return;
	}

	const isChannelControllable = uncontrollableChannels.consume(message.channel.id);

	if (!isChannelControllable) {
		return;
	}

	const response = await (async () => {
		await Promise.all([
			client.createMessage(message.channel.id, {
				allowedMentions: {
					repliedUser: false,
				},
				content: links.map(link => 'https://' + link.toString().replace('x.com', 'twitter.com')).join('\n'),
				messageReference: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					messageID: message.id,
				},
			}),
			client.editMessage(message.channel.id, message.id, {
				// eslint-disable-next-line no-bitwise
				flags: suppressEmbeds | message.flags,
			}),
		]);

		return true;
	})()
		.catch((error: Error) => {
			if (!error.name.toLocaleLowerCase().includes('permission')) {
				console.error(`Unexpected channel handling of message='${message.id}' channel='${message.channel.id}'`);
				console.error(error);

				return false;
			}
		});

	uncontrollableChannels.feedback(message.channel.id, response);
};

export const enableXtwitterTransition = async (_client: Client) => {
	console.log('% loading x-twitter transition...');

	downstreamEvents.on('filteredMessageCreate', handleMessageCreate);

	console.log('(loaded) x-twitter transition is ready');
};
