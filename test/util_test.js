'use strict';

var u = require('../lib/util');

/*
 ======== A Handy Little Nodeunit Reference ========
 https://github.com/caolan/nodeunit

 Test methods:
 test.expect(numAssertions)
 test.done()
 Test assertions:
 test.ok(value, [message])
 test.equal(actual, expected, [message])
 test.notEqual(actual, expected, [message])
 test.deepEqual(actual, expected, [message])
 test.notDeepEqual(actual, expected, [message])
 test.strictEqual(actual, expected, [message])
 test.notStrictEqual(actual, expected, [message])
 test.throws(block, [error], [message])
 test.doesNotThrow(block, [error], [message])
 test.ifError(value)
 */

exports.util = {
    setUp: function (done) {
        // setup here
        done();
    },
    expandEnv: function (test) {
        process.env.HOME = "/home/foobar";
        process.env.USERPROFILE = "C:\\Users\\foobar";

        if (process.platform == "win32") {
            test.equal(u.expandEnv("~"), process.env.USERPROFILE);
            test.equal(u.expandEnv("${USERPROFILE}"), process.env.USERPROFILE);
        } else {
            test.equal(u.expandEnv("~"), "/home/foobar");
            test.equal(u.expandEnv("${HOME}"), process.env.HOME);
        }

        test.equals(u.expandEnv("${NON_EXISTANT}"), "");
        test.equals(u.expandEnv("${}"), "");
        test.equals(u.expandEnv("${FOOBAR}/${ZGRUNT}"), "/");
        test.equals(u.expandEnv("${ANOTHER_VAR}\\${ZGRUNT}"), "\\");

        test.done();
    }
};
