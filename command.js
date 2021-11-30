"use strict";
/*
const { exec } = require("child_process");
module.exports =function command(text) {
    console.log("command text=",text)
    const result = "res="+
    exec(text, (error, stdout, stderr) => {
        let res
        if (error) {
            res = `error: ${error.message}`
            console.log(res);
            //return res;
        }else
        if (stderr) {
            res = `stderr: ${stderr}`
            console.log(res);
            //return res;
        }else {
            res = `stdout: ${stdout}`
            console.log(res);
        }
        return res
    });
    console.log(result);
    return result
}
*/
/*
https://stackabuse.com/executing-shell-commands-with-node-js/
*/

const { exec } = require('child_process');
module.exports =function command(text,callback) {
    exec(text, (error, stdout, stderr) => {
        let res
        if (error) {
            res = `exec error: ${error}`
            console.error(res);
        }else{
            res = `stdout: ${stdout} stderr: ${stderr}`
            //console.log(`stdout: ${stdout}`);
            //console.error(`stderr: ${stderr}`);
            console.log(res)
        }
        //res.replace('\\n','<br/>')        
        return callback(res);
    });
}