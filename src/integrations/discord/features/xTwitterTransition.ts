import {type Message, type PossiblyUncachedTextableChannel} from 'eris';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

// eslint-disable-next-line no-bitwise
const suppressEmbeds = 1 << 2;

type UrlData = {
	isPost: boolean;
	isSpoiler: boolean;
	pathname: string;
};

const extractUrlData = (match: RegExpMatchArray): UrlData => ({
	isPost: match[0].includes('/status/'),
	isSpoiler: match[0].slice(0, 2) + match[0].slice(-2) === '||||',
	pathname: match[0].split('/').slice(3).join('/'),
});

const buildEmbeddableUrl = (data: UrlData) => {
	const url = (data.isPost ? 'https://vxtwitter.com/' : 'https://twitter.com/') + data.pathname;

	if (data.isSpoiler) {
		return '||' + url;
	}

	return url;
};

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	const xLinkPattern = /(?:\|\|)?https?:\/\/(?:x|twitter|fxtwitter)\.com\/\w+(?:\/status\/\d+)?(?:\|\|)?/gmi;
	const links = [...message.content.matchAll(xLinkPattern)];

	if (!links.length) {
		return;
	}

	const {discord} = mutsuki.integrations;

	aContext();

	if (links[0][0] === message.content || (!message.content.includes(' ') && '?#'.includes(message.content[links[0][0].length]))) {
		await Promise.all([
			discord.client.createMessage(message.channel.id, {
				allowedMentions: {
					users: true,
				},
				content: `<@${message.author.id}> — ${buildEmbeddableUrl(extractUrlData(links[0]))}`,
			}),
			discord.client.deleteMessage(message.channel.id, message.id),
		]);
	} else {
		await Promise.all([
			discord.client.createMessage(message.channel.id, {
				allowedMentions: {
					repliedUser: false,
				},
				content: links.map(extractUrlData).map(buildEmbeddableUrl).join('\n'),
				messageReference: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					messageID: message.id,
				},
			}),
			discord.client.editMessage(message.channel.id, message.id, {
				// eslint-disable-next-line no-bitwise
				flags: suppressEmbeds | message.flags,
			}),
		]);
	}
});

export const enableXtwitterTransition = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info({
		feature: 'xTwitterTransition',
		integration: 'discord',
		state: 'enabled',
	}, 'enabled x-twitter transition');
};
