import {default as eris} from 'eris';
import {PluginStages, type Plugin, type PluginMethods} from '../types';

export type DiscordPluginContext = {
	client: eris.Client;
};

export type DiscordPluginOptions = {
	token: string;
	clientOptions: eris.ClientOptions;
};

export type DiscordPlugin = Plugin<DiscordPluginContext, DiscordPluginOptions>;

export const loadDiscordPlugin = async (plugin: DiscordPlugin) => {
	// Initialise the client
	const client = eris(plugin.options.token, plugin.options.clientOptions);

	plugin.stage = {
		state: PluginStages.Loading,
		description: 'The plugin is connecting to Discord gateway.',
	};
	plugin.context = {
		client,
	};

	const hasFailed = await client.connect()
		.catch((error: Error) => {
			if (error instanceof Error) {
				plugin.stage = {
					state: PluginStages.Error,
					description: error.message,
				};
			}

			plugin.stage = {
				state: PluginStages.Error,
				description: 'An unknown error occured.',
			};

			return true;
		});

	if (hasFailed) {
		return;
	}

	plugin.stage = {
		state: PluginStages.Loaded,
		description: 'The plugin is connected to Discord gateway and ready to handle incoming messages.',
	};

	plugin.hooks?.loaded?.(plugin);
};

export const unloadDiscordPlugin = async (plugin: DiscordPlugin) => {
	if (plugin.context) {
		plugin.context.client.disconnect({reconnect: false});

		delete plugin.context;
	}

	plugin.stage = {
		state: PluginStages.Unloaded,
		description: 'The plugin is not loaded.',
	};

	plugin.hooks?.unloaded?.(plugin);
};

export const createDiscordPlugin = (options: DiscordPluginOptions): DiscordPlugin & PluginMethods => {
	const plugin: DiscordPlugin = {
		name: 'Discord',
		options,
		stage: {
			state: PluginStages.Loading,
			description: 'Initialising the plugin.',
		},
	};

	return {
		...plugin,
		load: loadDiscordPlugin.bind(null, plugin),
		unload: unloadDiscordPlugin.bind(null, plugin),
	};
};
