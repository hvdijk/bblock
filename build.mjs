import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
import * as esbuild from 'esbuild';

const litHtmlTrimLeadingWhitespace = {
	name: 'lit-html-trim-leading-whitespace',
	setup(build) {
		build.onLoad({ filter: /.*\.js/ }, async ({ path }) => {
			return {
				contents: (await fs.readFile(path, "utf8"))
					.replaceAll(/html`[\s\S]+?`/g, match => {
						return match.replaceAll(/^[ \t]*/gm, "");
					})
			};
		})
	}
};

let htmlFiles = {};
async function htmlJoiner(path) {
	if (htmlFiles[path]) return htmlFiles[path];

	const dir = dirname(path);
	const content = await fs.readFile(path, "utf8");

	let arr = [];
	for (const part of content.split(/<!-- (join:\S+?) -->/g)) {
		if (part.startsWith("join:")) {
			arr.push(await htmlJoiner(resolve(dir, part.replace(/^join:/, "") + ".html")));
		} else {
			arr.push(part);
		}
	}

	const joined = arr.join("");
	htmlFiles[path] = joined;
	return joined;
}

await fs.rm('dist', { recursive: true, force: true })

await fs.cp('themes', 'dist/themes', { recursive: true });

const apps = ['index', 'unblocker', 'history'];
if (await fs.access('src/admin.html').then(() => true).catch(() => false)) apps.push('admin');

for (const app of apps) {
	console.log(app);

	await fs.writeFile('dist/'+app+'.html', await htmlJoiner(resolve('src/'+app+'.html')));

	console.log(await esbuild.build({
		entryPoints: [ 'src/'+app+'.js' ],
		outfile: 'dist/'+app+'.js',
		platform: 'browser',
		format: 'esm',
		bundle: true,
		minify: false,
		plugins: [ litHtmlTrimLeadingWhitespace ],
	}));
}

await fs.writeFile('dist/donate.html', await htmlJoiner(resolve('src/donate.html')));
