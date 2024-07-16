import CreateFileWebpack from 'create-file-webpack';
import { readFileSync } from 'fs';
import path from 'node:path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const externalDependencies = ['sqlite3', 'discord.js'];

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const dependencies = externalDependencies.reduce((acc, curr) => {
	acc[curr] = packageJson.dependencies[curr];
	return acc;
}, {});
const externals = Object.keys(dependencies).reduce((acc, curr) => {
	acc[curr] = 'commonjs ' + curr;
	return acc;
}, {});

const envExample = readFileSync('./.env.example', 'utf8');

/**
 * @type {import('webpack').WebpackOptionsNormalized}
 */
export default {
	entry: './src/index.ts',
	target: 'node',
	mode: 'production',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	externals,
	resolve: {
		mainFields: ['main'],
		fallback: {
			'zlib-sync': false
		},
		extensions: ['.tsx', '.ts', '.js']
	},
	plugins: [
		new CreateFileWebpack({
			path: './dist',
			fileName: 'package.json',
			content: JSON.stringify({ dependencies })
		}),
		new CreateFileWebpack({
			path: './dist',
			fileName: '.env',
			content: envExample
		})
	],
	output: {
		clean: true,
		filename: 'index.js',
		path: path.resolve(__dirname, 'dist')
	},
	optimization: {
		minimize: true
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
