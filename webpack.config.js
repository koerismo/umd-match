const { resolve } = require('path');

module.exports = {
	entry:	'./build/js/index.js',
	mode:	'production',

	output: {
		path: resolve(__dirname, './build/js/'),
		filename: 'game.bundle.js',
	},

	// module: {
	// 	rules: [
	// 		{
	// 		test: /\.ts(x)?$/,
	// 		loader: 'ts-loader',
	// 		exclude: /node_modules/
	// 		}
	// 	]
	// },

	// resolve: {
	// 	extensions: [
	// 		'.tsx',
	// 		'.ts',
	// 		'.js'
	// 	]
	// }
}