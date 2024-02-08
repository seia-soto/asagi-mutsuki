import {Constants, type MessageContent} from 'eris';
import {type ErisHandleWithClient, type ErisHandleMessageCreate} from '../../plugins/discord';
import {PluginStages} from '../../plugins/types';
import {type Mutsuki} from '../../types';

const emotePattern = /^<a?:([a-zA-Z\d_]+):(\d+)>$/i;

const getEmoteUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.png?size=128`;
const getAnimatedEmoteUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.gif?size=128&quality=lossless`;

const handleMessageCreate: ErisHandleWithClient<ErisHandleMessageCreate> = async (client, message) => {
	if (message.channel.type !== Constants.ChannelTypes.GUILD_TEXT) {
		return;
	}

	const match = emotePattern.exec(message.content);

	if (!match) {
		return;
	}

	const [, emoteName, originalEmoteId] = match;
	const isForwarded = /xff\d+$/.test(originalEmoteId);
	const isAnimated = isForwarded || message.content.startsWith('<a:');

	const emoteId = isForwarded ? emoteName.split('xff')[1] : originalEmoteId;

	const copy: MessageContent = {
		embed: {
			author: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: message.author.avatarURL ?? message.author.defaultAvatarURL,
				name: message.author.username,
			},
			color: message.author.accentColor ?? 0,
			image: {
				url: isAnimated ? getAnimatedEmoteUrl(emoteId) : getEmoteUrl(emoteId),
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
		client.createMessage(message.channel.id, copy),
		client.deleteMessage(message.channel.id, message.id),
	]);
};

export const useEmojiMagnifier = (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.plugins;

	const handleUpdate = () => {
		if (discord.state !== PluginStages.Loaded) {
			return;
		}

		discord.context.client.on('messageCreate', handleMessageCreate.bind(null, discord.context.client));
	};

	discord.events.on('update', handleUpdate);
};
