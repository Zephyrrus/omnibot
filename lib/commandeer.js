// command manager

var mods = require("./mods.js");
var config = require('../config/config.json');

var listeners = {};
var invite_regex = new RegExp(/http[s]*:\/\/discord\.gg\/(\w+)/);
var joinurl = "https://discordapp.com/oauth2/authorize?&client_id=175926136885346304&scope=bot";
var ParameterParser = require("./ArgumentObject.js");

function listDemands(arr) {
    var str = "";
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].type) str += arr[i].type + ", ";
        else str += arr[i] + ", ";
    }

    return str.substr(0, str.length - 2);
}

var ErrorSystem = {
    "throw": function (e, msg) {
        e.reply("Error: " + msg);
    }
};

var Command = function (manager, alias) {
    this.manager = manager;
    this._ = {};
    this._.aliases = [alias];
    this._.permission = "normal";
    this._.usage = "";
    this._.help = "No help provided.";
    this._.helptopics = [];
    this._.commands = {};

    this.alias = function (alias) {
        if (!alias) return this._.aliases[0];
        this._.aliases.push(alias);
        return this;
    };

    this.permission = function (permission) {
        if (!permission) return this._.permission;
        this._.permission = permission;
        return this;
    };

    this.usage = function (usage) {
        if (!usage) return this._.usage;
        this._.usage = usage;
        return this;
    };

    this.help = function (help) {
        if (!help) return this._.help;
        this._.help = help;
        return this;
    };

    this.on = function (cb) {
        this._.callback = cb;
        return this;
    };

    this.sub = function (alias) {
        return new Command(this, alias);
    };

    this.demand = function (i) {
        if (!Array.isArray(i)) {
            this._.reqArgs = i;
        } else {
            this._.reqArgs = i.length;
            this._.demandArgs = i;
        }

        return this;
    };

    this.params = function (i) {
        if (!(i instanceof Array)) {
            logger.warn("Command tried to load incorrectly formatted arguments.");
            return this;
        }
        this._.Params = new ParameterParser.Params(i);
        this._.usage = this._.Params.getHelp();
        return this;
    };

    this.bind = function () {
        for (var i = 0; i < this._.aliases.length; i++) {
            this.manager._.commands[this._.aliases[i]] = this;
        }

        if (this._.usage === "" && Object.keys(this._.commands).length > 0) {
            var us = "<";

            for (var i = Object.keys(this._.commands).length - 1; i >= 0; i--) {
                us += Object.keys(this._.commands)[i] + "/";
            }

            this.usage(us.slice(0, -1) + ">");
        }

        this.manager._.helptopics.push(this);

        return this.manager;
    };

    this._.run = function (e, a) {
        if (this.commands[a[0]] && typeof a[0] == "string") {
            this.commands[a[0]]._.run(e, a.slice(1));
            return;
        }
        if (this.Params) {
            var parsedParameters = this.Params.get(a.join(" "));
            if (parsedParameters && !parsedParameters.error) {
                this.callback(e, parsedParameters);
            } else {
                ErrorSystem.throw(e, "Sorry, I can't run the command with the provided arguments:\nError `" + parsedParameters.error.message + "`\nUsage: **" + this.Params.getHelp() + "**.");
                return;
            }
            return;
        }
        this.callback(e, a);
    };
};

var CommandManager = function () {
    this._ = {};
    this._.commands = {};
    this._.helptopics = [];

    this.command = function (alias) {
        return new Command(this, alias);
    };

    this.dispatch = function (cmd, msg, args) {
        if (this._.commands[cmd]) {
            var c = this._.commands[cmd];
            c._.run(msg, args);
        }
    };
};

function inviteTest(message) {
    if (invite_regex.test(message.content)) {
        var invid = invite_regex.exec(message.content)[1];
        var invite = global.InviteManager.resolve(invid);

        message.channel.sendMessage("Hi, " + message.author.username + "! I'm a bot! If you want me to join your server, you're gonna need to authorize me.");

        invite.then(function (invite) {
            message.channel.sendMessage("Click here to authorize me to join " + invite.guild.name + ": " + joinurl + "&guild_id=" + invite.guild.id);
        }).catch(function (err) {
            if (err)
                message.channel.sendMessage("Your invite was broken, but click this link: " + joinurl);
        });

        return;
    }
}

var manager = {
    "manager": new CommandManager(),
    "dispatch": function (message) {
        if (message.author.id == global.bot_id) return;
        if (message.isPrivate) {
            inviteTest(message);
        }

        var extract = message.content.toLowerCase().split(" "),
            args = message.content.split(" ").slice(2);

        if (extract[0] == config.discord.listenTo) {
            manager.manager.dispatch(extract[1], message, args);
        }
    }
};

module.exports = manager;
