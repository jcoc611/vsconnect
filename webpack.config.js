const path = require( 'path' );
module.exports = {
	entry: './src/ui/console.ts',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist-webview')
	},
	resolve: {
		extensions: [ '.tsx', '.ts', '.js' ]
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
}
