import {type PossiblyUncachedTextableChannel, type Client, type Message, type MessageContent} from 'eris';
import {downstreamEvents} from '../downstream.js';
import {BucketLimiter} from '../../ratelimit.js';

const uncontrollableChannels = new BucketLimiter();

const getAnimatedEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.gif?size=256&quality=lossless`;

const getStaticEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.png?size=256`;

const handleMessageCreate = async (client: Client, message: Message<PossiblyUncachedTextableChannel>) => {
	const singleEmojiPattern = /^<a?:[a-zA-Z\d_]+:(\d+)>$/i;
	const emojiIdMatcher = singleEmojiPattern.exec(message.content);

	if (!emojiIdMatcher) {
		return;
	}

	const [, emojiId] = emojiIdMatcher;

	const isAnimatedEmoji = message.content.startsWith('<a:');
	const isChannelControllable = uncontrollableChannels.consume(message.channel.id);

	if (!isChannelControllable) {
		return;
	}

	const copy: MessageContent = {
		embed: {
			author: {
				name: message.author.username,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: message.author.avatarURL ?? message.author.defaultAvatarURL,
			},
			image: {
				url: isAnimatedEmoji ? getAnimatedEmojiUrl(emojiId) : getStaticEmojiUrl(emojiId),
			},
			color: message.author.accentColor ?? 0,
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

	const response = await (async () => {
		await Promise.all([
			client.createMessage(message.channel.id, copy),
			client.deleteMessage(message.channel.id, message.id),
		]);

		return true;
	})()
		.catch((error: Error) => {
			if (!error.name.toLowerCase().includes('permission')) {
				console.error(`Unexpected channel handling of message='${message.id}' channel='${message.channel.id}'`);
				console.error(error);

				return false;
			}
		});

	uncontrollableChannels.feedback(message.channel.id, response);
};

export const enableEmojiMagnifier = async (_client: Client) => {
	console.log('% loading emoji magnifier...');

	downstreamEvents.on('filteredMessageCreate', handleMessageCreate);

	console.log('(loaded) emoji magnifier is ready');
};
