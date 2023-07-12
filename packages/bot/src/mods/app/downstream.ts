import {type Client, type Message, type PossiblyUncachedTextableChannel} from 'eris';
import EventEmitter from 'events';

import {type TypedEventEmitter} from '../../typeUtils/eventEmitter.js';

export const downstreamEvents: TypedEventEmitter<{
	'filteredMessageCreate': (client: Client, message: Message<PossiblyUncachedTextableChannel>) => void;
}> = new EventEmitter();
