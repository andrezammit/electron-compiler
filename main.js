var path = require("path");
var fs = require("fs-extra");
var child_process = require('child_process');

var packager = require("electron-packager");
var removeEmptyDirs = require('remove-empty-directories');

var appDir = "./app/";
var releasesDir = "./releases";
var repoDir = "../Recipe Manager/";
var cachedDependsDir = "./cached_node_modules";

var babelPath = path.normalize("node_modules/.bin/babel");

var uglifyList =
    [
        "modules/",
        "scripts/launcher.js",
        "main.js"
    ];

var ignoreList = IgnoreList();

function IgnoreList()
{
    var list =
        [
            "node_modules/",
            ".git/",
            ".data/",
            ".gitignore",
            ".jshintrc",
            ".vscode/",
            ".credentials/",
            "icons/",
            "typings/",
            "typings.json",
            "jsconfig.json",
        ];

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
        search: function (searchItem)
        {
            return search(searchItem);
        }
    };
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
    console.log("Uglifying  %s...", filePath);
    
    var options =
        {
            "stdio": "inherit"
        };

    var cmd = babelPath + " " + filePath + " --out-file " + filePath + " --presets babili";

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

    uglifyList.forEach(
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

function runPackager(platform, callback) 
{
    console.log("");    
    console.log("Packaging application...");
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
                console.log("Packaging failed: ", error);
            }
            else
            {
                console.log("Packaged successfully to: " + appPaths[0]);
            }

            callback(error);
        });
}

function run(callback)
{
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

    runPackager("win32",
        function (error)
        {
            clean();
            callback();
        }
    );
}

run(
    function (error)
    {
        process.exit();
    });
