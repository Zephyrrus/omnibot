// omnibot - a discord bot


var discordie = require("discordie"),
	fs = require("fs"),
	logger = require("winston");

var commandeer = require("./lib/commandeer.js"),
	commands = require("./lib/commands.js"),
	webserver = require("./lib/web/webserver.js"),
	mods = require("./lib/mods.js");

var config = require('./config/config.json');
var auth = require('./config/auth.json');
var package = require('./package.json');

/*----LOGGING----*/
var dt = new Date();
var t = (dt.getDate() + "_" + (dt.getMonth() + 1) + "_" + dt.getFullYear());
var fname = './log/' + t + '.log';
try {
    fs.mkdirSync('./log');
} catch (e) {

}
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.add(logger.transports.File, {
    level: 'debug',
    filename: fname
});
logger.level = 'debug';
////

/*----Variables----*/
config._ = {};
config._.name = package.name;
////

logger.info(`[CORE] Starting ${config._.name}.`);
logger.info(`[CORE] Version: ${package.version}.`);
logger.info(`[CORE] Listening to: ${config.discord.listenTo}.`);

var bot = new discordie();

bot.connect({
	token: auth.discord.token
});

bot.Dispatcher.on(discordie.Events.GATEWAY_READY, function(e) {
	logger.info(`[CORE] ${config._.name} started. Username: ${bot.User.username}`);

	global.InviteManager = bot.Invites;
	global.bot_id = bot.User.id;
	global.bot = bot.User;
	global.discordie = bot;
	global.botName = config._.name;
	//bot.User.edit(null, null, fs.readFileSync("profile.png")); // temp profile update

	mods.loader.load(commandeer);
});

bot.Dispatcher.on(discordie.Events.MESSAGE_CREATE, function(e) {
	logger.verbose("[MESSAGE] (" + e.message.channel.name + ") [" + e.message.author.username + "]: " +
									e.message.content.replace(/[^A-Za-z0-9.,\/#!$%\^&\*;:{}=\-_`~() ]/, '') +
									(e.message.attachments[0] !== undefined ? "[attachments: " + e.message.attachments[0].url + " ]" : "")
								);

	commandeer.dispatch(e.message);
});
