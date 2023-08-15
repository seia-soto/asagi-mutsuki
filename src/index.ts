import {type Logger, pino} from 'pino';

import {type MutsukiDiscordIntegration, aMutsukiDiscordIntegration, integrateDiscord} from './integrations/discord/bootstrap.js';

export type MutsukiOption = {
	shouldHandleUnhandledRejection: boolean;
};

export type Mutsuki = {
	integrations: {
		discord: MutsukiDiscordIntegration;
	};
	logger: Logger;
};

export const aMutsuki = async (option: MutsukiOption) => {
	const mutsuki: Mutsuki = {
		integrations: {
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

	const bootstrap = () => {
		void bootstrapDiscord();
	};

	return [mutsuki, bootstrap] as const;
};

void aMutsuki({
	shouldHandleUnhandledRejection: true,
})
	.then(([_mutsuki, bootstrap]) => {
		bootstrap();
	});
