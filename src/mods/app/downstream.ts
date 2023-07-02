import {type PossiblyUncachedTextableChannel, type Client, type Message} from 'eris';
import EventEmitter from 'events';

type DownstreamEventTypes = {
	'filteredMessageCreate': (client: Client, message: Message<PossiblyUncachedTextableChannel>) => void;
};

class DownstreamEventEmitter extends EventEmitter {
	private readonly _untypedOn = this.on;
	private readonly _untypedEmit = this.emit;
	public on = <K extends keyof DownstreamEventTypes>(event: K, listener: DownstreamEventTypes[K]): this => this._untypedOn(event, listener);
	public emit = <K extends keyof DownstreamEventTypes>(event: K, ...args: Parameters<DownstreamEventTypes[K]>): boolean => this._untypedEmit(event, ...args);
}

export const downstreamEvents = new DownstreamEventEmitter();
