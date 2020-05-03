const path = require( 'path' );
module.exports = {
	target: 'node',
	entry: './src/extension.ts',
	output: {
		filename: 'extension.js',
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]'
	},
	devtool: 'source-map',
	externals: {
		vscode: 'commonjs vscode'
	},
	resolve: {
		extensions: [ '.ts', '.js' ]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader',
				exclude: /node_modules|src\/ui/,
				options: {
					configFile: 'tsconfig.extension.json',
					compilerOptions: {
						"module": "es6"
					}
				}
			},
		],
	},
}
