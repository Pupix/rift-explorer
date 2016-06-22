const tasklist = require('tasklist')();
const ps = require('ps-node');

const UX_CLIENT_NAME = 'LeagueClientUx.exe';

const getUXProcess = function (list) {
    const promise = new Promise((resolve, reject) => {

        const ux = list.filter(proc => proc.imageName === UX_CLIENT_NAME);

        if (!ux.length) {
            return reject(new Error('Couldn\'t find league process'));
        }

        resolve(ux[0]);
    });

    return promise;
};

const getProcessArguments = function (proc) {
    const promise = new Promise((resolve, reject) => {

        ps.lookup({pid: proc.pid}, (err, list) => {
            if (err) { return reject(error); }

            if (!list.length) {
                return reject(new Error('Couldn\'t find league process'));
            }

            let args = {};
            
            list[0].arguments.forEach((arg) => {
                let [, key, value] = arg.match(/^--([^=]+)=?(.*)$/);
                args[key] = value;
            });

            resolve(args);
        });

    });

    return promise;
}

module.exports = {
    getArguments() {
        return tasklist.then(getUXProcess).then(getProcessArguments);
    }
}