const resolve = require("./lib");

const folder = "./";
const myTarget = "graceful-fs";

const demoResolve = resolve.create({
	extensions: [".ts", ".js"]
});

demoResolve(folder, myTarget, (err, result) => {
	console.log({ result });
});
