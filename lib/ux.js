const ps = require('ps-node');

const UX_CLIENT_NAME = process.platform !== 'darwin' ? 'LeagueClientUx.exe' : 'LeagueClientUx';

const getProcessArguments = function (proc) {
    return new Promise((resolve, reject) => {

        ps.lookup({ psargs: "x", arguments: "--remoting-auth-token" }, (err, list) => {
            if (err) { return reject(error); }

            if (!list.length) {
                return reject(new Error('Couldn\'t find league process'));
            }

            let args = {};
            
            list[0].arguments.forEach((arg) => {
                const argument = arg.match(/^--([^=]+)=?(.*)$/);
                if (!argument) { return; }
                
                let [, key, value] = argument;
                args[key] = value;
            });

            resolve(args);
        });

    });
}

module.exports = {
    getArguments() {
        return getProcessArguments();
    }
}
