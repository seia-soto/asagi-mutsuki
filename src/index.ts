import {Client} from 'eris';

import {bootstrap} from './mods/app/bootstrap.js';
import {aDiscordToken} from './mods/env.js';

process.on('unhandledRejection', error => {
	console.error(error);
});

export const mutsuki = async () => {
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
