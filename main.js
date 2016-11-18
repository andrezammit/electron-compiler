var path = require("path");
var fs = require("fs-extra");

var packager = require("electron-packager");
var uglifyJS = require("uglify-js");

var repoDir = "..\\Recipe Manager\\";
var ignoreList =
    [
        "node_modules",
        ".git",
        ".data",
        ".gitignore",
        ".jshintrc",
        ".vscode",
        ".credentials",
        "icons",
        "typings",
        "jsconfig.json",
    ];

function enumFolder(dirPath, filesFound)
{
    var dirItems = fs.readdirSync(dirPath);

    dirItems.forEach(
        function (item)
        {
            var filePath = path.join(dirPath, item);

            if (ignoreList.indexOf(item) > -1)
                return;

            var itemToAdd = filePath;
            itemToAdd = itemToAdd.replace(repoDir, "");

            filesFound.push(itemToAdd);

            var stats = fs.statSync(filePath);

            if (stats.isDirectory())
                enumFolder(filePath, filesFound);
        });
}

function copyRepo()
{
    var itemsToCopy = [];
    enumFolder(repoDir, itemsToCopy);

    itemsToCopy.forEach(
        function (item)
        {
            console.log(item);
        });
}

function runPackager() 
{
    var options =
        {
            "dir": "../Recipe Manager/",
            "arch": "x64",
            "platform": "win32",
            "app-copyright": "André Zammit",
            "app-version": "1.0.3",
            "icon": "../Recipe Manager/icons/icon.ico",
            "name": "Recipe Manager",
            "ignore":
            [
                "/.data",
                "/.gitignore",
                "/.jshintrc",
                "/.vscode",
                "/.credentials",
                "/icons",
                "/typings",
                "/jsconfig.json",
            ],
            "out": "./releases",
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
                return;
            }

            console.log("Packaged successfully to: " + appPaths[0]);
        });
}

function run()
{
    copyRepo();
    //runPackager();
}

run();