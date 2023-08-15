import {type Client} from 'eris';

import {RateLimiter} from '../mods/ratelimit.js';
import {downstreamEvents} from './downstream.js';
import {enableEmojiMagnifier} from './features/emojiMagnifier.js';
import {enableXtwitterTransition} from './features/xTwitterTransition.js';

export const bootstrap = async (client: Client) => {
	console.log('preparing event optimizer...');

	const messageCreateRateLimiter = new RateLimiter();

	client.on('messageCreate', message => {
		if (
			message.author.bot
			|| !messageCreateRateLimiter.consume(message.author.id)
		) {
			return;
		}

		downstreamEvents.emit('filteredMessageCreate', client, message);
	});

	console.log('syncing Discord application commands...');
	// There's nothing to do yet

	console.log('loading application features...');

	await enableEmojiMagnifier(client);
	await enableXtwitterTransition(client);
};
