import { html, render } from 'https://esm.run/lit-html';
import { asyncAppend } from 'https://esm.run/lit-html/directives/async-append.js';
import { when } from 'https://esm.run/lit-html/directives/when.js';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { Agent } from '@intrnl/bluesky-client/agent';

import { replaceable } from './replaceable.js';

const URL = "https://blockenheimer.click/";
const LIST_NAME = "Blockenheimer";

const centerText = str => html`<center><p>${str}</p></center>`;

const agent = new Agent({ serviceUri: 'https://bsky.social' });

const loginHandle = createRef();
const loginPassword = createRef();

// theme selection
const themeLink = document.getElementsByTagName("link")[0];
const themeSelectRef = createRef();
render(html`Theme: <select ${ref(themeSelectRef)} @change=${e => themeChange(e.target.value)}>
		<option value="light">Light</option>
		<option value="barbie">Barbie</option>
		<option value="dark">Dark</option>
		<option value="dred">Dark red</option>
	</select><br><a href="https://codeberg.org/xormetric/bblock/">Source code</a>`, document.getElementById("themeselectbox"))

function themeChange(theme) {
	themeLink.attributes["href"].value = "themes/"+theme+".css";
	localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
	themeChange(savedTheme);
	themeSelectRef.value.value = savedTheme;
}

const loginBox = html`<div class="box" style="width:20rem">
		<input ${ref(loginHandle)} type="text" name="handle" placeholder="handle">
		<input ${ref(loginPassword)} type="password" name="password" placeholder="app password">
		<button @click=${() => login(loginHandle.value.value, loginPassword.value.value)}>login</button>
	</div>`;

// main (starts with login)
const [main, replaceMain] = replaceable(loginBox);

render(html`${main}`, document.getElementById("maincontainer"));

const postInput = createRef();
const postInputBox = html`<div class="box">
		<input ${ref(postInput)} type="text" name="posturl" placeholder="post url">
		<div class="row">
			<button @click=${() => getlikers('app.bsky.feed.getRepostedBy', x => x.repostedBy)}>get reposters</button>
			<button @click=${() => getlikers('app.bsky.feed.getLikes', x => x.likes.map(l => l.actor))}>get likers</button>
		</div>
		<button @click=${() => logout()}>logout</button>
	</div>`;

async function logout() {
	localStorage.removeItem("handle");
	localStorage.removeItem("password");
	replaceMain(loginBox);
}

async function login(id, pass) {
	await agent.login({
		identifier: id,
		password: pass,
	});

	const user = await sha(agent.session.did);
	if (await fetch(URL+"d/"+user).ok) {
		replaceMain(centerText("no"));
	} else {
		replaceMain(postInputBox);
	}

	localStorage.setItem("handle", id);
	localStorage.setItem("password", pass);
}

if (localStorage.getItem("password")) {
	login(localStorage.getItem("handle"), localStorage.getItem("password"));
}

