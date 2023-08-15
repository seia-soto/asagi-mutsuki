import {type Message, type MessageContent, type PossiblyUncachedTextableChannel} from 'eris';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

const getAnimatedEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.gif?size=256&quality=lossless`;

const getStaticEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.png?size=256`;

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	const singleEmojiPattern = /^<a?:[a-zA-Z\d_]+:(\d+)>$/i;
	const emojiIdMatcher = singleEmojiPattern.exec(message.content);

	if (!emojiIdMatcher) {
		return;
	}

	aContext();

	const {discord} = mutsuki.integrations;

	const [, emojiId] = emojiIdMatcher;
	const isAnimatedEmoji = message.content.startsWith('<a:');

	const copy: MessageContent = {
		embed: {
			author: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: message.author.avatarURL ?? message.author.defaultAvatarURL,
				name: message.author.username,
			},
			color: message.author.accentColor ?? 0,
			image: {
				url: isAnimatedEmoji ? getAnimatedEmojiUrl(emojiId) : getStaticEmojiUrl(emojiId),
			},
		},
	};

	if (message.messageReference?.messageID) {
		copy.messageReference = {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			messageID: message.messageReference?.messageID,
		};
		copy.allowedMentions = {
			repliedUser: message.mentions.length > 0,
		};
	}

	await Promise.all([
		discord.client.createMessage(message.channel.id, copy),
		discord.client.deleteMessage(message.channel.id, message.id),
	]);
});

export const enableEmojiMagnifier = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info('emoji magnifier enabled');
};
