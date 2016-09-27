var monasync = require('../monasync.js');
var sinon = require('sinon');
var assert = require('chai').assert;

describe('async behaviors', function () {

    function add (a, b){
        return a + b;
    }

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

        it('should throw an error if failure function is omitted and behavior fails', function () {
            var successCallback = sinon.spy();

            function behavior(callback) {
                callback({}, null);
            }

            // If this throws an error, the test will fail
            assert.throws(monasync.async.wrap(behavior)(successCallback));
        });

    });

    describe('serialize', function () {
        
        it('should serialize async functions', function () {
            var asyncIncrement = monasync.sync.toAsync(add.bind(null, 1));

            var serialAdder = monasync.async.serialize(
                asyncIncrement,
                asyncIncrement,
                asyncIncrement,
                asyncIncrement
            );

            serialAdder(function(value) {
                assert.equal(value, 5);
            })(1);
        });

    });

    describe('parallelize', function () {
        
        it('should parallelize async functions', function () {
            var asyncIncrement = monasync.sync.toAsync(add.bind(null, 1, 1));

            var parallelIncrementer = monasync.async.parallelize(
                asyncIncrement,
                asyncIncrement,
                asyncIncrement,
                asyncIncrement
            );

            parallelIncrementer(function(value) {
                assert.equal(JSON.stringify(value), '[2,2,2,2]');
            })();
        });

    });

    describe('Async', function () {

        var asyncAdd;

        beforeEach(function () {
            asyncAdd = monasync.sync.wrap(add);
        });

        it('should allow bound arguments', function () {
            var asyncInc = asyncAdd.partial(1);

            asyncInc(function (value) {
                assert.equal(value, 6);
            })(5);
        });

    });

});