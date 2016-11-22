var path = require("path");
var fs = require("fs-extra");
var child_process = require('child_process');

var packager = require("electron-packager");
var beautify = require('js-beautify').js_beautify;
var removeEmptyDirs = require("remove-empty-directories");

var appDir = "./app/";
var releasesDir = "./releases";
var repoDir = "../Recipe Manager/";
var cachedDependsDir = "./cached_node_modules";

var babelPath = path.normalize("node_modules/.bin/babel");
var minifyPath = path.normalize("node_modules/.bin/minify");

var configPath = "";
var packagePath = "";

var config = {};

var platforms = [];

var validPlatforms =
	[
		"win32",
		"linux",
		"darwin"
	];

var ignoreList = IgnoreList();

function IgnoreList()
{
	var list = [];

	function search(searchItem)
	{
		for (var cnt = 0; cnt < list.length; cnt++)
		{
			var item = list[cnt];

			if (item === searchItem)
				return cnt;

			if (item.slice(-1) == "/")
			{
				searchItem = searchItem.replace("\\", "/");

				if (searchItem.indexOf(item) === 0)
					return cnt;
			}
			else
			{
				if (searchItem === path.parse(item).base)
					return cnt;
			}
		}

		return -1;
	}

	return {
		set: function (ignoreList)
		{
			list = ignoreList;
		},

		get: function ()
		{
			return list;
		},

		search: function (searchItem)
		{
			return search(searchItem);
		}
	};
}

function readEnvironment()
{
	if (process.argv.length < 3)
	{
		console.log("Applicaton path not found.");
		return false;
	}

	repoDir = process.argv[2];

	var stats = fs.statSync(repoDir);

	if (!stats.isDirectory())
	{
		console.log("%s is not a valid directory.", repoDir);
		return false;
	}

	packagePath = path.join(repoDir, "package.json");

	stats = fs.statSync(packagePath);

	if (!stats.isFile())
	{
		console.log("package.json was not found in %s.", repoDir);
		return false;
	}

	try
	{
		packageJSON = JSON.parse(fs.readFileSync(packagePath));
	}
	catch (error)
	{
		console.log("Failed to parse package.json. %s", error);
		return false;
	}

	configPath = path.join(repoDir, "electron_compiler.json");

	try 
	{
		config = JSON.parse(fs.readFileSync(configPath));
	}
	catch (error)
	{
		console.log("Failed to parse electron_compiler.json.");
		return false;
	}

	ignoreList.set(config.ignoreList);

	if (!detectPlatforms())
		return false;

	dumpConfig();
	return true;
}

function detectPlatforms()
{
	var success = true;

	config.platforms.forEach(
		function (item)
		{
			if (!success)
				return;

			if (validPlatforms.indexOf(item) === -1)
			{
				console.log("%s is not a valid platform.", item);
				success = false;

				return;
			}

			var platform =
				{
					"name": item,
					"done": false
				};

			platforms.push(platform);
		});

	return success;
}

function dumpConfig()
{
	var appName = packageJSON.productName;

	if (appName === undefined || appName.length === 0)
		appName = packageJSON.name;

	console.log("Application: %s", appName);
	console.log("Current version: %s", packageJSON.version);
	console.log("");
	console.log("Building for: %s", config.platforms.join(", "));
	console.log("Ignoring: %s", ignoreList.get().join(", "));
	console.log("Uglifying: %s", config.uglifyList.join(", "));
}

function clean()
{
	console.log("");
	console.log("Cleaning build environment...");
	console.log("");

	console.log("Removing %s", appDir);

	try
	{
		fs.removeSync(appDir);
	}
	catch (error)
	{
		console.log("Failed to remove %s. %s", appDir, error);
		return false;
	}

	console.log("Build environment cleaned.");
	return true;
}

function copyRepo()
{
	console.log("");
	console.log("Copying repository to build environment...");
	console.log("");

	function isItemAllowed(item)
	{
		item = path.relative(repoDir, item);

		if (item === "")
			return true;

		if (ignoreList.search(item) > -1)
			return false;

		console.log("Copying %s...", item);
		return true;
	}

	var options =
		{
			"filter": isItemAllowed
		};

	try
	{
		fs.copySync(repoDir, appDir, options);
	}
	catch (error)
	{
		console.log("Failed to copy repository to %s. %s", appDir, error);
		return false;
	}

	console.log("");
	console.log("Removing empty directories...");

	removeEmptyDirs(appDir);

	console.log("");
	console.log("Application copied to %s", appDir);

	return true;
}

function uglifyDir(dirPath)
{
	var dirItems = fs.readdirSync(dirPath);

	dirItems.forEach(
		function (item)
		{
			var fullPath = path.join(dirPath, item);
			var stats = fs.statSync(fullPath);

			if (stats.isDirectory())
			{
				uglifyDir(fullPath);
			}
			else
			{
				uglifyFile(fullPath);
			}
		});
}

function uglifyFile(filePath)
{
	console.log("Uglifying %s...", filePath);

	var options =
		{
			"stdio": "inherit"
		};

	var cmd = "";

	switch (path.parse(filePath).ext)
	{
		case ".js":
			cmd = babelPath + " " + filePath + " --out-file " + filePath + " --presets babili";
			break;

		case ".css":
			cmd = minifyPath + " " + filePath + " --output " + filePath;
			break;

		default:
			console.log("%s cannot be uglified.", filePath);
			return false;
	}

	try
	{
		child_process.execSync(cmd, options);
	}
	catch (error)
	{
		console.log("Failed to uglify %s. %s", filePath, error);
		return false;
	}

	return true;
}

