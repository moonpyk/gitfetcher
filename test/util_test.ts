'use strict';

import u = require('../lib/util');

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

// setup here
export function setUp(done) {
    process.env.HOME = "/home/foobar";
    process.env.USERPROFILE = "C:\\Users\\foobar";
    done();
}

export function inferString(test) {
    test.equals(u.inferString("8"), 8);
    test.equals(u.inferString("8.8"), 8.8);
    test.equals(u.inferString("865464.887"), 865464.887);

    test.equals(u.inferString("value"), "value");

    test.equals(u.inferString("true"), true);
    test.equals(u.inferString("yes"), true);

    test.equals(u.inferString("false"), false);
    test.equals(u.inferString("no"), false);

    test.equals(u.inferString("null"), null);
    test.equals(u.inferString("undefined"), undefined);

    test.deepEqual(u.inferString({}), {});
    test.deepEqual(u.inferString([]), []);

    test.done();
}

export function dotNotationToObject(test) {
    test.equals(u.dotNotationToObject('', 8), 8);
    test.equals(u.dotNotationToObject('....', 8), 8);
    test.deepEqual(u.dotNotationToObject('plop....', 8), {plop: 8});
    test.deepEqual(u.dotNotationToObject('plop.test.0.plop', 8), {plop: {test: {0: {plop: 8}}}});
    test.deepEqual(u.dotNotationToObject('plop.test.plop', undefined), {plop: {test: {plop: undefined}}});

    test.done();
}

export function resolveExpandEnv(test) {
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

export function expandEnv(test) {
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
}
