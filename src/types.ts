import {type DiscordPlugin} from './plugin/discord';
import {type PluginMethods} from './plugin/types';

export type Plugins = {
	discord: DiscordPlugin & PluginMethods;
};

export type Mutsuki = {
	plugins: Plugins;
};
