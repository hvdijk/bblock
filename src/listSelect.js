import { when } from 'https://esm.run/lit-html/directives/when.js';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { html } from './app.js';
import { agent } from './common.js';
import { createReplaceable } from './replaceable.js';

async function fetchPage(cursor) {
	const params = { limit: 100, cursor: cursor, actor: agent.session.did };
	return await agent.rpc.get("app.bsky.graph.getLists", { params });
}

export const listSelect = (showCreate) => {
	async function* pages() {
		let res = await fetchPage();

		yield* res.data.lists;

		let addCreate = showCreate && res.data.lists.every(x => !x.uri.endsWith("/bblock"));

		while (res.data.cursor && res.data.lists.length != 0) {
			res = await fetchPage(res.data.cursor);
			yield* res.data.lists;

			addCreate = addCreate && res.data.lists.every(x => !x.uri.endsWith("/bblock"));
		}

		if (addCreate) {
			yield {
				uri: 'create',
				name: 'Create a new list',
				description: 'This new list will be selected by default when using Blockenheimer in the future'
			};
		}
	}

	const _selected = createReplaceable();
	const selected = createReplaceable();

	const select = (uri, ref) => {
		selected.replace(uri);

		if (_selected.last)
			_selected.last.value.className = "profile";

		ref.value.className = "profile deselected";
		_selected.replace(ref);
	};

	const showList = (list) => {
		const _ref = createRef();

		// ugly hack but works so whatever
		if (list.uri.endsWith("/bblock") || list.uri === "create")
			setTimeout(() => select(list.uri, _ref));

		return html`<div ${ref(_ref)} @click=${() => select(list.uri, _ref)} class="profile">
			${when(list.avatar !== undefined, () => html`<img src=${list.avatar} />`, () => html``)}
			<div style="flex:1">
				<p>${list.name || "No name"}</p>
				<p>${list.description || "No description"}</p>
			</div>
		</div>`;
	};

	return {
		selector: asyncAppend(pages(), showList),
		selected
	};
};
