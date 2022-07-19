const { resolve } = require('path');

module.exports = {
	entry:	'./src/index.js',
	mode:	'development',

	output: {
		path: resolve(__dirname, './build/js/'),
		filename: 'game.bundle.js',
	},
}