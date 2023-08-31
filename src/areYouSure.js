import { html } from 'https://esm.run/lit-html';
import { createReplaceable } from './replaceable.js';

export const areYouSure = (r, back, action) =>
	r.replace(html`<div class="row">
			<span style="flex:1">Are you sure?</span>
			<button style="flex:1" @click=${() => r.replace(back)}>No</button>
			<button style="flex:1" @click=${() => { action(); r.replace(back); }}>Yes</button>
		</div>`);

export const createAreYouSure = (name, action) => {
	const row = createReplaceable();
	const button = html`<button @click=${() => areYouSure(row, button, action)}>${name}</button>`;
	row.replace(button);
	return row;
};
