var logger = require("winston");
var minimist = require('minimist');

/**
* This is the parameter descriptor
* Format for options elements:
* id: the name for this param. Alphanumeric.
* type: a key from paramTypes
* options: passed to the paramType handler
* required: bool if this is a required param
*
* @param options array The expected options
*/
function Params(options) {
    if(!options) {
        options = {};
    }

    this.options = options;
}

/**
* Extracts params from the string using the correct handler
* Returns an error if required args are not present or if the string is
* not well formatted. After the last argument is extracted, the remainder of
* the string will be added to the "_str" property of the returned object
* New format: {error: {message: "", ...}, results: {...}}
*
* @param string string The message
* @return object
*/
Params.prototype.get = function(string) {
    var o = {};
    for(var i in this.options) {
        var option = this.options[i];
        if(!paramTypes[option.type]) {
            logger.debug("Invalid param type: " + option.type);
            if(option.required) {
                return {
                    error: {
                        silent: false,
                        displayHelp: true,
                        message: "Required parameter of invalid type: " + option.id
                    }
                };
            }
            continue;
        }
        try {
            if(typeof(paramTypes[option.type]) == "function") {
                var r = paramTypes[option.type](string, option.options || {});
            } else {
                var r = paramTypes[option.type].get(string, option.options || {});
            }
            o[this.options[i].id] = r.val;
            string = r.string;
        } catch(e) {
            if(option.required || option.canError) {
                e.silent = false;
                e.displayHelp = true;
                return {
                    error: e
                };
            }
        }
    }

    o["_str"] = string;

    return {
        error: null,
        results: o
    };
};

Params.prototype.getHelp = function () {
    var str = "";
    for (var i in this.options) {
        if (this.options.hasOwnProperty(i)) {
            option = this.options[i];
            str += (option.required) ? "<" : "[";
            str += option.type + ":";
            if(!paramTypes[option.type]) {
                logger.debug("Invalid param type: " + option.type);
                str += "*invalid type*";
            } else {
                if(typeof(paramTypes[option.type]) == "object" && typeof(paramTypes[option.type].help) == "function") {
                    str += paramTypes[option.type].help(option);
                } else {
                    str += option.id;
                }
            }
            str += (option.required) ? "> " : "] ";
        }
    }
    return str;
};


/**
* ParamTypes extract their type from the string
* The returned string should remove the current param
* Return: {val: value, string: ...}
* @throws Error if can't get the value
* @return object
*/
var paramTypes = {
    number: function(string, options) {
        var numberExtractor = /^ *([0-9]*\.?[0-9.]*)( |$)/;
        var numstr = string.match(numberExtractor);

        if(!numstr || isNaN(Number(numstr[1])) || /^ *$/.test(numstr[1])) {
            throw new Error("Invalid number");
        }

        var str = numstr[1];
        var num = Number(str);
        var rest = string.substring(string.indexOf(str) + str.length);
        return {
            val: num,
            string: rest
        };
    },
    string: function(string, options) {
        var quotedString = /^ *("(\\"|[^"])*"|[^ ]+)/;
        var str = string.match(quotedString);
        options = options || {};
        if(!str) {
            throw new Error("Invalid string");
        }


        var k = str[1];
        var rest = string.substring(string.indexOf(k) + k.length);

        if(k[0] == '"' && k[k.length - 1] == '"') {
            k = k.substring(1, k.length - 1);
        }

        if(options.validation) {
            if(typeof(options.validation) == "function") {
                if(!options.validation(k)) {
                    throw new Error("String failed validation test");
                }
            } else if(options.validation.constructor == RegExp) {
                if(!options.validation.exec(k)) {
                    throw new Error("String failed validation test: " + options.validation);
                }
            }
        }

        return {
            val: k,
            string: rest
        };

    },
    mention: function(string, options) {
        //var mentionExtractor = /^( *(\\?<@([0-9]+)>|uid:([0-9]+)))( |$)/;
        var mentionExtractor = /^( *(?:\\?<@([0-9]+)>|uid:([0-9]+)))(?: |$)/;
        var idstr = string.match(mentionExtractor);
        options = options || {};
        if(!idstr) {
            if(global.bot) {
                var str;
                try {
                    str = paramTypes.string(string, options);
                } catch(err) {
                    throw new Error("Invalid mention: Can't extract string - " + err.message);
                }
                var rx = new RegExp(str.val, 'gi');
                var _users = discordie.Users.filter(u => u.username.toLowerCase().indexOf(str.val) !== -1);


                if(_users && _users.length === 0) {
                    throw new Error("Invalid mention: No users found");
                }

                if(_users.length > 1 && !options.multi) {
                    throw new Error("You need to match a single user (query: " + str.val + ")");
                }

                if(_users.length == 1 && !options.multi) {
                    _users = _users[0];
                }

                return {
                    val: _users,
                    string: str.string
                };
            }
            throw new Error("Invalid mention: Can't parse that");
        }

        var k = null;
        for(var i = 0; i < idstr.length; i++) {
            var v = idstr[i];
            if(!v) {
                continue;
            }
            if(v.match(/^[0-9]+$/)) {
                k = v;
                break;
            }
        }
        var rest = string.substring(idstr[0].length);

        return {
            val: k,
            string: rest
        };
    },
    choice: {
        help: function(o) {
            return o.options.list.join("|");
        },
        get: function(string, options) {
            string = string.replace(/^ */, '');
            var p = string.indexOf(" ");
            var word = string.substring(0, p == -1 ? undefined : p);
            var rest = string.substring(p + 1);

            if(options.list.indexOf(word) == -1) {
                throw new Error("Not a valid option");
            }

            return {
                val: word,
                string: rest
            };

        }
    },
    multistr: function(string, options) {
        var strs = [];
        while(true) {
            try {
                var result = paramTypes.string(string, options);
            } catch (e) {
                break;
            }
            string = result.string;
            strs.push(result.val);
        }

        if(strs.length == 0) {
            throw new Error("No strings found");
        }

        return {
            val: strs,
            string: string
        }
    },
    flags: {
        help: function(o) {
            var list = [];
            for(i in o.options.list) {
                if(typeof(o.options.list[i]) == "string") {
                    list.push(o.options.list[i]);
                } else {
                    list.push(o.options.list[i].id + "(" + o.options.list[i].id + ")");
                }
            }
            return list.join("|");
        },
        get: function(string, options) {
            options.opts = options.opts || {};
            if(options.opts.stopEarly === undefined) {
                options.opts.stopEarly = true;
            }
            var argv = minimist(string.split(" "), options.opts);
            if(options.list) {
                for(i in options.list) {
                    var o = options.list[i];
                    if(typeof(o) == "object") {
                        if(!argv[o.id]) {
                            argv[o.id] = o.default;
                        }
                        if(o.type) {
                            argv[o.id] = paramTypes[o.type](argv[o.id], o.options).val;
                        }
                    }
                }
            }
            return {
                val: argv,
                string: argv._.join(" ")
            }
        }
    }
}

function getHelp(parts, activator, help, params) {
    var str = "";
    if(!activator) {
        activator = "";
    }
    var paramStr = (typeof(params) == "string" ? params : params.getHelp());
    str += `\`${activator + parts.join(" ") + " " + paramStr}\``;
    if(help != "") {
        str += "\n\n" + help;
    }

    return str;
}

module.exports = {
    Params: Params,
    paramTypes: paramTypes,
    getHelp: getHelp
};
