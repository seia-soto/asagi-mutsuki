import {default as eris, type Message} from 'eris';
import EventEmitter from 'eventemitter3';
import {PluginStages, type Plugin, type PluginMethods} from '../types';

export type DiscordPluginContext = {
	client: eris.Client;
};

export type DiscordPluginOptions = {
	token: string;
	clientOptions: eris.ClientOptions;
};

export type DiscordPluginEvents = {
	message(message: eris.Message): void;
};

export type DiscordPlugin = Plugin<DiscordPluginContext, DiscordPluginOptions, DiscordPluginEvents>;

export const loadDiscordPlugin = async (plugin: DiscordPlugin) => {
	// Initialise the client
	const client = eris(plugin.options.token, plugin.options.clientOptions);

	plugin.state = PluginStages.Loading;
	plugin.context = {
		client,
	};

	const hasFailed = await client.connect()
		.catch((_error: Error) => {
			plugin.state = PluginStages.Error;

			return true;
		});

	if (hasFailed) {
		return;
	}

	plugin.state = PluginStages.Loaded;
};

export const unloadDiscordPlugin = async (plugin: DiscordPlugin) => {
	if (plugin.state === PluginStages.Loaded) {
		plugin.context.client.disconnect({reconnect: false});
	}

	plugin.state = PluginStages.Unloaded;
};

export const createDiscordPlugin = (options: DiscordPluginOptions): DiscordPlugin & PluginMethods => {
	const plugin: DiscordPlugin = {
		name: 'Discord',
		options,
		events: new EventEmitter(),
		state: PluginStages.Unloaded,
	};

	const proxiedPlugin = new Proxy(plugin, {
		set(target, p, newValue, receiver) {
			const ret = Reflect.set(target, p, newValue, receiver);

			if (p === 'state') {
				plugin.events.emit('update');
			}

			return ret;
		},
	});

	return {
		...proxiedPlugin,
		load: loadDiscordPlugin.bind(null, plugin),
		unload: unloadDiscordPlugin.bind(null, plugin),
	};
};

// Eris message type helpers
export type ErisHandleMessageCreate = (message: Message) => unknown;

export type ErisHandleWithClient<F extends (...args: any[]) => any> = (client: eris.Client, ...args: Parameters<F>) => unknown;
