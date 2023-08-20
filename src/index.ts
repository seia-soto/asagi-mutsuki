import {type Logger, pino} from 'pino';

import {type MutsukiBskyIntegration, aMutsukiBskyIntegration, integrateBsky} from './integrations/bsky/bootstrap.js';
import {type MutsukiDiscordIntegration, aMutsukiDiscordIntegration, integrateDiscord} from './integrations/discord/bootstrap.js';

export type MutsukiOption = {
	shouldHandleUnhandledRejection: boolean;
};

export type Mutsuki = {
	integrations: {
		bsky: MutsukiBskyIntegration;
		discord: MutsukiDiscordIntegration;
	};
	logger: Logger;
};

export const aMutsuki = async (option: MutsukiOption) => {
	const mutsuki: Mutsuki = {
		integrations: {
			bsky: aMutsukiBskyIntegration(),
			discord: aMutsukiDiscordIntegration(),
		},
		logger: pino(),
	};

	if (option.shouldHandleUnhandledRejection) {
		process.on('unhandledRejection', error => {
			mutsuki.logger.error(error);
		});
	}

	const bootstrapDiscord = await integrateDiscord(mutsuki);
	const bootstrapBsky = await integrateBsky(mutsuki);

	const bootstrap = () => {
		void bootstrapDiscord();
		void bootstrapBsky();
	};

	return [mutsuki, bootstrap] as const;
};

void aMutsuki({
	shouldHandleUnhandledRejection: true,
})
	.then(([_mutsuki, bootstrap]) => {
		bootstrap();
	});
