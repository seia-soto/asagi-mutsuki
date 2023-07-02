import {type Client} from 'eris';
import {aDiscordErrorReportChannel} from '../env.js';
import {RateLimiter} from '../ratelimit.js';
import {downstreamEvents} from './downstream.js';
import {enableEmojiMagnifier} from './features/emojiMagnifier.js';

export const bootstrap = async (client: Client) => {
	process.on('uncaughtException', error => {
		console.error(error);

		if (!aDiscordErrorReportChannel) {
			return;
		}

		void client.createMessage(aDiscordErrorReportChannel, JSON.stringify(error) ?? '(see console)');
	});

	console.log('preparing event optimizer...');

	const messageCreateRateLimiter = new RateLimiter();

	client.on('messageCreate', message => {
		if (
			message.author.bot
			|| messageCreateRateLimiter.pull(message.author.id) > 2
		) {
			return;
		}

		messageCreateRateLimiter.push(message.author.id, 1 * 1000);

		downstreamEvents.emit('filteredMessageCreate', client, message);
	});

	console.log('syncing Discord application commands...');
	// There's nothing to do yet

	console.log('loading application features...');

	void enableEmojiMagnifier(client);
};
