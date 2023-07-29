import { when } from 'https://esm.run/lit-html/directives/when.js';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';

import * as history from './historyStorage.js';
import { createReplaceable, replaceable } from './replaceable.js';
import { LIST_NAME, agent, rkeyFromUri, listRecords, deleteAll, blockNSID, listItemNSID } from './common.js';
import { html, centerText, startApp, logout } from './app.js';

const nsidNames = {
	[blockNSID]: ['block', 'blocks'],
	[listItemNSID]: ['mute', 'mutes']
};

const actionName = (item) => nsidNames[item.collection][item.recordCount === 1 ? 0 : 1];

const historyItem = (item) => html`<div class="row">
		<span style="flex:1">
			${item.recordCount} ${actionName(item)}
			at ${item.timestamp.replace(/[TZ]/g, " ")} (<a href="${item.targetUrl}" target="_blank">target</a>)
		</span>
		<a style="flex:0" href="#" @click=${() => revert(item)}>Revert</a>
	</div>`;

const historyBox = (hist) => html`<div class="box">
		<button @click=${() => logout(() => main.replace(loginBox))}>logout</button>
		${when(hist.length === 0,
			() => centerText(`You haven't used ${LIST_NAME} yet!`),
			() => hist.map(historyItem))}
	</div>`;

var { loginBox, main } = startApp(historyBox(history.get()));

async function revert(item) {
	const word = actionName(item);

	main.replace(centerText("Finding " + word + "..."));
	let rkeys = [];
	for await (const record of listRecords(item.collection)) {
		if (record.value.createdAt === item.timestamp) {
			rkeys.push(rkeyFromUri(record.uri));
		}
	}

	main.replace(centerText("Deleting " + word + "..."));
	await deleteAll(item.collection, rkeys);

	main.replace(centerText("Done!"));

	history.remove(item.timestamp);

	await new Promise(r => setTimeout(r, 1000));
	main.replace(historyBox(history.get()));
}
