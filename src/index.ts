import {Client} from 'eris';

import {bootstrap} from './app/bootstrap.js';
import {aDiscordToken} from './mods/env.js';

export const mutsuki = async () => {
	process.on('unhandledRejection', error => {
		console.error(error);
	});

	console.log('connecting to Discord...');

	const client = new Client(aDiscordToken, {
		intents: [
			'guildEmojis',
			'guildMembers',
			'guildMessages',
		],
	});

	client.once('ready', bootstrap.bind(null, client));

	await client.connect();
};

void mutsuki();
