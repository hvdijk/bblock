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

await fs.rm('dist', { recursive: true, force: true })

await fs.cp('themes', 'dist/themes', { recursive: true });

const apps = ['index', 'unblocker'];
if (await fs.access('src/admin.html').then(() => true).catch(() => false)) apps.push('admin');

for (const app of apps) {
	console.log(app);

	await fs.cp('src/'+app+'.html', 'dist/'+app+'.html');

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
