var monasync = require('../monasync.js');
var sinon = require('sinon');
var assert = require('chai').assert;

describe('binding', function () {

    function add(a, b) {
        return a + b;
    }

    function delayedAdd(a, b, callback) {
        setTimeout(function () {
            callback(null, a + b);
        }, 10);
    }

    function alwaysFail(state) {
        var callback = Array.prototype.slice.call(arguments).pop();
        callback(new Error(), null);
    }

    describe('serial', function () {

        var asyncAdd;
        var asyncInc;

        beforeEach(function () {
            asyncAdd = monasync.async.wrap(delayedAdd);
            asyncInc = monasync.async.wrap(delayedAdd.bind(null, 1));
        });

        it('should serialize calls to one bound function', function (done) {
            function success(result) {
                assert.equal(result, 11);
                done()
            }

            monasync.binding.serial(
                asyncAdd
            )(success)(4, 7);
        });

        it('should serialize calls to two bound functions', function (done) {
            function success(result) {
                assert.equal(result, 9);
                done();
            }

            monasync.binding.serial(
                asyncAdd,
                asyncInc
            )(success)(3, 5);
        });

        it('should serialize calls to many bound functions', function (done) {
            function success (result){
                assert.equal(result, 14);
                done();
            }

            var sumAndAdd2 = monasync.binding.serial(
                asyncAdd,
                asyncInc,
                asyncInc,
                asyncInc,
                asyncInc
            )(success)(8, 2);
        });

        it('should should return a composable function binding', function (done) {
            function success (result){
                assert.equal(result, 38);
                done();
            }

            var asyncAdd2 = monasync.binding.serial(
                asyncInc,
                asyncInc
            );

            var asyncAdd4 = monasync.binding.serial(
                asyncAdd2,
                asyncAdd2
            );

            monasync.binding.serial(
                asyncAdd,
                asyncAdd4
            )(success)(11, 23);
        });

        it('should short circuit when an error occurs', function () {
            var asyncSpy = sinon.spy();
            var wrappedSpy = monasync.async.wrap(asyncSpy);
            var asyncFailer = monasync.async.wrap(alwaysFail);
            var successSpy = sinon.spy();
            var failSpy = sinon.spy();

            monasync.binding.serial(
                asyncFailer,
                wrappedSpy
            )(successSpy, failSpy)();

            assert.equal(successSpy.callCount, 0);
            assert.equal(failSpy.callCount, 1);
            assert.equal(asyncSpy.callCount, 0);
        });

    });

    describe('parallel', function () {

        it('should call functions and return results as an array', function (done) {
            var failureSpy = sinon.spy();
            var expected = JSON.stringify([7, 11, 15]);

            function success(results) {
                var result = JSON.stringify(results);

                assert.equal(result, expected);
                assert.equal(failureSpy.callCount, 0);

                done();
            }

            monasync.binding.parallel(
                monasync.async.wrap(delayedAdd.bind(null, 3, 4)),
                monasync.async.wrap(delayedAdd.bind(null, 5, 6)),
                monasync.async.wrap(delayedAdd.bind(null, 7, 8))
            )(success, failureSpy)();

        });

        it('should call functions and return errors as an array', function (done) {
            var expected = JSON.stringify([new Error(), new Error()]);
            var successSpy = sinon.spy();

            function failure(errors) {
                var result = JSON.stringify(errors);

                assert.equal(result, expected);
                assert.equal(successSpy.callCount, 0);

                done();
            }

            monasync.binding.parallel(
                monasync.async.wrap(alwaysFail),
                monasync.async.wrap(alwaysFail),
                monasync.async.wrap(delayedAdd.bind(null, 7, 8))
            )(successSpy, failure)();

        });

    });

});