import {type DiscordPlugin} from './plugins/discord';
import {type PluginMethods} from './plugins/types';

export type Plugins = {
	discord: DiscordPlugin & PluginMethods;
};

export type Mutsuki = {
	plugins: Plugins;
};
