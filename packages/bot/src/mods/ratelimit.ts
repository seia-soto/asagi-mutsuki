/* eslint-disable no-await-in-loop */
import {sleep} from './timer.js';

export class RateLimiter {
	sources: Record<string, number> = {};

	constructor(
		readonly effects = {
			limit: 2,
			preventOnActive: false,
			reset: 1000,
		},
	) {
		void this.worker();
	}

	private async worker() {
		for (; ;) {
			await sleep(this.effects.reset);

			this.sources = {};
		}
	}

	consume(id: string) {
		this.sources[id] ??= 0;

		return ++this.sources[id] <= this.effects.limit;
	}
}

export type BucketLimiterSource = {
	availability: number;
	createdAt: number;
	frequency: number;
	id: string;
	negatives: number;
	updatedAt: number;
};

export class BucketLimiter {
	public static defaultEffects = {
		// The interval time for worker to reset frequency
		accuracy: 1000 * 2,
		availability: 32,
		// The allow maximum negatives per frequency ratio
		expectation: 0.2,
		// The expiration rate for internal data source
		expiration: 1000 * 60 * 60,
		frequency: 10,
		stackable: 1024 * 1024,
	};

	sourceRef: Record<string, BucketLimiterSource> = {};

	sources: BucketLimiterSource[] = [];

	constructor(
		readonly effects = BucketLimiter.defaultEffects,
	) {
		void this.worker();
	}

	private async worker() {
		for (; ;) {
			await sleep(this.effects.accuracy);

			const runAt = Date.now();

			for (; ;) {
				const ref = this.sources[0];

				if (!ref) {
					break;
				}

				if (ref.updatedAt + this.effects.expiration >= runAt) {
					break;
				}

				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete this.sourceRef[ref.id];

				this.sources.splice(0, 1);
			}
		}
	}

	consume(id: string, a = 1) {
		const [, ref] = this.ref(id);

		if ((ref.negatives / ref.frequency) > this.effects.expectation) {
			return false;
		}

		ref.updatedAt = Date.now();

		if (++ref.frequency >= this.effects.stackable) {
			if (ref.negatives) {
				ref.negatives = Math.max(ref.negatives - (1024 * 8), 0);
			}

			ref.frequency -= 1024 * 8;
		}

		// If there's no budget
		if (!ref.availability) {
			return false;
		}

		// Consume the budget
		ref.availability -= a;

		return true;
	}

	feedback(id: string, positive = true) {
		const [, ref] = this.ref(id);

		if (!positive) {
			ref.negatives++;

			return;
		}

		return this.fill(ref, 2);
	}

	fill(ref: BucketLimiterSource, n = 1) {
		if (ref.availability <= this.effects.availability) {
			if (ref.availability + n === this.effects.availability) {
				ref.availability = this.effects.availability;
			} else {
				ref.availability += n;
			}
		}

		return ref.availability;
	}

	ref(id: string) {
		let ref = this.sourceRef[id];

		if (typeof ref === 'undefined') {
			const now = Date.now();
			const source = {
				availability: this.effects.availability,
				createdAt: now,
				frequency: 0,
				id,
				negatives: 0,
				updatedAt: now,
			};

			this.sources.push(source);
			this.sourceRef[id] = source;

			ref = source;

			return [true, ref] as const;
		}

		return [false, ref] as const;
	}
}
