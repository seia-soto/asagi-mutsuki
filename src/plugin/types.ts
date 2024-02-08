export enum PluginStages {
	Error,
	Loading,
	Loaded,
	Unloaded,
}

export type Plugin<Context, Options> = {
	name: string;
	context?: Context;
	options: Options;
	stage: {
		state: PluginStages;
		description: string;
	};
	hooks?: Partial<{
		loaded(plugin: Plugin<Context, Options>): unknown;
		unloaded(plugin: Plugin<Context, Options>): unknown;
	}>;
};

export type PluginMethods = {
	load(): Promise<void>;
	unload(): Promise<void>;
};
