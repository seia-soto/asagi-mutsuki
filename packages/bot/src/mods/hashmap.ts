import {sleep} from './timer.js';

export class TimescaleMap<V> {
	sourceRef: Record<string, TimescaleMap<V>['sources'][number]> = {};

	sources: Array<{id: string; timestamp: number; value: V}> = [];

	constructor(
		readonly effects = {
			accuracy: 1000 * 60 * 5,
			expiration: 1000 * 60 * 60 * 24 * 7,
			size: 1024 * 64,
		},
	) {
		void this.worker();
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

	pull(id: string) {
		const ref = this.sourceRef[id];

		if (typeof ref === 'undefined') {
			return false;
		}

		return ref;
	}

	push(id: string, value: V) {
		const ref = {
			id,
			timestamp: Date.now(),
			value,
		};

		this.sources.push(ref);
		this.sourceRef[id] = ref;

		if (this.sources.length > this.effects.size) {
			this.sources.shift();
		}
	}
}
