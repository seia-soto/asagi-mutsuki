import {type Mutsuki} from '../../../index.js';

const isPermissionError = (message: string) => message.toLocaleLowerCase().includes('perm');

class ControlChannelInternalError extends Error {}

export const aControlChannelContext = async (mutsiki: Mutsuki, namespace: string, proxy: (aContext: (a?: number) => void) => Promise<void>) => {
	const {discord} = mutsiki.integrations;

	const aContext = new Proxy(discord.limits.perControlChannel.consume.bind(discord.limits.perControlChannel, namespace), {
		apply(target, thisArg, argArray) {
			const response = Reflect.apply(target, thisArg, argArray) as boolean;

			if (!response) {
				throw new ControlChannelInternalError();
			}
		},
	});

	proxy(aContext)
		.then(() => {
			discord.limits.perControlChannel.feedback(namespace, true);
		})
		.catch((error: Error) => {
			if (error instanceof ControlChannelInternalError) {
				return;
			}

			mutsiki.logger.error(error);

			if (isPermissionError(error.message)) {
				discord.limits.perControlChannel.feedback(namespace, false);

				return;
			}

			discord.limits.perControlChannel.feedback(namespace, true);
		});
};
