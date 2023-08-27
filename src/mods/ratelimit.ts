/* eslint-disable no-await-in-loop */
import {sleep} from './timer.js';

export type BucketLimiterSource = {
	budget: number;
	id: string;
	lat: number; // Last access time
	used: number;
	usedNegatively: number;
};

export class BucketLimiter {
	public static defaultEffects = {
		budget: 4,
		budgetIncreaseInterval: 1000 * 1.5,
		budgetIncreaseScalingNegativeThreshold: 0.4,
		budgetThreshold: 6,
		// The expiration time for internal data source
		expiration: 1000 * 60 * 5,
	};

	isWorkerBeingManaged = false;

	sourceRef: Record<string, BucketLimiterSource> = {};

	sources: BucketLimiterSource[] = [];

	constructor(
		readonly effects = BucketLimiter.defaultEffects,
	) {}

	private async activateWorker() {
		if (this.isWorkerBeingManaged) {
			return;
		}

		this.isWorkerBeingManaged = true;

		for (; ;) {
			const now = Date.now();
			const ran = await this.worker(now);

			if (!ran) {
				this.isWorkerBeingManaged = false;

				break;
			}

			await sleep(Date.now() + 100 - now);
		}
	}

	private create(id: string) {
		if (this.sourceRef[id]) {
			this.delete(id);
		}

		const now = Date.now();
		const entity: BucketLimiterSource = {
			budget: this.effects.budget,
			id,
			lat: now,
			used: 0,
			usedNegatively: 0,
		};

		this.sourceRef[id] = entity;
		this.sources.push(entity);

		return entity;
	}

	private delete(id: string) {
		this.sources.splice(this.sources.indexOf(this.sourceRef[id]));

		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete this.sourceRef[id];
	}

	private get(id: string) {
		const entity = this.sourceRef[id];

		if (entity && Date.now() > entity.lat + this.effects.expiration) {
			this.delete(entity.id);

			return undefined;
		}

		return entity;
	}

	private async worker(now: number) {
		for (let i = 0; i < 20; i++) {
			const entity = this.sources[0];

			if (!entity) {
				return i;
			}

			if (entity.lat < now - this.effects.expiration) {
				this.delete(entity.id);
			}
		}
	}

	consume(id: string) {
		const entity = this.get(id);

		if (!entity) {
			this.create(id);

			return true;
		}

		const now = Date.now();

		// eslint-disable-next-line no-bitwise
		const budgetScale = ((Math.min(
			this.effects.budgetThreshold,
			((now - entity.lat) / this.effects.budgetIncreaseInterval)
			* (1 - Math.min(entity.usedNegatively / entity.used, this.effects.budgetIncreaseScalingNegativeThreshold)),
		) * 1000) | 0) / 1000;

		entity.budget = Math.min(entity.used + this.effects.budgetThreshold, entity.budget + budgetScale);

		if (entity.used > this.effects.budgetThreshold) {
			entity.budget -= this.effects.budgetThreshold;
			entity.used -= this.effects.budgetThreshold;
		}

		return entity.budget > entity.used;
	}

	feedback(id: string, positive = true) {
		const entity = this.get(id);

		if (!entity) {
			return;
		}

		entity.used += 1;

		if (!positive) {
			entity.usedNegatively += 1;
		}

		entity.lat = Date.now();

		this.sources.push(this.sources.splice(this.sources.indexOf(entity), 1)[0]);

		void this.activateWorker();
	}
}
