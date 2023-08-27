import {type Mutsuki} from '../../../index.js';

const isPermissionError = (message: string) => message.toLocaleLowerCase().includes('perm');

class ControlChannelInternalError extends Error {}

export const aControlChannelContext = async (
	mutsuki: Mutsuki,
	namespace: string,
	proxy: (aContext: (a?: number) => void) => Promise<void>,
) => {
	const {discord} = mutsuki.integrations;

	let response = false;

	const aContext = new Proxy(discord.limits.perControlChannel.consume.bind(discord.limits.perControlChannel, namespace), {
		apply(target, thisArg, argArray) {
			response = Reflect.apply(target, thisArg, argArray) as boolean;

			if (!response) {
				mutsuki.logger.warn({
					channel: namespace,
				}, 'rejected handling channel');

				throw new ControlChannelInternalError();
			}
		},
	});

	const [result, error] = await proxy(aContext)
		.then(() => [true] as const)
		.catch((error: Error) => [false, error] as const);

	if (!response) {
		return;
	}

	if (!result && isPermissionError(error.message)) {
		discord.limits.perControlChannel.feedback(namespace, false);
	}

	discord.limits.perControlChannel.feedback(namespace, true);
};
