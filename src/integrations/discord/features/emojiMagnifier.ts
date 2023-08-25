import {type ApplicationCommandStructure, type CommandInteraction, Constants, type Emoji, type Guild, type Message, type MessageContent, type PossiblyUncachedTextableChannel} from 'eris';
import got from 'got';
import sharp from 'sharp';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

const getAnimatedEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.gif?size=256&quality=lossless`;

const getStaticEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.png?size=256`;

const commandName = 'snapshot_emote';

const optionName = 'animated_emote';

const applicationCommand: ApplicationCommandStructure = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	default_member_permissions: true,
	description: 'Snapshot an animated emote and make a static emote linked with',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	description_localizations: {
		ko: '움직이는 이모지를 캡쳐 후 연동되는 정적 이모지 생성',
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	dm_permission: false,
	name: commandName,
	options: [
		{
			description: 'An animated emote',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			description_localizations: {
				ko: '움직이는 이모지',
			},
			name: optionName,
			required: true,
			type: Constants.ApplicationCommandOptionTypes.STRING,
		},
	],
	type: Constants.ApplicationCommandTypes.CHAT_INPUT,
};

const handleInteractionCreate = async (mutsuki: Mutsuki, interaction: CommandInteraction) => {
	if (
		interaction.type !== Constants.InteractionTypes.APPLICATION_COMMAND
		|| !interaction.guildID
		|| !interaction.member
		|| interaction.data.name !== commandName
		|| interaction.data.options?.[0].name !== optionName
		|| interaction.data.options[0].type !== Constants.ApplicationCommandOptionTypes.STRING
	) {
		return;
	}

	const animatedEmoteName = interaction.data.options[0].value;

	if (!/^\w+$/.test(animatedEmoteName)) {
		await interaction.createMessage('❎');

		return;
	}

	const {discord} = mutsuki.integrations;

	const emotes = await discord.client.getRESTGuildEmojis(interaction.guildID);
	const emote = emotes.find(emote => emote.animated && emote.name === animatedEmoteName);

	if (!emote) {
		await interaction.createMessage('🧐');

		return;
	}

	const referencingEmoteName = animatedEmoteName + 'xff' + emote.id;

	if (emotes.find(emote => emote.name === referencingEmoteName)) {
		await interaction.createMessage('😓');

		return;
	}

	const response = await got(getStaticEmojiUrl(emote.id), {
		headers: {
			'user-agent': 'seia-soto/asagi-mutsuki',
		},
	})
		.buffer();

	const image = await sharp(response, {pages: 1})
		.resize({height: 128, width: 128})
		.webp({effort: 2})
		.toBuffer();

	await discord.client.createGuildEmoji(interaction.guildID, {
		image: 'data:image/webp;base64,' + image.toString('base64'),
		name: referencingEmoteName,
	});
	await interaction.createMessage('✅');
};

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	const singleEmojiPattern = /^<a?:([a-zA-Z\d_]+):(\d+)>$/i;
	const emojiIdMatcher = singleEmojiPattern.exec(message.content);

	if (!emojiIdMatcher || message.attachments.length) {
		return;
	}

	aContext();

	const {discord} = mutsuki.integrations;

	const [, emoteName, originalEmoteId] = emojiIdMatcher;
	const isForwardedEmote = /xff\d+$/.test(emoteName);
	const emoteId = isForwardedEmote ? emoteName.split('xff')[1] : originalEmoteId;

	const isAnimatedEmoji = isForwardedEmote || message.content.startsWith('<a:');

	const copy: MessageContent = {
		embed: {
			author: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: message.author.avatarURL ?? message.author.defaultAvatarURL,
				name: message.author.username,
			},
			color: message.author.accentColor ?? 0,
			image: {
				url: isAnimatedEmoji ? getAnimatedEmojiUrl(emoteId) : getStaticEmojiUrl(emoteId),
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

	const command = discord.commands.find(command => command.name === commandName);

	if (command) {
		if (mutsuki.integrations.discord.options.shouldUpdateApplicationCommands) {
			await discord.client.editCommand(command.id, applicationCommand);
		}
	} else {
		await discord.client.createCommand(applicationCommand);
	}

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);
	discord.client.on('interactionCreate', handleInteractionCreate.bind(null, mutsuki));

	mutsuki.logger.info('enabled emoji magnifier');
};
