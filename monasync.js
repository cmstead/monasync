var monasync = (function () {
    'use strict';

    function noop() { }

    function isTypeOf(typeStr) {
        return function (value) {
            return typeof value === typeStr;
        };
    }

    var isFunction = isTypeOf('function');
    var isNumber = isTypeOf('number');
    var isObject = isTypeOf('object');

    function isInt(value) {
        return isNumber(value) && value === Math.floor(value);
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

        return obj;
    }

    function asyncWrap(original) {
        function Async(success, fail) {
            var cleanFail = either(isFunction, defaultFail, fail);
            var callback = buildCallback(success, cleanFail);

            return function () {
                var args = sliceArgs(arguments).concat([callback]);
                return original.apply(null, args);
            }
        }

        return attachPartial(Async);
    }

    function defaultFail() {
        throw new Error('Unhandled error condition occurred!' + JSON.stringify(sliceArgs(arguments), null, 4));
    }

    function bindActions(failure) {
        return function (success, action) {
            return action(success, failure);
        }
    }

    function appliedPartial (action, args){
        return function () {
            var remainingArgs = sliceArgs(arguments);
            return action.apply(null, args.concat(remainingArgs));
        }
    }

    function attachPartial(binding) {

        function bindPartial() {
            var args = sliceArgs(arguments);

            function newBinding (success, failure) {
                var action = binding(success, failure);
                return appliedPartial(action, args);
            };

            return attachPartial(newBinding);
        }

        return attachImmutableProperty(binding, 'partial', bindPartial);
    }

    function bindingSerial() {
        var actions = sliceArgs(arguments).reverse();

        function bindResolutions(success, failure) {
            var boundArgs = either(isObject, [], bindResolutions.args);

            var action = actions.reduce(
                bindActions(failure),
                success
            );

            return Function.prototype.bind.apply(action, boundArgs);
        }

        return attachPartial(bindResolutions);
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

        return function bindResolutions(success, failure) {
            return function () {
                var successCount = bindActions.successCount;
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