<a name="v0.3.1"></a>
## [v0.3.1](https://github.com/jcoc611/vsconnect/compare/v0.3.0...v0.3.1) (2021-04-18)

### Improvements
 - Added support for connection-oriented protocols
 - Added WebSockets
 - Added command `vsConnectClient.sendCurrentRequest` to send the current request from a different document

<a name="v0.3.0"></a>
## [v0.3.0](https://github.com/jcoc611/vsconnect/compare/v0.2.10...v0.3.0) (2021-03-28)

### Improvements
 - HTTP: Added special value `auto` for `Content-Length`, which causes the body length to be used before sending the request.
 - HTTP: Added timeout setting on a per-request basis.
 - Some dependency upgrades.
 - Out of alpha!

<a name="v0.2.10"></a>
## [v0.2.10](https://github.com/jcoc611/vsconnect/compare/v0.2.9...v0.2.10) (2020-12-02)

### Fixes
 - HTTP requests with no protocol in the URL (defaults to `http://`)
 - Displays appropriate error messages on all HTTP connection errors
 - Updates npm package dependencies

<a name="v0.2.9"></a>
## [v0.2.9](https://github.com/jcoc611/vsconnect/compare/v0.2.8...v0.2.9) (2020-05-31)

### Fixes
 - Context Menu positioning was wrong when scrolling
 - Updated response boolean short values to be more consistent with rest of UI
 - Changing the language type on a text editor now updates `Content-Type` and underlying language
 - Fixed key bindings for history navigation (up/down arrows)
 - Changed "send request" key bindings to CTRL + Enter to prevent issues in text areas, etc.
 - Store contents are preserved across VS Code restarts (e.g. cookies).


<a name="v0.2.8"></a>
## [v0.2.8](https://github.com/jcoc611/vsconnect/compare/v0.2.7...v0.2.8) (2020-05-24)

### Features
 - Added ability to resend previous requests
 - Added ability to rerun all requests (resending them one after the other)
 - Added a 'clear' button

### Fixes
 - Displays DNS Resource Record values as objects rather than strings.
 - Better synchronization of `Content-Type` and body language
 - Accessibility: Fixed context menu keyboard navigation
 - Accessibility: Fixed tab navigation visualization

<a name="v0.2.7"></a>
## [v0.2.7](https://github.com/jcoc611/vsconnect/compare/v0.2.6...v0.2.7) (2020-05-17)

### Features
 - Added ability to compute request values with JavaScript
 - Added a Store for `User-Agent`, so that the previous value is remembered for next requests.

### Fixes
 - Fixed issue of moving from a multipart body to a different kind of body
 - Fixed history navigation (with up/down arrows) not recomputing derived information like cookies


<a name="v0.2.6"></a>
## [v0.2.6](https://github.com/jcoc611/vsconnect/compare/v0.2.5...v0.2.6) (2020-05-10)

### Features
 - Button for deleting rows on table editor

### Fixes
 - some performance issues, still some extra work needed
 - cannot remove OAuth 1.0
 - Auto focus on new request


<a name="v0.2.5"></a>
## [v0.2.5](https://github.com/jcoc611/vsconnect/compare/v0.2.4...v0.2.5) (2020-05-03)

### Features
 - Added multipart bodies
 - Replaced 'request' with native HTTP CLIENT

### Fixes
 - Fixed cookie parsing
 - Improved package size, as well as extension speed (extra optimization still needed)
 - Improved dev docs and experience
 - some other various minor fixes/improvements


<a name="v0.2.4"></a>
## [v0.2.4](https://github.com/jcoc611/vsconnect/compare/v0.2.3...v0.2.4) (2020-04-26)

### Features
 - Added feature to open textareas (e.g. HTTP bodies) on separate text editor
 - Added context menus
 - Added Stores, with support for cookies

### Fixes
 - Fixed DNS client issues and UX
 - Fixed some other usability bugs


<a name="v0.2.3"></a>
## [v0.2.3](https://github.com/jcoc611/vsconnect/compare/v0.2.2...v0.2.3) (2020-04-19)

### Features
 - Added ability to expand and contract requests and responses
 - Added file upload (binary) body for HTTP requests
 - Added body previews for HTTP response bodies
 - Added support for gzip, br, and deflate Content-Encoding
 - Added support for non-utf8 charsets
 - Added a default User-Agent
 - Added HTTP response duration (time to request end)

### Fixes
 - Fixed a few usability bugs and better styling
