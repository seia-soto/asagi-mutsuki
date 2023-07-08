export type EnvKeys = 'DISCORD_TOKEN'
| 'BSKY_ID' | 'BSKY_PASSWORD';

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