function uglifyApp()
{
	console.log("");
	console.log("Uglifying source code...");
	console.log("");

	var success = true;

	config.uglifyList.forEach(
		function (item)
		{
			if (!success)
				return;

			item = path.join(appDir, item);

			if (item.slice(-1) == path.sep)
			{
				uglifyDir(item);
				return;
			}

			if (!uglifyFile(item))
				success = false;
		});

	return success;
}

function isCachedDepends()
{
	try
	{
		var stats = fs.statSync(cachedDependsDir);

		if (!stats.isDirectory())
			return false;
	}
	catch (error)
	{
		return false;
	}

	return true;
}

function copyCachedDepends()
{
	console.log("Copying cached dependencies...");

	var dest = appDir + "node_modules";

	var options =
		{
			"clobber": false
		};

	try
	{
		fs.copySync(cachedDependsDir, dest, options);
	}
	catch (error)
	{
		console.log("Failed to copy cached dependencies. %s", error);
	}
}

function cacheDepends()
{
	console.log("Caching dependencies...");

	var source = appDir + "node_modules";

	var options =
		{
			"clobber": false
		};

	try
	{
		fs.copySync(source, cachedDependsDir, options);
	}
	catch (error)
	{
		console.log("Failed to cache dependencies. %s", error);
	}
}

function installDepends()
{
	console.log("");
	console.log("Installing npm dependencies...");
	console.log("");

	var useCachedDepends = isCachedDepends();

	if (useCachedDepends)
		copyCachedDepends();

	var options =
		{
			"cwd": appDir,
			"stdio": "inherit"
		};

	try
	{
		child_process.execSync("npm install", options);
	}
	catch (error)
	{
		console.log("Failed to install npm dependencies. %s", error);
		return false;
	}

	if (!useCachedDepends)
		cacheDepends();

	return true;
}

function updateVersion()
{
	var version = packageJSON.version.split(".");

	if (version.length < 3)
	{
		console.log("Invalid version format.");
		return false;
	}

	var minorVersion = parseInt(version[2]);
	version[2] = ++minorVersion;

	packageJSON.version = version.join(".");
	return true;
}

function isAllPlatformsReady()
{
	var allReady = true;

	platforms.forEach(
		function (platform)
		{
			if (!allReady)
				return;

			if (platform.done)
				return;

			allReady = false;
		});

	return allReady;
}

function runPackager(platform, callback)
{
	console.log("");
	console.log("Packaging application for %s...", platform);
	console.log("");

	var iconPath = repoDir + "icons/icon.";

	switch (platform)
	{
		case "win32":
		case "linux":
			iconPath += "ico";
			break;

		case "darwin":
			iconPath += "icns";
			break;
	}

	var options =
		{
			"dir": appDir,
			"arch": "x64",
			"platform": platform,
			"app-copyright": "André Zammit",
			"app-version": "1.0.3",
			"icon": iconPath,
			"name": "Recipe Manager",
			"out": releasesDir,
			"overwrite": true,
			"prune": true,
			"version-string":
			{
				"CompanyName": "André Zammit",
				"FileDescription": "Recipe Manager application.",
				"OriginalFilename": "Recipe Manager.exe",
				"ProductName": "Recipe Manager",
				"InternalName": "Recipe Manager"
			}
		};

	packager(options,
		function (error, appPaths)
		{
			if (error !== null)
			{
				console.log("Packaging failed for %s. %s", platform, error);
			}
			else if (appPaths.length === 0)
			{
				console.log("Packaging failed for %s", platform);
			}
			else
			{
				console.log("Packaged %s successfully to %s.", platform, appPaths[0]);
			}

			callback(error);
		});
}

function savePackageJSON()
{
	console.log("");
	console.log("Updating package.json in repository...");
	console.log("");

	var options =
		{
			"indent_with_tabs": true,
			"brace_style": "expand",
			"end_with_newline": true
		};

	var data = beautify(packageJSON.toString(), options);

	if (data.length === 0)
	{
		console.log("Failed to beautify package.json.");
		return false;
	}

	try
	{
		fs.writeFileSync(packagePath, data);
	}
	catch (error)
	{
		console.log("Failed to copy package.json to repository. %s", error);
		return false;
	}

	console.log("Updated package.json in repository.");
	return true;
}

function run(callback)
{
	if (!readEnvironment())
	{
		callback();
		return;
	}

	if (!clean())
	{
		callback();
		return;
	}

	if (!copyRepo())
	{
		callback();
		return;
	}

	if (!uglifyApp())
	{
		callback();
		return;
	}

	if (!installDepends())
	{
		callback();
		return;
	}

	if (!updateVersion())
	{
		callback();
		return;
	}

	platforms.forEach(
		function (platform)
		{
			runPackager(platform.name,
				function (error)
				{
					platform.done = true;

					if (isAllPlatformsReady())
					{
						savePackageJSON();
						clean();

						callback();
					}
				}
			);
		});
}

run(
	function (error)
	{
		process.exit();
	});
