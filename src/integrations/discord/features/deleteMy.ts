import {type ApplicationCommandStructure, type CommandInteraction, Constants} from 'eris';

import {type Mutsuki} from '../../../index.js';

const commandName = 'delete';

const optionName = 'message_link';

const applicationCommand: ApplicationCommandStructure = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	default_member_permissions: true,
	description: 'Delete my message referenced by Mutsuki',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	description_localizations: {
		ko: '무츠키가 만든 메세지 제거',
	},
	// eslint-disable-next-line @typescript-eslint/naming-convention
	dm_permission: false,
	name: commandName,
	options: [
		{
			description: 'The link to the message',
			// eslint-disable-next-line @typescript-eslint/naming-convention
			description_localizations: {
				ko: '메세지 링크',
			},
			name: optionName,
			required: true,
			type: Constants.ApplicationCommandOptionTypes.STRING,
		},
	],
	type: 1,
};

export const handleInteractionCreate = async (mutsuki: Mutsuki, interaction: CommandInteraction) => {
	if (
		interaction.type !== Constants.InteractionTypes.APPLICATION_COMMAND
		|| !interaction.member
		|| interaction.data.name !== commandName
		|| interaction.data.options?.[0].name !== optionName
		|| interaction.data.options?.[0].type !== Constants.ApplicationCommandOptionTypes.STRING
	) {
		await interaction.createMessage('❎');

		return;
	}

	const possibleMessageData = /^https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/i.exec(interaction.data.options?.[0].value);

	if (!possibleMessageData) {
		await interaction.createMessage('❎');

		return;
	}

	const message = await mutsuki.integrations.discord.client.getMessage(possibleMessageData[1], possibleMessageData[2])
		.catch(async (error: Error) => {
			await interaction.createMessage('❎');

			throw error;
		});

	if (
		message.author.id === mutsuki.integrations.discord.client.user.id
		&& (
			!message.mentions.includes(interaction.member.user)
			|| message.embeds?.[0].author?.name !== interaction.member.username
		)
	) {
		await mutsuki.integrations.discord.client.deleteMessage(possibleMessageData[1], possibleMessageData[2], 'The user requested to delete the bot message created by thierself.');
		await interaction.createMessage('✅');

		return;
	}

	await interaction.createMessage('🧐');
};

export const enableDeleteMy = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	const command = discord.commands.find(command => command.name === commandName);

	if (command) {
		if (mutsuki.integrations.discord.options.shouldUpdateApplicationCommands) {
			await discord.client.editCommand(command.id, applicationCommand);
		}
	} else {
		await discord.client.createCommand(applicationCommand);
	}

	discord.client.on('interactionCreate', handleInteractionCreate.bind(null, mutsuki));

	mutsuki.logger.info('enabled delete my');
};
