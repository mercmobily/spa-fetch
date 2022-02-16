# Welcome

spa-fetch is a wrapper to Javascript's native `fetch()` call which will prevent multiple `fetch()` **GET** calls being made
against the same URL in a short amount of time.
It also provides hooks which will allow specific code to be run before and after each fetch call.

## Use cases

You may have a SPA (Single Page Application) made up of fully decoupled components that use the browser
location to load data. If two decoupled components are nested location-wise (e.g. one is `/users/:userId` and the other one
is `/users/:userId/address/:addressId`), they may both attempt to make a request for `/users/10` (assuming that `userId` is 10)
within a short amount of time.

You may have an application that in which the user can trigger an HTTP GET call via UI, and want to make sure that each call
behaves as if the server had responded, without overwhelming the server with requests.

You may have an SPA and want to centralise the UI response for specific fetch errors. For example a 401 could trigger a
dialog to re-login.
