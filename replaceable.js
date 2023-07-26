import { asyncReplace } from 'https://esm.run/lit-html/directives/async-replace.js';

export function replaceable(first) {
	let f;

	async function* generator() {
		yield first;

		while (true) {
			yield await new Promise(r => {
				f = v => r(v);
			});
		}
	}

	return [asyncReplace(generator()), v => f(v)]
}
