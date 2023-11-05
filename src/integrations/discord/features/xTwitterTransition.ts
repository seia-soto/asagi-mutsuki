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

const extractPathname = (data: UrlData) => {
	if (data.isSpoiler) {
		return data.pathname.slice(0, -2);
	}

	return data.pathname;
};

const buildUrl = (service: 'nitter.net' | 'twitter.com' | 'vxtwitter.com', data: UrlData) => `https://${service}/${extractPathname(data)}`;

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

	const urlData = extractUrlData(link[0]);
	const urlWrapper = urlData.isSpoiler ? '||' : '';

	await Promise.all([
		discord.client.createMessage(message.channel.id, {
			allowedMentions: {
				users: false,
			},
			components: [
				{
					components: [
						{
							label: 'Nitter',
							style: Constants.ButtonStyles.LINK,
							type: Constants.ComponentTypes.BUTTON,
							url: buildUrl('nitter.net', urlData),
						},
						{
							label: 'Twitter',
							style: Constants.ButtonStyles.LINK,
							type: Constants.ComponentTypes.BUTTON,
							url: buildUrl('twitter.com', urlData),
						},
					],
					type: Constants.ComponentTypes.ACTION_ROW,
				},
			],
			content: `<@${message.author.id}> — ${urlWrapper}${buildUrl('vxtwitter.com', urlData)}${urlWrapper}`,
		}),
		discord.client.deleteMessage(message.channel.id, message.id),
	]);
});

export const enableXtwitterTransition = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info('enabled x-twitter transition');
};
