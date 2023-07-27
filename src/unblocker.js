import { when } from 'https://esm.run/lit-html/directives/when.js';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { createReplaceable, replaceable } from './replaceable.js';
import { html, URL, LIST_NAME, centerText, agent, startApp, logout } from './app.js';

const unblockAllButton = html`<button @click=${() => unblockAllAreYouSure()}>unblock all</button>`;
const unblockAllRow = createReplaceable(unblockAllButton);

const buttonsBox = html`<div class="box">
		${replaceable(unblockAllRow)}
		<button @click=${() => unblockSelf()}>unblock yourself</button>
		<button @click=${() => logout(() => main.replace(loginBox))}>logout</button>
	</div>`;

var { loginBox, main } = startApp(buttonsBox);

const collection = 'app.bsky.graph.block';

const rkeyFromUri = url => url.match(/\/([^/]+)$/)[1];

async function* blocks() {
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

async function deleteAll(rkeys) {
	if (rkeys.length === 0) return;

	const writes = rkeys.map(r => {
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

async function unblockAllAreYouSure() {
	unblockAllRow.replace(html`<div class="row">
			<span style="flex:1">Are you sure?</span>
			<button style="flex:1" @click=${() => unblockAllRow.replace(unblockAllButton)}>No</button>
			<button style="flex:1" @click=${() => unblockAll()}>Yes</button>
		</div>`);
}

async function unblockAll() {
	main.replace(centerText("Getting blocks..."));
	let rkeys = [];
	for await (const block of blocks()) {
		rkeys.push(rkeyFromUri(block.uri));
	}

	main.replace(centerText("Deleting blocks..."));

	deleteAll(rkeys);

	main.replace(centerText("Done!"));

	await new Promise(r => setTimeout(r, 500));

	unblockAllRow.replace(unblockAllButton)
	main.replace(buttonsBox);
}

async function unblockSelf() {
	main.replace(centerText("Getting profile..."));
	const profile = await agent.rpc.get('app.bsky.actor.getProfile', {
		params: { actor: agent.session.did }
	});

	const block = profile.data.viewer.blocking;
	if (!block) {
		main.replace(centerText("You aren't blocking yourself!"));
	} else {
		main.replace(centerText("Deleting block..."));

		deleteAll([ rkeyFromUri(block) ]);

		main.replace(centerText("Done!"));
	}

	await new Promise(r => setTimeout(r, 1000));
	main.replace(buttonsBox);
}
