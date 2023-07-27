import { directive } from 'https://esm.run/lit-html/directive.js';
import { AsyncDirective } from 'https://esm.run/lit-html/async-directive.js';

export function createResolvable() {
	let f;
	const p = new Promise(r => { f = r; });
	return [ p, f ]
}

export function createReplaceable(first) {
	let resolve;
	const obj = {
		replace(value) {
			this.last = value;

			if (resolve !== undefined) resolve(value);

			let [ p, r ] = createResolvable();

			this.next = p;
			resolve = r;
		}
	};

	obj.replace(first);

	return obj;
}

export class Replaceable extends AsyncDirective {
	async start() {
		this.subscribed = true;
		while (this.isConnected) {
			const instance = this.instance;
			const v = await instance.next;

			if (instance == this.instance) {
				this.setValue(v);
			} else if (this.instance.last) {
				this.setValue(this.instance.last);
			}
		}

		this.subscribed = false;
	}

	subscribe() {
		if (!this.subscribed) {
			this.start();
		}

		if (this.instance.last) {
			this.setValue(this.instance.last);
		}
	}

	render(instance, first) {
		this.instance = instance;
		this.subscribe();

		return this.instance.last;
	}

	disconnected() {}
	reconnected() {
		this.subscribe();
	}
}

export const replaceable = directive(Replaceable);
