import {type ApplicationCommand, Client, type Emoji} from 'eris';

import {type Mutsuki} from '../../index.js';
import {aDiscordToken, useEnv} from '../../mods/env.js';
import {TimescaleMap} from '../../mods/hashmap.js';
import {BucketLimiter, RateLimiter} from '../../mods/ratelimit.js';
import {enableBskyLoader} from './features/bskyLoader.js';
import {enableDeleteMy} from './features/deleteMy.js';
import {enableEmojiMagnifier} from './features/emojiMagnifier.js';
import {enableXtwitterTransition} from './features/xTwitterTransition.js';
import {DownstreamEventEmitter} from './mods/downstream.js';

export type MutsukiDiscordIntegration = {
	caches: {
		guildEmotes: TimescaleMap<Emoji[]>;
	};
	client: Client;
	commands: ApplicationCommand[];
	downstream: DownstreamEventEmitter;
	limits: {
		perControlChannel: BucketLimiter;
		perMessage: RateLimiter;
	};
	meta: {
		isReady: boolean;
	};
	options: {
		shouldUpdateApplicationCommands?: boolean;
	};
};

export const aMutsukiDiscordIntegration: () => MutsukiDiscordIntegration = () => ({
	caches: {
		guildEmotes: new TimescaleMap(),
	},
	client: new Client(aDiscordToken, {
		intents: [
			'guildEmojis',
			'guildMembers',
			'guildMessages',
		],
		restMode: true,
	}),
	commands: [],
	downstream: new DownstreamEventEmitter(),
	limits: {
		perControlChannel: new BucketLimiter(),
		perMessage: new RateLimiter(),
	},
	meta: {
		isReady: false,
	},
	options: {
		shouldUpdateApplicationCommands: typeof useEnv('DISCORD_SHOULD_UPDATE_APPLICATION_COMMANDS', true) !== 'undefined',
	},
});

export const integrateDiscord = async (mutsuki: Mutsuki) => {
	mutsuki.logger.info('bootstrapping discord integration');

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

	discord.client.once('ready', async () => {
		mutsuki.logger.info('connected to discord gateway');

		discord.commands = await discord.client.getCommands();

		await enableEmojiMagnifier(mutsuki);
		await enableXtwitterTransition(mutsuki);
		await enableDeleteMy(mutsuki);
		await enableBskyLoader(mutsuki);

		discord.meta.isReady = true;

		mutsuki.logger.info('bootstrapped discord integration');
	});

	return async () => {
		await discord.client.connect();
	};
};
