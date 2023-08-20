import Atp from '@atproto/api';
import {type AppBskyActorGetProfile, type AppBskyFeedGetPostThread, type AtpSessionData} from '@atproto/api';
import {existsSync} from 'fs';
import {mkdir, readFile, writeFile} from 'fs/promises';
import path from 'path';

import {type Mutsuki} from '../../index.js';
import {useEnv} from '../../mods/env.js';
import {TimescaleMap} from '../../mods/hashmap.js';

const resumableSessionPath = path.join(process.cwd(), 'data/features.bskyloader.session');
const resumableSessionDir = path.dirname(resumableSessionPath);

export type MutsukiBskyIntegration = {
	agent: Atp.BskyAgent;
	caches: {
		post: TimescaleMap<AppBskyFeedGetPostThread.Response>;
		user: TimescaleMap<AppBskyActorGetProfile.Response>;
	};
	meta: {
		isReady: boolean;
	};
};

export const aMutsukiBskyIntegration: () => MutsukiBskyIntegration = () => ({
	agent: new Atp.BskyAgent({
		async persistSession(_event, session) {
			if (!session) {
				return;
			}

			const stringified = JSON.stringify(session);

			await writeFile(resumableSessionPath, stringified, 'utf-8');
		},
		service: 'https://bsky.social',
	}),
	caches: {
		post: new TimescaleMap(),
		user: new TimescaleMap(),
	},
	meta: {
		isReady: false,
	},
});

export const integrateBsky = async (mutsuki: Mutsuki) => {
	mutsuki.logger.info('bootstrapping bsky integration');

	const {bsky} = mutsuki.integrations;

	const identifier = useEnv('BSKY_ID', true);
	const password = useEnv('BSKY_PASSWORD', true);

	return async () => {
		if (!identifier || !password) {
			mutsuki.logger.warn('canceled bootstrapping bsky integration due to one or more of id and password were not provided!');

			return;
		}

		if (!existsSync(resumableSessionDir)) {
			mutsuki.logger.info('creating bsky session data directory');

			await mkdir(path.dirname(resumableSessionPath), {recursive: true});
		}

		let response = false;

		if (existsSync(resumableSessionPath)) {
			const stringified = await readFile(resumableSessionPath, 'utf-8');

			response = await bsky.agent.resumeSession(JSON.parse(stringified) as AtpSessionData)
				.then(_ => true)
				.catch(error => {
					mutsuki.logger.error(error, 'failed to resume bsky session');

					return false;
				});
		}

		if (!response) {
			response = await bsky.agent.login({identifier, password})
				.then(_ => true)
				.catch(error => {
					mutsuki.logger.error(error, 'failed to create bsky session');

					return false;
				});
		}

		bsky.meta.isReady = response;

		mutsuki.logger.info('bootstrapped bsky integration');
	};
};