async function* follows() {
	const PAGE_LIMIT = 100;
	async function fetchPage(cursor) {
		return await agent.rpc.get('com.atproto.repo.listRecords', {
			params: {
				repo: agent.session.did,
				collection: 'app.bsky.graph.follow',
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

async function sha(s) {
	const encoder = new TextEncoder();
	const data = encoder.encode(s);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

let following;
async function getlikers(rpc, f) {
	const [actionRow, replaceActionRow] = replaceable(centerText("Loading..."));

	if (following === undefined) {
		following = {};
		for await (const x of follows()) {
	        following[x.value.subject] = true;
	    }
	    following[agent.session.did] = true;
	}

	let profileRefs = [];
	let likers = [];
	let deselected = {};

	const g = postInput.value.value.match(/^https:\/\/bsky\.app\/profile\/(.+?)\/post\/([^/]+)/);

	if (!g || g.length < 3) {
		replaceMain(html`<div class="box">
				${centerText("Invalid Bluesky post URL")}
				<button @click=${() => replaceMain(postInputBox)}>back</button>
			</div>`);
		return;
	}

	let did = g[1];
	if (!g[1].startsWith("did:plc:")) {
		const res = await agent.rpc.get('com.atproto.identity.resolveHandle', {
			params: {
				handle: g[1]
			}
		});
		did = res.data.did;
	}

	const PAGE_LIMIT = 100;
	async function fetchPage(cursor) {
		return await agent.rpc.get(rpc, {
			params: {
				uri: `at://${did}/app.bsky.feed.post/${g[2]}`,
				limit: PAGE_LIMIT,
				cursor: cursor,
			},
		});
	}

	async function* pages() {
		let res = await fetchPage();
		let page = f(res.data);

		yield* page;

		while (res.data.cursor && page.length >= PAGE_LIMIT) {
			res = await fetchPage(res.data.cursor);
			page = f(res.data);

			yield* page;
		}

		replaceActionRow(html`<div class="row">
			<button @click=${muteall} style="flex:2">mute all</button>
			<button @click=${blockall} style="flex:1">block all</button>
			<button @click=${() => replaceMain(postInputBox)} style="flex:1">back</button>
		</div>`);
	}

	async function* withCopyTo(arr, gen) {
		for await (const v of gen()) {
			arr.push(v);
			yield v;
		}
	}

	async function createAll(records) {
		if (records.length === 0) return;

		records.forEach(r => {
			r['$type'] = 'com.atproto.repo.applyWrites#create';
		});

		const batchSize = 200;
		const amm = records.length;
		for (let i = 0; i < amm; i += batchSize) {
			await agent.rpc.call('com.atproto.repo.applyWrites', {
				data: {
					repo: agent.session.did,
					writes: records.slice(i, i + batchSize)
				}
			})
		}
	}

	async function recordExists(repo, collection, rkey) {
		try {
			await agent.rpc.get('com.atproto.repo.getRecord', {
				params: { repo, collection, rkey }
			})
			return true;
		} catch {
			return false;
		}
	}

	const doneRow = html`<div class="row">
			${centerText("Done!")}
			<button @click=${() => replaceMain(postInputBox)}>back</button>
		</div>`;

	async function blockall() {
		let records = [];

		replaceActionRow(centerText("Processing..."));

		const createdAt = (new Date()).toISOString();
		const itemType = 'app.bsky.graph.block';

		likers.filter((_,i) => !deselected[i]).forEach(actor => {
			if (!actor.viewer.blocking) {
				records.push({
					collection: itemType,
					value: {
						'$type': itemType,
						subject: actor.did,
						createdAt
					}
				});
			}
		});

		replaceActionRow(centerText("Creating blocks..."));

		await createAll(records);

		replaceActionRow(doneRow);
	}

	async function muteall() {
		const repo = agent.session.did;
		let records = [];

		replaceActionRow(centerText("Processing..."));

		const createdAt = (new Date()).toISOString();

		const listType = 'app.bsky.graph.list';
		const listRkey = 'bblock';
		const listExists = await recordExists(repo, listType, 'bblock');
		if (!listExists) {
			records.push({
				collection: listType,
				rkey: listRkey,
				value: {
					'$type': listType,
					purpose: 'app.bsky.graph.defs#modlist',
					name: LIST_NAME,
					description: 'automatically generated by '+URL,
					createdAt
				}
			});
		}

		const list = `at://${repo}/${listType}/${listRkey}`;

		const itemType = 'app.bsky.graph.listitem';

		likers.filter((_,i) => !deselected[i]).forEach(actor => {
			if (!actor.viewer.muted) {
				records.push({
					collection: itemType,
					value: {
						'$type': itemType,
						subject: actor.did,
						list,
						createdAt
					}
				});
			}
		});

		replaceActionRow(centerText("Creating mutes..."));

		await createAll(records);

		await new Promise(r => setTimeout(r, 100));

		const listBsky = `https://bsky.app/profile/${repo}/lists/${listRkey}`;
		const createdMessage = when(listExists, () => html``, () => html`It was automatically created for use by this tool. You may change its name and avatar.`);
		replaceActionRow(html`<div class="box">${doneRow}
				<p>Users were added to the <a href=${listBsky}>${LIST_NAME}</a> mute list.
				${createdMessage}
				You must subscribe to this list for the mutes to enter into effect.</p>
			</div>`);
	}

	const profile = (actor, index) => {
		const _ref = createRef();

		const select = () => {
			deselected[index] = !deselected[index];
			_ref.value.className = deselected[index] ? "profile deselected" : "profile";
		};

		if (following[actor.did]) {
			deselected[index] = true;
		}

		return html`<div ${ref(_ref)} class="${when(deselected[index], () => "profile deselected", () => "profile")}">
				<img src=${actor.avatar} />
				<div style="flex:1">
					<p>${actor.displayName}</p>
					<p>${actor.description}</p>
				</div>
				<button @click=${select} style="flex:0;min-width:2rem;max-width:2rem">X</button>
			</div>`;
	};

	replaceMain(html`<div class="box" style="display:flex">
			${actionRow}
			${asyncAppend(withCopyTo(likers, pages), profile)}
		</div>`);
}
