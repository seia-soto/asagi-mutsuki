export type EnvKeys = 'DISCORD_TOKEN'
| 'DISCORD_ERROR_REPORT_CHANNEL';

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
export const aDiscordErrorReportChannel = useEnv('DISCORD_ERROR_REPORT_CHANNEL', true);
