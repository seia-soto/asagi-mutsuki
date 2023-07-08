import {sleep} from './timer.js';

export class TimescaleMap<V> {
	sources: Array<{id: string; value: V; timestamp: number}> = [];

	sourceRef: Record<string, TimescaleMap<V>['sources'][number]> = {};

	constructor(
		readonly effects = {
			expiration: 1000 * 60 * 60 * 24 * 7,
			accuracy: 1000 * 60 * 5,
			size: 1024 * 64,
		},
	) {
		void this.worker();
	}

	push(id: string, value: V) {
		const ref = {
			id,
			value,
			timestamp: Date.now(),
		};

		this.sources.push(ref);
		this.sourceRef[id] = ref;

		if (this.sources.length > this.effects.size) {
			this.sources.shift();
		}
	}

	pull(id: string) {
		const ref = this.sourceRef[id];

		if (typeof ref === 'undefined') {
			return false;
		}

		return ref;
	}

	private async worker() {
		for (; ;) {
			// eslint-disable-next-line no-await-in-loop
			await sleep(this.effects.accuracy);

			const runAt = Date.now();

			for (; ;) {
				const ref = this.sources[0];

				if (!ref) {
					break;
				}

				if (ref.timestamp + this.effects.expiration >= runAt) {
					break;
				}

				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete this.sourceRef[ref.id];

				this.sources.splice(0, 1);
			}
		}
	}
}
