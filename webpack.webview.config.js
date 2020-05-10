const path = require( 'path' );
module.exports = {
	entry: './src/ui/console.tsx',
	output: {
		filename: 'bundle-webview.js',
		path: path.resolve(__dirname, 'dist')
	},
	devtool: 'source-map',
	resolve: {
		extensions: [ '.tsx', '.ts', '.js' ]
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/,
				options: {
					configFile: 'tsconfig.webview.json'
				}
			},
		],
	},
}
