import {Constants, type Message, type PossiblyUncachedTextableChannel} from 'eris';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

type UrlData = {
	isSpoiler: boolean;
	pathname: string;
};

const extractUrlData = (match: string): UrlData => ({
	isSpoiler: match.slice(0, 2) + match.slice(-2) === '||||',
	pathname: match.split('/').slice(3).join('/'),
});

const buildEmbeddableUrl = (data: UrlData) => {
	const url = 'https://vxtwitter.com/' + data.pathname;

	if (data.isSpoiler) {
		return '||' + url;
	}

	return url;
};

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	if (message.attachments.length) {
		return;
	}

	const link = /^(?:\|\|)?https?:\/\/(?:x|twitter|fxtwitter)\.com\/\w+\/status\/\d+(?:\|\|)?/i.exec(message.content);

	if (!link || message.content.includes(' ') || (message.content[link[0].length] && !'?/#'.includes(message.content[link[0].length]))) {
		return;
	}

	aContext();

	const {discord} = mutsuki.integrations;

	await Promise.all([
		discord.client.createMessage(message.channel.id, {
			allowedMentions: {
				users: false,
			},
			content: `<@${message.author.id}> — ${buildEmbeddableUrl(extractUrlData(link[0]))}`,
		}),
		discord.client.deleteMessage(message.channel.id, message.id),
	]);
});

export const enableXtwitterTransition = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info('enabled x-twitter transition');
};
