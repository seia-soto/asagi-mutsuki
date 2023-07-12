import {type Client, type Message, type PossiblyUncachedTextableChannel} from 'eris';
import EventEmitter from 'events';

type DownstreamEventTypes = {
	'filteredMessageCreate': (client: Client, message: Message<PossiblyUncachedTextableChannel>) => void;
};

class DownstreamEventEmitter extends EventEmitter {
	private readonly _untypedEmit = this.emit;
	private readonly _untypedOn = this.on;
	public emit = <K extends keyof DownstreamEventTypes>(event: K, ...args: Parameters<DownstreamEventTypes[K]>): boolean => this._untypedEmit(event, ...args);
	public on = <K extends keyof DownstreamEventTypes>(event: K, listener: DownstreamEventTypes[K]): this => this._untypedOn(event, listener);
}

export const downstreamEvents = new DownstreamEventEmitter();
