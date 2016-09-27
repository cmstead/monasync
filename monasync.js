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

    function attachImmutableProperty (obj, key, value){
        Object.defineProperty(obj, key, {
            value: value,
            writeable: false
        });
    }

    function buildAsyncPartial (original){
        return function () {
            var args = sliceArgs(arguments);

            function enclosedOriginal () {
                var callArgs = args.concat(sliceArgs(arguments));
                original.apply(null, callArgs);
            }

            return asyncWrap(enclosedOriginal);
        };
    }

    function asyncWrap(original) {
        function Async(success, fail) {
            var cleanFail = !isFunction(fail) ? defaultFail : fail;
            var callback = buildCallback(success, cleanFail);

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

    function wrapAll (asyncFns){
        return asyncFns.map(function (fn) {
            return asyncWrap(fn);
        });
    }

    function sliceAndWrapAll (args){
        return wrapAll(sliceArgs(args));
    }

    function wrapAndBind (bindingFn){
        return function () {
            return bindingFn.apply(null, sliceAndWrapAll(arguments));
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