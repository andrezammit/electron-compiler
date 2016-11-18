var path = require("path");
var fs = require("fs-extra");
var child_process = require('child_process');

var uglifyJS = require("uglify-js");
var packager = require("electron-packager");
var removeEmptyDirs = require('remove-empty-directories');

var appDir = "./app/";
var releasesDir = "./releases";
var repoDir = "../Recipe Manager/";

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
    console.log("Cleaning build environment...");
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
    console.log("Copying repository to build environment...");

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

    console.log("Removing empty directories...");
    removeEmptyDirs(appDir);

    console.log("Application copied to %s", appDir);
    return true;
}

function installDepends()
{
    console.log("Installing npm dependencies...");
    
    var options = 
    {
        "cwd": appDir,
        "stdio": [0, 1, 2]
    };

    child_process.execSync("npm install", options);
}

function runPackager(platform, callback) 
{
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
        return;

    if (!copyRepo())
        return;

    installDepends();

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
