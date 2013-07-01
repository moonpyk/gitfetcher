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
        process.env.HOME = "/home/foobar";
        process.env.USERPROFILE = "C:\\Users\\foobar";
        done();
    },
    expandEnv: function (test) {
        var ev = process.env;

        if (process.platform == "win32") {
            test.equal(u.expandEnv("~"), ev.USERPROFILE);
            test.equal(u.expandEnv("${USERPROFILE}"), ev.USERPROFILE);
            test.equal(u.expandEnv("${USERPROFILE}|${USERPROFILE}"), ev.USERPROFILE + "|" + ev.USERPROFILE);

        } else {
            test.equal(u.expandEnv("~"), "/home/foobar");
            test.equal(u.expandEnv("${HOME}"), ev.HOME);
            test.equal(u.expandEnv("${HOME}|${HOME}"), ev.HOME + "|" + ev.HOME);
        }

        test.equals(u.expandEnv("${NON_EXISTANT}"), "");
        test.equals(u.expandEnv("${}"), "");
        test.equals(u.expandEnv("${FOOBAR}/${ZGRUNT}"), "/");
        test.equals(u.expandEnv("${ANOTHER_VAR}\\${ZGRUNT}"), "\\");

        test.done();
    },
    resolveExpandEnv: function (test) {
        if (process.platform == "win32") {
            test.equals(
                u.resolveExpandEnv("~/test/dir"),
                "C:\\Users\\foobar\\test\\dir"
            );
        } else {
            test.equals(
                u.resolveExpandEnv("~/test/dir"),
                "/home/foobar/test/dir"
            );
        }

        test.done();
    }
};
