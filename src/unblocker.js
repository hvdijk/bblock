import { when } from 'https://esm.run/lit-html/directives/when.js';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { replaceable } from './replaceable.js';
import { createAreYouSure } from './areYouSure.js';
import { agent, rkeyFromUri, listRecords, deleteAll, blockNSID, listItemNSID } from './common.js';
import { html, centerText, startApp, logout } from './app.js';

const unblockAllRow = createAreYouSure("unblock all", unblockAll);
const deleteListRow = createAreYouSure("delete blockenheimer list", deleteList);

const buttonsBox = html`<div class="box">
		${replaceable(unblockAllRow)}
		${replaceable(deleteListRow)}
		<button @click=${() => unblockSelf()}>unblock yourself</button>
		<button @click=${() => logout(() => main.replace(loginBox))}>logout</button>
	</div>`;

var { loginBox, main } = startApp(buttonsBox);

async function unblockAll() {
	main.replace(centerText("Getting blocks..."));
	let rkeys = [];
	for await (const block of listRecords(blockNSID)) {
		rkeys.push(rkeyFromUri(block.uri));
	}

	main.replace(centerText("Deleting blocks..."));

	deleteAll(blockNSID, rkeys);

	main.replace(centerText("Done!"));

	await new Promise(r => setTimeout(r, 500));

	main.replace(buttonsBox);
}

async function deleteList() {
	main.replace(centerText("Getting list contents..."));

	const listType = 'app.bsky.graph.list';
	const listRkey = 'bblock';
	const list = `at://${agent.session.did}/${listType}/${listRkey}`;

	let rkeys = [];
	for await (const item of listRecords(listItemNSID)) {
		if (item.value.list === list) {
			rkeys.push(rkeyFromUri(item.uri));
		}
	}

	main.replace(centerText("Deleting list and contents..."));

	rkeys.push({ collection: listType, rkey: listRkey });
	deleteAll(listItemNSID, rkeys);

	main.replace(centerText("Done!"));

	await new Promise(r => setTimeout(r, 500));

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

		deleteAll(blockNSID, [ rkeyFromUri(block) ]);

		main.replace(centerText("Done!"));
	}

	await new Promise(r => setTimeout(r, 1000));
	main.replace(buttonsBox);
}
