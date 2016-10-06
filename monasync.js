var monasync = (function () {
    'use strict';

    function isInt(value) {
        return typeof value === 'number' && value === Math.floor(value);
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function isErrorSet(value) {
        return value.length > 0;
    }

    function either(isType, fallback, value) {
        return isType(value) ? value : fallback;
    }

    function sliceArgs(args, startIndex) {
        return Array.prototype.slice.call(args, either(isInt, 0, startIndex));
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

    function attachImmutableProperty(obj, key, value) {
        Object.defineProperty(obj, key, {
            value: value,
            writeable: false
        });
    }

    function buildAsyncPartial(original) {
        return function () {
            var args = sliceArgs(arguments);

            function enclosedOriginal() {
                var callArgs = args.concat(sliceArgs(arguments));
                original.apply(null, callArgs);
            }

            return asyncWrap(enclosedOriginal);
        };
    }

    function asyncWrap(original) {
        function Async(success, fail) {
            var callback = buildCallback(success, either(isFunction, defaultFail, fail));

            return function () {
                var args = sliceArgs(arguments).concat([callback]);

                Async.original.apply(null, args);
            }
        }

        attachImmutableProperty(Async, 'original', original);
        attachImmutableProperty(Async, 'partial', buildAsyncPartial(original));

        return Async;
    }

    function defaultFail() {
        throw new Error('Unhandled error condition occurred!' + JSON.stringify(sliceArgs(arguments), null, 4));
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
                success
            );
        }
    }

    function buildParallelCallback(results, resolver) {
        return function (result) {
            results.push(result);
            resolver();
        };
    }

    function parallelIsDone(results, errors, actions) {
        return results.length + errors.length === actions.length;
    }

    function buildParallelResolver(results, errors, actions) {
        return function (success, failure) {
            var callback = buildCallback(success, failure);

            return function () {
                if (parallelIsDone(results, errors, actions)) {
                    callback(either(isErrorSet, null, errors), results);
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

    function wrapAndBind(bindingFn) {
        return function () {
            var wrappedActions = sliceArgs(arguments).map(asyncWrap);
            return bindingFn.apply(null, wrappedActions);
        };
    }

    return {
        async: {
            wrap: asyncWrap,
            serialize: wrapAndBind(bindingSerial),
            parallelize: wrapAndBind(bindingParallel)
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