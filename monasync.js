var monasync = (function () {
    'use strict';

    function isInt(value) {
        return typeof value === 'number' && value === Math.floor(value);
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function sliceArgs(args, startIndex) {
        startIndex = !isInt(startIndex) ? 0 : startIndex;
        return Array.prototype.slice.call(args, startIndex);
    }

    function syncToAsync(sync) {
        return function () {
            var args = sliceArgs(arguments);
            var callback = args.pop();

            callback(null, sync.apply(null, args));
        };
    }

    function syncWrap(sync) {
        return asyncWrap(syncToAsync(sync));
    }

    function buildCallback(success, fail) {
        return function callback(err) {
            if (err) {
                fail(err)
            } else {
                success.apply(null, sliceArgs(arguments, 1));
            }
        }
    }

    function asyncWrap(asyncFn) {
        return function (success, fail) {
            fail = !isFunction(fail) ? noop : fail;

            return function () {
                var callback = buildCallback(success, fail);
                var args = sliceArgs(arguments).concat([callback]);

                asyncFn.apply(null, args);
            }
        }
    }

    function noop() { }

    function identity(success) {
        return function () {
            success.apply(null, sliceArgs(arguments));
        }
    }

    function bindActions(failure) {
        return function (success, action) {
            return action(success, failure);
        }
    }

    function bindingSerial() {
        var actions = sliceArgs(arguments).reverse();

        return function (success, failure) {
            return actions.reduce(
                bindActions(failure),
                identity(success, failure)
            );
        }
    }

    function buildParallelCallback(results, resolver) {
        return function (result) {
            results.push(result);
            resolver();
        };
    }

    function buildIsDone(results, errors, actions) {
        return function () {
            return results.length + errors.length === actions.length;
        }
    }

    function getParallelError(errors) {
        return errors.length > 0 ? errors : null;
    }

    function buildParallelResolver(results, errors, actions) {
        return function (success, failure) {
            var isDone = buildIsDone(results, errors, actions);
            var callback = buildCallback(success, failure);

            return function () {
                if (isDone()) {
                    callback(getParallelError(errors), results);
                }
            };
        };
    }

    function bindingParallel() {
        var actions = sliceArgs(arguments);
        var results = [];
        var errors = [];
        var resolverFactory = buildParallelResolver(results, errors, actions);


        return function (success, failure) {
            return function () {
                var resolver = resolverFactory(success, failure);
                var successCallback = buildParallelCallback(results, resolver);
                var failureCallback = buildParallelCallback(errors, resolver);

                actions.forEach(function (action) {
                    action(successCallback, failureCallback)();
                });
            };
        };
    }

    return {
        async: {
            wrap: asyncWrap
        },
        sync: {
            toAsync: syncToAsync,
            wrap: syncWrap
        },
        binding: {
            serial: bindingSerial,
            parallel: bindingParallel
        }
    };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = monasync;
}