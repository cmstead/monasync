var monasync = require('../monasync.js');
var sinon = require('sinon');
var assert = require('chai').assert;

describe('async behaviors', function () {

    describe('wrap', function () {

        it('should call success function, and not fail function when underlying call succeeds', function () {
            var failureCallback = sinon.spy();

            function behavior(callback) {
                callback(null, true);
            }

            monasync.async.wrap(behavior)(function () {
                assert.equal(failureCallback.callCount, 0);
            }, failureCallback)();
        });

        it('should call failure function, and not success function when underlying call fails', function () {
            var successCallback = sinon.spy();

            function behavior(callback) {
                callback({}, null);
            }

            function failCallback() {
                assert.equal(successCallback.callCount, 0);
            }

            monasync.async.wrap(behavior)(successCallback, failCallback)();
        });

        it('should should not throw an error if failure function is omitted and behavior fails', function () {
            var successCallback = sinon.spy();

            function behavior(callback) {
                callback({}, null);
            }

            // If this throws an error, the test will fail
            monasync.async.wrap(behavior)(successCallback)();
        });

    });

});