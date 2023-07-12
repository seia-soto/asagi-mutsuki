import Atp, {type AppBskyEmbedImages, type AtpSessionData} from '@atproto/api';
import {type ThreadViewPost} from '@atproto/api/dist/client/types/app/bsky/feed/defs.js';
import {type Client, type Message, type MessageContent, type PossiblyUncachedTextableChannel} from 'eris';
import {existsSync} from 'fs';
import {mkdir, readFile, writeFile} from 'fs/promises';
import path from 'path';
import {useEnv} from '../../env.js';
import {BucketLimiter} from '../../ratelimit.js';
import {downstreamEvents} from '../downstream.js';
import {TimescaleMap} from '../../hashmap.js';

const uncontrollableChannels = new BucketLimiter();
const spammingChannels = new BucketLimiter();

const bskyUserCache = new TimescaleMap<Atp.AppBskyActorGetProfile.Response>();
const bskyPostCache = new TimescaleMap<Atp.AppBskyFeedGetPostThread.Response>();

const handleMessageCreate = async (bsky: Atp.BskyAgent, client: Client, message: Message<PossiblyUncachedTextableChannel>) => {
	const bskyPostPattern = /https?:\/\/(?:staging\.)?bsky\.app\/profile\/([\w\d.-]+)\/post\/([\w\d]+)/i;
	const paramMatcher = bskyPostPattern.exec(message.content);

	if (!paramMatcher) {
		return;
	}

	const [, repo, rkey] = paramMatcher;

	uncontrollableChannels.consume(message.channel.id);
	spammingChannels.consume(message.channel.id);

	const bskyResponse = await (async () => {
		const cachedUser = bskyUserCache.pull(repo);

		let user: Atp.AppBskyActorGetProfile.Response;

		if (cachedUser) {
			user = cachedUser.value;
		} else {
			user = await bsky.getProfile({
				actor: repo,
			});

			bskyUserCache.push(repo, user);
		}

		const uri = `at://${user.data.did}/app.bsky.feed.post/${rkey}`;
		const cachedThread = bskyPostCache.pull(uri);

		let thread: Atp.AppBskyFeedGetPostThread.Response;

		if (cachedThread) {
			thread = cachedThread.value;
		} else {
			thread = await bsky.getPostThread({
				uri,
			});

			bskyPostCache.push(uri, thread);
		}

		return [user, thread] as const;
	})()
		.catch((error: Error) => {
			console.error(`Failed to get BlueSky content of repo='${repo}' rkey='${rkey}'`);
			console.error(error);

			spammingChannels.feedback(message.channel.id, false);

			return false as const;
		});

	await (async () => {
		if (!bskyResponse) {
			await client.createMessage(message.channel.id, {
				content: 'BlueSky service failure!',
				messageReference: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					messageID: message.id,
				},
			});

			return;
		}

		const [user, thread] = bskyResponse;
		const {post} = thread.data.thread as ThreadViewPost;

		const {text, createdAt} = post.record as {
			text: string;
			createdAt: string;
		};

		const reference: MessageContent = {
			embed: {
				author: {
					name: user.data.displayName ? `${user.data.displayName} (@${user.data.handle})` : `@${user.data.handle} (${user.data.did})`,
					url: `https://bsky.app/profile/${user.data.handle ?? user.data.did}`,
					// eslint-disable-next-line @typescript-eslint/naming-convention
					icon_url: user.data.avatar ?? '',
				},
				description: text,
				timestamp: createdAt,
				footer: {
					text: 'Bluesky',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					icon_url: 'https://bsky.app/static/apple-touch-icon.png',
				},
			},
			messageReference: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				messageID: message.id,
			},
		};

		if (post.embed?.$type === 'app.bsky.embed.images#view') {
			const embed = post.embed as AppBskyEmbedImages.View;

			// @ts-expect-error `references.embed` is already available
			reference.embed.image = {
				url: embed.images[0].fullsize,
			};
		}

		await client.createMessage(message.channel.id, reference);
	})()
		.catch((error: Error) => {
			console.error(`Unexpected channel handling of message='${message.id}' channel='${message.channel.id}'`);
			console.error(error);

			uncontrollableChannels.feedback(message.channel.id, false);
		});
};

export const enableBskyLoader = async (_client: Client) => {
	console.log('% loading bsky loader...');

	const id = useEnv('BSKY_ID', true);
	const password = useEnv('BSKY_PASSWORD', true);

	if (!id || !password) {
		console.log('(disabled) BSKY_ID or BSKY_PASSWORD not provided!');

		return;
	}

	const resumableSessionPath = path.join(process.cwd(), 'data/features.bskyloader.session');
	const resumableSessionDir = path.dirname(resumableSessionPath);

	if (!existsSync(resumableSessionDir)) {
		await mkdir(path.dirname(resumableSessionPath), {recursive: true});
	}

	const agent = new Atp.BskyAgent({
		service: 'https://bsky.social',
		async persistSession(_event, session) {
			if (!session) {
				return;
			}

			const stringified = JSON.stringify(session);

			await writeFile(resumableSessionPath, stringified, 'utf-8');
		},
	});

	let response = false;

	if (existsSync(resumableSessionPath)) {
		const stringified = await readFile(resumableSessionPath, 'utf-8');

		response = await agent.resumeSession(JSON.parse(stringified) as AtpSessionData)
			.then(_ => true)
			.catch(error => {
				console.error('Unexpected failed bsky login request!');
				console.error(error);

				return false;
			});
	}

	if (!response) {
		response = await agent.login({identifier: id, password})
			.then(_ => true)
			.catch(error => {
				console.error('Unexpected failed bsky login request!');
				console.error(error);

				return false;
			});
	}

	if (!response) {
		return;
	}

	console.log('(loaded) bsky loader is ready');

	downstreamEvents.on('filteredMessageCreate', handleMessageCreate.bind(null, agent));
};
