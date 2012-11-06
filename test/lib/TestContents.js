exports.simple = {
	home: {
		user: {
			node_modules: {
				usermodule1: {
					"index.js": ""
				},
				usermodule2: {
					"package.json": JSON.stringify({
						main: "main"
					}),
					"main.js": ""
				},
				"usermodule3.js": ""
			},
			app: {
				lib: {
					"file.js": ""
				}
			}
		}
	}
};

exports.depth = {
	home: {
		user: {
			node_modules: {
				usermodule1: {
					"index.js": ""
				},
				usermodule2: {
					"package.json": JSON.stringify({
						main: "main"
					}),
					"main.js": ""
				},
				"usermodule3.js": ""
			},
			app: {
				node_modules: {
				
				},
				lib: {
					node_modules: {
					},
					web_modules: {
					},
					directory: {
						node_modules: {
						},
						"file.js": ""
					}
				}
			}
		}
	}
};