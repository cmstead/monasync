# Monasync

Async/Sync Composition library for sync and async behaviors through an async monad to simplify 
program structure and comprehension.

## Serial and parallel composition bindings

### monasync.binding.serial

Serial composition is done with monasync.binding.serial which has the signature, 
`function+ => function, [function] => [*+] => undefined`. It's simple to compose functions together this way:

~~~
    var serialComposition = monasync.binding.serial(
        asyncFn1,
        asyncFn2,
        asyncFn3
    );

    serialComposition(success, fail)(arg1, arg2, arg3);

    // Composed functions are also composable:

    var composedComposition = monasync.binding.serial(
        serialComposition,
        asyncFn4,
        asyncFn5
    );
~~~

### monasync.binding.parallel

Parallel executing behaviors is done with monasync.binding.parallel which has the signature, 
`function+ => function, [function] => [*+] => undefined`. It's simple to compose functions together this way:

~~~
    var parallelComposition = monasync.binding.parallel(
        asyncTypedFn1,
        asyncTypedFn2,
        asyncTypedFn3
    );

    parallelComposition(success, fail)(arg1, arg2, arg3);

    // Binding multiple parallel behaviors together is simple:

    var composedComposition = monasync.binding.parallel(
        serialComposition,
        asyncTypedFn4,
        asyncTypedFn5
    );
~~~

## Async typed function

The async typed function is simply a function which has the following signature, 
`function, [function] => [*+] => undefined` where the first function is a success function,
the second, optional, function is a failure function.

This means, the async typed function accepts a function and an optional second function, returns 
a function which takes any number of optional arguments and returns undefined.  A standard call
example is like the following:

~~~
    myAsyncBehavior(success, failure)(arg1, arg2);
~~~

## Asynchronous functions

It's common in Node and client-side Javascript to write functions which take callbacks as a final
argument. Monasync has a function to do a function type-cast to convert your standard callback
accepting function into an composable async typed function. Monatype does this by decorating your
function, but you can easily write async typed functions yourself if you like.

### monasync.async.wrap

Wrap is the method for wrapping asynchronous, callback-accepting functions in an async function
type where the signature is as follows: `function => function, [function] => [*+] => undefined`.
An example is as follows:

~~~
    function myAsynchronousFn (callback) {};

    var myNewFn = monasync.async.wrap(myAsynchronousFn);
    myNewFn(success, failure)(arg1, arg2);
~~~

### monasync.async.serialize

Serialize returns an async-typed function which serializes a set of callback-accepting asynchronous 
functions. The signature for serialize is `function+ => function, [function] => [*+] => undefined`. This is 
the analog to binding.serial.

~~~
    function myAsyncFunction (callback) { /* does stuff and calls back */ };

    var myNewFunction = monasync.async.serialize(
        myAsyncFunction,
        myAsyncFunction,
        myAsyncFunction,
        myAsyncFunction
    );

    myNewFunction(success, failure)(arg1, arg2);
~~~

### monasync.async.parallelize

Serialize returns an async-typed function which parallelizes a set of callback-accepting asynchronous 
functions. The signature for parallelize is `function+ => function, [function] => [*+] => undefined`. This is 
the analog to binding.parallel.

~~~
    function myAsyncFunction (callback) { /* does stuff and calls back */ };

    var myNewFunction = monasync.async.parallelize(
        myAsyncFunction,
        myAsyncFunction,
        myAsyncFunction,
        myAsyncFunction
    );

    myNewFunction(success, failure)(arg1, arg2);
~~~

### Partial application on Async typed functions

It's possible to partially apply arguments to async typed functions with the partial
method. Partial will apply arguments and return a new async typed function.

~~~
    var asyncAdd = monasync.sync.wrap(function (a, b) { return a + b; });
    var asyncAdd3 = asyncAdd.partial(3);

    asyncAdd3(function (value){
        console.log(value); // 11
    })(8);
~~~

## Synchronous functions

Functions which are simple, data-in, data-out type behaviors can be wrapped to conform to the
async function type. They can also be converted to a simple asynchronous function which accepts
a callback.  These behaviors are detailed below.

### monasync.sync.toAsync

This wraps a synchronous function in a simple callback-accepting wrapper.  This allows sync
and async behaviors to play together more directly.  The signature for this function looks
like this: `function => [*+], function => undefined`.  The toAsync function is used as follows:

~~~
    function myFunction (a, b) { /* do stuff and return */ }

    var myAsyncFunction = monasync.sync.toAsync(myFunction);
    myAsyncFunction(arg1, arg2, callback);
~~~

### monasync.sync.wrap

This wraps a synchronous function in an async typed function.  This allows sync
and async behaviors to play together more directly.  The signature for this function looks
like this: `function => function, [function] => [*+] => undefined`.  The toAsync function 
is used as follows:

~~~
    function myFunction (a, b) { /* do stuff and return */ }

    var myAsyncFunction = monasync.sync.toAsync(myFunction);
    myAsyncFunction(arg1, arg2, callback);
~~~

## Putting it all together

Here's an example of using multiple monasync functions together to create a complex composite behavior:

~~~
    var parallelComposition = monasync.binding.parallel(
        asyncTypedFn,
        monasync.async.wrap(asyncFn),
    );

    var serialComposition = monasync.binding.serial(
        parallelComposition,
        asyncTypedFn1,
        monasync.sync.wrap(intermediateTransformation),
        asyncTypedFn2
    );

    serialComposition(success, fail)(arg1, arg2);
~~~