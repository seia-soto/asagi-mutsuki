import {type Client, type Message, type PossiblyUncachedTextableChannel} from 'eris';

import {downstreamEvents, uncontrollableChannels} from '../downstream.js';

const handleMessageCreate = async (client: Client, message: Message<PossiblyUncachedTextableChannel>) => {
	const isChannelControllable = uncontrollableChannels.consume(message.channel.id);

	if (!isChannelControllable) {
		return;
	}

	const xLinkPattern = /x\.com\/[^ ?\n]+/gi;
	const links = [...message.content.matchAll(xLinkPattern)];

	if (!links.length) {
		return;
	}

	const response = await client.createMessage(message.channel.id, {
		allowedMentions: {
			repliedUser: false,
		},
		content: links.join('\n'),
		messageReference: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			messageID: message.id,
		},
	})
		.then(() => undefined)
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
