const lsKey = "history";

export function get() {
	const ls = localStorage.getItem(lsKey);
	return ls ? JSON.parse(ls) : [];
}

export function remove(timestamp) {
	localStorage.setItem(lsKey, JSON.stringify(get().filter(item => item.timestamp !== timestamp)));
}

export function valid(item) {
	return typeof item === "object"
		&& typeof item.collection === "string"
		&& typeof item.timestamp === "string"
		&& typeof item.targetUrl === "string"
		&& typeof item.recordCount === "number";
}

export function add(item) {
	if (!valid(item))
		throw new Error("invalid history item");

	const hist = get();
	hist.push(item)
	localStorage.setItem(lsKey, JSON.stringify(hist));
}
