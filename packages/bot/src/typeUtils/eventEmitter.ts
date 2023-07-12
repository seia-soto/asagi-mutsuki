export type TypedEventEmitterMapping = Record<string, (...args: any[]) => any>;

export type TypedEventEmitter<Mapping extends TypedEventEmitterMapping> = {
	emit<K extends keyof Mapping>(event: K, ...args: Parameters<Mapping[K]>): boolean;
	on<K extends keyof Mapping>(event: K, listener: Mapping[K]): TypedEventEmitter<Mapping>;
};
