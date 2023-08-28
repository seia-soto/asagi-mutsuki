import {type ApplicationCommand, Client} from 'eris';

import {type Mutsuki} from '../../index.js';
import {aDiscordToken, useEnv} from '../../mods/env.js';
import {BucketLimiter} from '../../mods/ratelimit.js';
import {enableBskyLoader} from './features/bskyLoader.js';
import {enableEmojiMagnifier} from './features/emojiMagnifier.js';
import {enableXtwitterTransition} from './features/xTwitterTransition.js';
import {DownstreamEventEmitter} from './mods/downstream.js';

export type MutsukiDiscordIntegration = {
	client: Client;
	commands: ApplicationCommand[];
	downstream: DownstreamEventEmitter;
	limits: {
		perControlChannel: BucketLimiter;
		perMessage: BucketLimiter;
	};
	meta: {
		isReady: boolean;
	};
	options: {
		shouldUpdateApplicationCommands?: boolean;
	};
};

export const aMutsukiDiscordIntegration: () => MutsukiDiscordIntegration = () => ({
	client: new Client(aDiscordToken, {
		disableEvents: {
			/* eslint-disable @typescript-eslint/naming-convention */
			CHANNEL_CREATE: true,
			CHANNEL_DELETE: true,
			CHANNEL_UPDATE: true,
			GUILD_BAN_ADD: true,
			GUILD_BAN_REMOVE: true,
			GUILD_CREATE: true,
			GUILD_DELETE: true,
			GUILD_MEMBER_ADD: true,
			GUILD_MEMBER_REMOVE: true,
			GUILD_MEMBER_UPDATE: true,
			GUILD_ROLE_CREATE: true,
			GUILD_ROLE_DELETE: true,
			GUILD_ROLE_UPDATE: true,
			GUILD_UPDATE: true,
			MESSAGE_CREATE: false,
			MESSAGE_DELETE: true,
			MESSAGE_DELETE_BULK: true,
			MESSAGE_UPDATE: true,
			PRESENCE_UPDATE: true,
			TYPING_START: true,
			USER_UPDATE: true,
			VOICE_STATE_UPDATE: true,
			/* eslint-enable @typescript-eslint/naming-convention */
		},
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
		perMessage: new BucketLimiter({
			budget: 3,
			budgetIncreaseInterval: 1000 * 2,
			budgetIncreaseScalingNegativeThreshold: 0.5,
			budgetThreshold: 4,
			// The expiration time for internal data source
			expiration: 1000 * 60,
		}),
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
		discord.limits.perMessage.feedback(message.author.id);
	});

	discord.client.once('ready', async () => {
		mutsuki.logger.info('connected to discord gateway');

		discord.commands = await discord.client.getCommands();

		await enableEmojiMagnifier(mutsuki);
		await enableXtwitterTransition(mutsuki);
		await enableBskyLoader(mutsuki);

		discord.meta.isReady = true;

		mutsuki.logger.info('bootstrapped discord integration');
	});

	return async () => {
		await discord.client.connect();
	};
};
