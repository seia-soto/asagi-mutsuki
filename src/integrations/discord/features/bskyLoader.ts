import type Atp from '@atproto/api';

import {type AppBskyEmbedImages} from '@atproto/api';
import {type ThreadViewPost} from '@atproto/api/dist/client/types/app/bsky/feed/defs.js';
import {Constants, type Message, type MessageContent, type PossiblyUncachedTextableChannel} from 'eris';

import {type Mutsuki} from '../../../index.js';
import {aControlChannelContext} from '../mods/controlChannel.js';

const handleMessageCreate = async (mutsuki: Mutsuki, message: Message<PossiblyUncachedTextableChannel>) => aControlChannelContext(mutsuki, message.channel.id, async aContext => {
	const {bsky, discord} = mutsuki.integrations;

	if (!bsky.meta.isReady) {
		return;
	}

	const bskyPostPattern = /https?:\/\/(?:staging\.)?bsky\.app\/profile\/([\w\d.-]+)\/post\/([\w\d]+)/i;
	const paramMatcher = bskyPostPattern.exec(message.content);

	if (!paramMatcher) {
		return;
	}

	aContext();

	const [, repo, rkey] = paramMatcher;

	const bskyResponse = await (async () => {
		const cachedUser = bsky.caches.user.pull(repo);

		let user: Atp.AppBskyActorGetProfile.Response;

		if (cachedUser) {
			user = cachedUser.value;
		} else {
			user = await bsky.agent.getProfile({
				actor: repo,
			});

			bsky.caches.user.push(repo, user);
		}

		const uri = `at://${user.data.did}/app.bsky.feed.post/${rkey}`;
		const cachedThread = bsky.caches.post.pull(uri);

		let thread: Atp.AppBskyFeedGetPostThread.Response;

		if (cachedThread) {
			thread = cachedThread.value;
		} else {
			thread = await bsky.agent.getPostThread({
				uri,
			});

			bsky.caches.post.push(uri, thread);
		}

		return [user, thread] as const;
	})()
		.catch((error: Error) => {
			mutsuki.logger.error(error, 'failed to get bsky post thread');

			return false as const;
		});

	if (!bskyResponse) {
		await discord.client.createMessage(message.channel.id, {
			allowedMentions: {
				repliedUser: false,
				users: false,
			},
			content: `<@${message.author.id}> — ❎ BlueSky API`,
			messageReference: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				messageID: message.id,
			},
		});

		return;
	}

	const [user, thread] = bskyResponse;
	const {post} = thread.data.thread as ThreadViewPost;

	const {createdAt, text} = post.record as {
		createdAt: string;
		text: string;
	};

	const reference: MessageContent = {
		allowedMentions: {
			repliedUser: false,
			users: false,
		},
		content: `<@${message.author.id}>`,
		embed: {
			author: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: user.data.avatar ?? '',
				name: user.data.displayName ? `${user.data.displayName} (@${user.data.handle})` : `@${user.data.handle} (${user.data.did})`,
				url: `https://bsky.app/profile/${user.data.handle ?? user.data.did}`,
			},
			description: text,
			footer: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				icon_url: 'https://bsky.app/static/apple-touch-icon.png',
				text: 'Bluesky',
			},
			timestamp: createdAt,
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

	await Promise.all([
		discord.client.createMessage(message.channel.id, reference),
		discord.client.editMessage(message.channel.id, message.id, {
			// eslint-disable-next-line no-bitwise
			flags: Constants.MessageFlags.SUPPRESS_EMBEDS | message.flags,
		}),
	]);
});

export const enableBskyLoader = async (mutsuki: Mutsuki) => {
	const {discord} = mutsuki.integrations;

	discord.downstream.on('filteredMessageCreate', handleMessageCreate);

	mutsuki.logger.info('enabled bsky loader');
};
