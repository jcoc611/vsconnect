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
