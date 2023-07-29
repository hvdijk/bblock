import { when } from 'https://esm.run/lit-html/directives/when.js';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { createReplaceable, replaceable } from './replaceable.js';
import { agent, rkeyFromUri, listRecords, deleteAll, blockNSID } from './common.js';
import { html, centerText, startApp, logout } from './app.js';

const unblockAllButton = html`<button @click=${() => unblockAllAreYouSure()}>unblock all</button>`;
const unblockAllRow = createReplaceable(unblockAllButton);

const buttonsBox = html`<div class="box">
		${replaceable(unblockAllRow)}
		<button @click=${() => unblockSelf()}>unblock yourself</button>
		<button @click=${() => logout(() => main.replace(loginBox))}>logout</button>
	</div>`;

var { loginBox, main } = startApp(buttonsBox);

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
	for await (const block of listRecords(blockNSID)) {
		rkeys.push(rkeyFromUri(block.uri));
	}

	main.replace(centerText("Deleting blocks..."));

	deleteAll(blockNSID, rkeys);

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

		deleteAll(blockNSID, [ rkeyFromUri(block) ]);

		main.replace(centerText("Done!"));
	}

	await new Promise(r => setTimeout(r, 1000));
	main.replace(buttonsBox);
}
