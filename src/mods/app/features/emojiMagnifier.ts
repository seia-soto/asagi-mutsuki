import {type PossiblyUncachedTextableChannel, type Client, type Message, type MessageContent} from 'eris';
import {downstreamEvents} from '../downstream.js';

const handleMessageCreate = async (client: Client, message: Message<PossiblyUncachedTextableChannel>) => {
	const singleEmojiPattern = /<:[a-zA-Z\d]+:(\d+)>/i;
	const emojiIdMatcher = singleEmojiPattern.exec(message.content);

	if (!emojiIdMatcher) {
		return;
	}

	const [, emojiId] = emojiIdMatcher;

	const copy: MessageContent = {
		embed: {
			author: {
				name: message.author.username,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: message.author.avatarURL ?? message.author.defaultAvatarURL,
			},
			image: {
				url: `https://cdn.discordapp.com/emojis/${emojiId}.png`,
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

	void client.createMessage(message.channel.id, copy);
	void client.deleteMessage(message.channel.id, message.id);
};

export const enableEmojiMagnifier = async (_client: Client) => {
	console.log('% loading emoji magnifier...');

	downstreamEvents.on('filteredMessageCreate', handleMessageCreate);
};
