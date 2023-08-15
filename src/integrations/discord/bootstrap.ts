import {Client} from 'eris';

import {type Mutsuki} from '../../index.js';
import {aDiscordToken} from '../../mods/env.js';
import {BucketLimiter, RateLimiter} from '../../mods/ratelimit.js';
import {enableEmojiMagnifier} from './features/emojiMagnifier.js';
import {enableXtwitterTransition} from './features/xTwitterTransition.js';
import {DownstreamEventEmitter} from './mods/downstream.js';

export type MutsukiDiscordIntegration = {
	client: Client;
	downstream: DownstreamEventEmitter;
	limits: {
		perControlChannel: BucketLimiter;
		perMessage: RateLimiter;
	};
};

export const aMutsukiDiscordIntegration: () => MutsukiDiscordIntegration = () => ({
	client: new Client(aDiscordToken, {
		intents: [
			'guildEmojis',
			'guildMembers',
			'guildMessages',
		],
	}),
	downstream: new DownstreamEventEmitter(),
	limits: {
		perControlChannel: new BucketLimiter(),
		perMessage: new RateLimiter(),
	},
});

export const integrateDiscord = async (mutsuki: Mutsuki) => {
	mutsuki.logger.info('bootstrapping discord integration');

	await enableEmojiMagnifier(mutsuki);
	await enableXtwitterTransition(mutsuki);

	const {discord} = mutsuki.integrations;

	discord.client.on('messageCreate', message => {
		if (
			message.author.bot
			|| !discord.limits.perMessage.consume(message.author.id)
		) {
			return;
		}

		discord.downstream.emit('filteredMessageCreate', mutsuki, message);
	});

	discord.client.once('ready', () => {
		mutsuki.logger.info('connected to discord gateway');
	});

	return async () => {
		await discord.client.connect();
	};
};
