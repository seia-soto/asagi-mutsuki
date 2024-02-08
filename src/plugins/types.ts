import type EventEmitter from 'eventemitter3';

export enum PluginStages {
	Error,
	Loading,
	Loaded,
	Unloaded,
}

export type PluginEvents = {
	update(context?: unknown): void;
};

type PluginWithoutContext<Context, Options, Events> = {
	name: string;
	state: PluginStages.Error | PluginStages.Loading | PluginStages.Unloaded;
	options: Options;
	events: EventEmitter<Events & PluginEvents>;
	context?: Context;
};

type PluginWithContext<Context, Options, Events> = Omit<PluginWithoutContext<Context, Options, Events>, 'context' | 'state'> & {
	state: PluginStages.Loaded;
	context: Context;
};

export type Plugin<Context, Options, Events> = PluginWithoutContext<Context, Options, Events> | PluginWithContext<Context, Options, Events>;

export type PluginMethods = {
	load(): Promise<void>;
	unload(): Promise<void>;
};
