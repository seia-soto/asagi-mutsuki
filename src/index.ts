import {Client} from 'eris';
import {aDiscordToken} from './mods/env.js';
import {bootstrap} from './mods/app/bootstrap.js';

export const mutsuki = async () => {
	console.log('connecting to Discord...');

	const client = new Client(aDiscordToken, {
		intents: [
			'guildEmojis',
			'guildMembers',
			'guildMessages',
		],
	});

	client.on('connect', bootstrap.bind(null, client));

	await client.connect();
};

void mutsuki();
