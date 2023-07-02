/* eslint-disable no-await-in-loop */
import {sleep} from './timer.js';

export class LeastUsed<V> {
	source: Record<string, [number, number[], V]> = {};

	sourceRoots = 0;

	cleanseLoopMaximum = 1 * 1000; // Accuracy of the record expiration
	cleanseLoopAdjustableRange = 250;
	cleanseLoopAdjusted = 0;

	constructor(
		readonly size = 2048,
		readonly expiration = 1 * 24 * 60 * 60 * 1000,
		readonly deleteOnExpiration = false,
	) {
		void this.frequentlyClenase();
	}

	push(id: string, value: V) {
		const time = Date.now();

		if (typeof this.source[id] === 'undefined') {
			this.source[id] = [time, [time + this.expiration], value];
			this.sourceRoots++;

			if (++this.sourceRoots > this.size) {
				void this.recentlyClenase();
			}

			return;
		}

		this.source[id][0] = time;
		this.source[id][1].push(time + this.expiration);
		this.source[id][2] = value;
	}

	pull(id: string) {
		if (typeof this.source[id] !== 'undefined') {
			return this.source[id][2];
		}
	}

	private async recentlyClenase() {
		const entries = Object
			.entries(this.source)
			.sort((a, b) => a[1][0] - b[1][0])
			.slice(0, (this.sourceRoots + 40) - this.size)
			.map(value => value[0]);

		for (const entry of entries) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete this.source[entry];

			this.sourceRoots--;
		}
	}

	private async frequentlyClenase() {
		for (; ;) {
			const delay = this.cleanseLoopMaximum - Math.min(this.sourceRoots * 2.5, this.cleanseLoopAdjustableRange);
			const time = Date.now();

			await sleep(delay);

			for (const key of Object.keys(this.source)) {
				this.source[key][1] = this.source[key][1].filter(expiration => time < expiration);

				if (!this.source[key].length && (this.deleteOnExpiration || this.sourceRoots > this.size)) {
					this.sourceRoots--;

					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete this.source[key];
				}
			}
		}
	}
}
