import {useEmojiMagnifier} from './features/emoteMagnifier';
import {createDiscordPlugin} from './plugins/discord';
import {type Mutsuki} from './types';

const boot = async () => {
	const discord = createDiscordPlugin({
		token: '',
		clientOptions: {
			intents: ['allNonPrivileged'],
		},
	});

	const mutsuki: Mutsuki = {
		plugins: {
			discord,
		},
	};

	// Load plugins
	await mutsuki.plugins.discord.load();

	// Load features
	useEmojiMagnifier(mutsuki);
};

void boot();
