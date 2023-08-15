import {type Message, type PossiblyUncachedTextableChannel} from 'eris';
import EventEmitter from 'events';

import {type Mutsuki} from '../../../index.js';

type DownstreamEventTypes = {
	'filteredMessageCreate': (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => void;
};

export class DownstreamEventEmitter extends EventEmitter {
	private readonly _untypedEmit = this.emit;
	private readonly _untypedOn = this.on;
	public emit = <K extends keyof DownstreamEventTypes>(event: K, ...args: Parameters<DownstreamEventTypes[K]>): boolean => this._untypedEmit(event, ...args);
	public on = <K extends keyof DownstreamEventTypes>(event: K, listener: DownstreamEventTypes[K]): this => this._untypedOn(event, listener);
}
