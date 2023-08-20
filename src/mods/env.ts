export type EnvKeys =
'BSKY_ID'
| 'BSKY_PASSWORD'
| 'DISCORD_SHOULD_UPDATE_APPLICATION_COMMANDS'
| 'DISCORD_TOKEN';

export const useEnv = (key: EnvKeys, isOptional = false) => {
	const value = process.env[key];

	if (typeof value !== 'string') {
		if (isOptional) {
			return '';
		}

		throw new Error(`The environment variable ${key} is not provided!`);
	}

	return value;
};

export const aDiscordToken = useEnv('DISCORD_TOKEN');
