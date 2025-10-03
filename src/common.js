import { Agent } from '@externdefs/bluesky-client/agent';

// Constants
export const URL = "https://hvdijk.github.io/bblock/";
export const LIST_NAME = "Blockenheimer";

export const blockNSID = 'app.bsky.graph.block';
export const listItemNSID = 'app.bsky.graph.listitem';

// Agent
export const agent = new Agent({ serviceUri: 'https://bsky.social' });

// AT Utils
export const rkeyFromUri = uri => uri.match(/\/([^/]+)$/)[1];

export async function* listRecords(collection) {
	const PAGE_LIMIT = 100;
	async function fetchPage(cursor) {
		return await agent.rpc.get('com.atproto.repo.listRecords', {
			params: {
				repo: agent.session.did,
				collection,
				limit: PAGE_LIMIT,
				cursor: cursor,
			},
		});
	}

	let res = await fetchPage();
	yield* res.data.records;

	while (res.data.cursor && res.data.records.length >= PAGE_LIMIT) {
		res = await fetchPage(res.data.cursor);
		yield* res.data.records;
	}
}

export async function deleteAll(collection, rkeys) {
	if (rkeys.length === 0) return;

	const writes = rkeys.map(r => {
		if (typeof r !== "string") {
			r['$type'] = 'com.atproto.repo.applyWrites#delete';
			return r;
		}

		return {
			'$type': 'com.atproto.repo.applyWrites#delete',
			collection,
			rkey: r
		};
	});

	const batchSize = 200;
	const amm = writes.length;
	for (let i = 0; i < amm; i += batchSize) {
		await agent.rpc.call('com.atproto.repo.applyWrites', {
			data: {
				repo: agent.session.did,
				writes: writes.slice(i, i + batchSize)
			}
		})
	}
}
