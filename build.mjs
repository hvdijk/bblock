import { promises as fs } from 'fs';
import * as esbuild from 'esbuild';

const litHtmlTrimLeadingWhitespace = {
	name: 'lit-html-trim-leading-whitespace',
	setup(build) {
		build.onLoad({ filter: /app\.js/ }, async ({ path }) => {
			return {
				contents: (await fs.readFile(path, "utf8"))
					.replaceAll(/html`[\s\S]+?`/g, match => {
						return match.replaceAll(/^[ \t]*/gm, "");
					})
			};
		})
	}
};

console.log(await esbuild.build({
	entryPoints: [ 'app.js' ],
	outfile: 'out.js',
	platform: 'browser',
	format: 'esm',
	bundle: true,
	minify: false,
	plugins: [ litHtmlTrimLeadingWhitespace ],
}));
