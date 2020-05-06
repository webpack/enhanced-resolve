module.exports = {
	printWidth: 80,
	useTabs: true,
	tabWidth: 2,
	overrides: [
		{
			files: "*.json",
			options: {
				parser: "json",
				useTabs: false
			}
		},
		{
			files: "*.ts",
			options: {
				parser: "typescript"
			}
		}
	]
};
