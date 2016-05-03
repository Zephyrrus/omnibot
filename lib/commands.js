var commandeer = require("./commandeer.js"),
    mods = require("./mods.js");

commandeer.manager
    .command("help")
    .alias("h")
    .help("Get help!")
    .on(function (msg, args) {
        var helptxt = "**" + global.botName + " Help**\nAll commands are prefixed with `dqd` (with a space).\n\n";
        for (var i = 0; i < commandeer.manager._.helptopics.length; i++) {
            var command = commandeer.manager._.helptopics[i];
            helptxt += "**" + command.alias() + " " + command.usage().trim() + "** - " + command.help() + "\n";

						// go deeper recursively for childs.
            if (Object.keys(command._.commands).length > 0) {
								var aliasBuster = [];
                for (var subcmd in command._.commands) {
										//if(command._.commands[subcmd].alias() == command.alias()) continue; // this is just an alias of the previous command
										if(aliasBuster.indexOf(command._.commands[subcmd].alias()) > -1) continue; // this is just an alias of a child command
                    helptxt += "\t**" + command._.commands[subcmd].alias() + " " + command._.commands[subcmd].usage().trim() + "** - " + command._.commands[subcmd].help() + "\n";
										if(command._.commands[subcmd].getAliases().length > 1) helptxt += "\t\tAliases: **" + command._.commands[subcmd].getAliases() + "**\n";
										aliasBuster.push(command._.commands[subcmd].alias());
									}
            }

        }
        msg.reply("Check your PMs.");
        msg.author.openDM().then(function (dm) {
            dm.sendMessage(helptxt);
        });
    }).bind()
    .command("server")
    .help("Get the server management page.")
    .on(function (msg, args) {
        msg.reply("http://omni.offbeatwit.ch/#/server/" + msg.guild.id);
    }).bind()
    .command("debug")
    	.help("debug command")
    	.params([{ id: "command", type: "string", required: true }])
    	.on(function (msg, args) {
        	msg.reply("go deeper pls");
    	})
    		.sub("deeper")
    		.params([{ id: "command", type: "string", required: true }])
    		.help("deep debug command")
    		.on(function (msg, args) {
        	msg.reply("deeper!!!");
    		}).bind()
    .bind();
