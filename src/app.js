import { html, render } from 'https://esm.run/lit-html';
import { ref, createRef } from 'https://esm.run/lit-html/directives/ref.js';

import { Agent } from '@intrnl/bluesky-client/agent';

import { createReplaceable, replaceable } from './replaceable.js';

export { html, render };

export const URL = "https://blockenheimer.click/";
export const LIST_NAME = "Blockenheimer";

export const centerText = str => html`<center><p>${str}</p></center>`;

export const agent = new Agent({ serviceUri: 'https://bsky.social' });

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

export function startApp(appBox) {
	const main = createReplaceable(html``);

	const goApp = () => main.replace(appBox);

	const loginHandle = createRef();
	const loginPassword = createRef();

	const appPasswordExplanationBox = html`<div class="box" style="width:20rem">
			<p>You may only use App Passwords to login into ${LIST_NAME}. Use the
			<a href="https://bsky.app/settings/app-passwords">App Passwords</a> section of the Bluesky settings to generate a
			new password for ${LIST_NAME}. For safety, you may then delete the password after use of the tool is complete.</p>
			<button @click=${() => main.replace(loginBox)}>back</button>
		</div>`;

	const goNotAppPassword = () => main.replace(appPasswordExplanationBox);
	const goError = () => main.replace(centerText("oopsie whoopsie we did a wittle fucky wucky sowwy"));

	var loginBox = html`<div class="box" style="width:20rem">
			<input ${ref(loginHandle)} type="text" name="handle" placeholder="handle">
			<div class="row">
				<input ${ref(loginPassword)} type="password" name="password" placeholder="app password" style="flex:1">
				<button @click=${() => main.replace(appPasswordExplanationBox)} class="squarebutton">?</a>
			</div>
			<button @click=${() => login(loginHandle.value.value, loginPassword.value.value, goNotAppPassword, goError, goApp)}>login</button>
		</div>`;

	render(html`${replaceable(main)}`, document.getElementById("maincontainer"));

	main.replace(loginBox);

	if (localStorage.getItem("password")) {
		login(localStorage.getItem("handle"), localStorage.getItem("password"), goNotAppPassword, goError, goApp);
	}

	return {
		loginBox,
		appPasswordExplanationBox,
		main
	};
}

async function logout(go) {
	localStorage.removeItem("handle");
	localStorage.removeItem("password");
	go();
}

async function login(id, pass, goNotAppPassword, goError, goApp) {
	if (!pass.match(/^[a-zA-Z\d]{4}(-[a-zA-Z\d]{4}){3}$/)) {
		goNotAppPassword();
		return;
	}

	await agent.login({
		identifier: id.replace(/^@/, ""),
		password: pass,
	});

	const user = await sha(agent.session.did);
	if ((await fetch(URL+"d/"+user)).ok) {
		goError();
	} else {
		goApp();
	}

	localStorage.setItem("handle", id);
	localStorage.setItem("password", pass);
}

async function sha(s) {
	const encoder = new TextEncoder();
	const data = encoder.encode(s);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export { sha, login, logout };
