var fs = require("fs");

var packager = require("electron-packager");
var uglifyJS = require("uglify-js");

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
    function(error, appPaths)
    {
        if (error !== null)
        {
            console.log("Packaging failed: ", error);
            return;
        }

        console.log("Packaged successfully to: " + appPaths[0]);
    });

