import path from 'node:path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
import webpackNodeExternals from 'webpack-node-externals';
import CreateFileWebpack from 'create-file-webpack';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const envExample = readFileSync('./.env.example', 'utf8');

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
	externals: [webpackNodeExternals()],
	resolve: {
		fallback: {
			'zlib-sync': false
		},
		extensions: ['.tsx', '.ts', '.js']
	},
	plugins: [
		new CreateFileWebpack({
			path: './dist',
			fileName: 'package.json',
			content: JSON.stringify({ dependencies: packageJson.dependencies })
		}),
		new CreateFileWebpack({
			path: './dist',
			fileName: '.env.example',
			content: envExample
		})
	],
	output: {
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
