var monasync = require('../monasync.js');
var sinon = require('sinon');
var assert = require('chai').assert;

describe('sync behaviors', function () {

    function add(a, b) {
        return a + b;
    }

    describe('toAsync', function () {

        it('should convert a synchronous function into a callback-style function', function () {
            var callbackSpy = sinon.spy();

            monasync.sync.toAsync(add)(1, 2, callbackSpy);

            assert.equal(callbackSpy.args[0][0], null);
            assert.equal(callbackSpy.args[0][1], 3);
        });

    });

    describe('wrap', function () {

        it('should wrap sync function and return an async typed function', function () {
            function success (value) {
                assert.equal(value, 9);
            }

            monasync.sync.wrap(add)(success)(4, 5);
        });

    });

});