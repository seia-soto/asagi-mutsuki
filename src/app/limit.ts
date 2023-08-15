import {BucketLimiter} from '../mods/ratelimit.js';

export const uncontrollableChannels = new BucketLimiter();
