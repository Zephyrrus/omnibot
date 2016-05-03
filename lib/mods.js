// permissions, sleep, etc
var commandeer = require("./commandeer.js");

var fs = require("fs"),
    logger = require("winston");
const path = require('path');

var config = require('../config/config.json');

var ModuleLoader = {
    "load": function (m) {
        fs.readdir(__dirname + "/modules", function (err, files) {
            if (err) {
                logger.error("[LOADMODULE] Failed to read modules directory: " + err);
                return;
            }
            files.forEach(function (file) {
                    if (path.extname(file) === ".js") {
                        var mod;
                        try {
                            mod = require("./modules/" + file);
                            logger.debug("[LOADMODULE] Loaded file '" + file + "'");
                        } catch (e) {
                            logger.error("[LOADMODULE] Failed loading file: '" + file + "'\n" + e.stack);
                            return;
                        }

                        if (!mod.name) {
                            logger.error("[LOADMODULE] There was a problem loading module file '" + file + "'!\nError: module has no name!");
                            return;
                        }

                        if (!mod.init) {
                            logger.error("[LOADMODULE] There was a problem loading module '" + mod.name + "'!\nError: No init function provided!");
                            return;
                        }

                        try {
                            mod.init(config, m.manager);
                            logger.debug("[LOADMODULE] Initialized module '" + mod.name + "'");
                        } catch (e) {
                            logger.error("[LOADMODULE] Failed initializing module: '" + mod.name + "'\n" + e.stack);
                            return;
                        }

                        if (mod.exposed !== null)
                            module.exports[mod.name] = mod.exposed;
                    }
            });
        });
    }
};

var mods = {
    "loader": {
        "load": ModuleLoader.load
    }
};

module.exports = mods;
