import { asyncReplace } from 'https://esm.run/lit-html/directives/async-replace.js';

export function replaceable(first) {
	let f = (v) => { first = v; };

	async function* generator() {
		while (true) {
			if (first !== undefined) {
				yield first;
				first = undefined;
			}

			yield await new Promise(r => {
				f = (v) => r(v);
			});
		}
	}

	return [asyncReplace(generator()), (v) => f(v)]
}
