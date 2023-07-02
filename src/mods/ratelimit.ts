/* eslint-disable no-await-in-loop */
import {sleep} from './timer.js';

export class RateLimiter {
	source: Record<string, number[]> = {};

	sourceRoots = 0;

	cleanseLoopMaximum = 1 * 1000; // Accuracy of the record expiration
	cleanseLoopAdjustableRange = 250;
	cleanseLoopAdjusted = 0;

	constructor() {
		void this.cleanse();
	}

	push(id: string, expiration: number) {
		if (typeof this.source[id] === 'undefined') {
			this.sourceRoots++;
			this.source[id] = [];
		}

		this.source[id].push(Date.now() + expiration);
	}

	pull(id: string) {
		return this.source[id]?.length ?? 0;
	}

	private async cleanse() {
		for (; ;) {
			const delay = this.cleanseLoopMaximum - Math.min(this.sourceRoots * 2.5, this.cleanseLoopAdjustableRange);
			const time = Date.now();

			await sleep(delay);

			for (const [key, value] of Object.entries(this.source)) {
				this.source[key] = value.filter(expiration => time < expiration);

				if (!this.source[key].length) {
					this.sourceRoots--;

					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete this.source[key];
				}
			}
		}
	}
}
