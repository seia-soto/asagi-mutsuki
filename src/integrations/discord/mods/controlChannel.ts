import {type Mutsuki} from '../../../index.js';

const isPermissionError = (message: string) => message.toLocaleLowerCase().includes('perm');

class ControlChannelInternalError extends Error {}

export const aControlChannelContext = async (mutsuki: Mutsuki, namespace: string, proxy: (aContext: (a?: number) => void) => Promise<void>) => {
	const {discord} = mutsuki.integrations;

	const aContext = new Proxy(discord.limits.perControlChannel.consume.bind(discord.limits.perControlChannel, namespace), {
		apply(target, thisArg, argArray) {
			const response = Reflect.apply(target, thisArg, argArray) as boolean;

			if (!response) {
				mutsuki.logger.warn({
					channel: namespace,
				}, 'rejected handling channel');

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

			if (isPermissionError(error.message)) {
				mutsuki.logger.error({
					error,
				}, 'permission error occured in controlled channel');

				discord.limits.perControlChannel.feedback(namespace, false);

				return;
			}

			mutsuki.logger.error({
				error,
			}, 'unknown error occured in controlled channel');

			discord.limits.perControlChannel.feedback(namespace, true);
		});
};
