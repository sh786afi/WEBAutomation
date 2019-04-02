var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871667192,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871672364,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871672383,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.126/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871677924,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.126/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871677924,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.126/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871687060,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.126/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871687060,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871698466,
                "type": ""
            }
        ],
        "screenShotFile": "00f40063-0071-0035-00ea-00ae004f00a3.png",
        "timestamp": 1553871664637,
        "duration": 33815
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871699349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871702642,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871702642,
                "type": ""
            }
        ],
        "screenShotFile": "00fb00b6-0099-006b-0039-006e00c100d1.png",
        "timestamp": 1553871699155,
        "duration": 7800
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871707500,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871710774,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871710774,
                "type": ""
            }
        ],
        "screenShotFile": "00cd0084-00a8-0089-0010-0063008a00b0.png",
        "timestamp": 1553871707299,
        "duration": 5974
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871713927,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871717052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871717052,
                "type": ""
            }
        ],
        "screenShotFile": "005e0076-00a5-0090-0056-00d2004b0080.png",
        "timestamp": 1553871713695,
        "duration": 5626
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871719923,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871723351,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871723351,
                "type": ""
            }
        ],
        "screenShotFile": "00eb0069-00e4-0010-0059-009d00c800f5.png",
        "timestamp": 1553871719734,
        "duration": 5881
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871726235,
                "type": ""
            }
        ],
        "screenShotFile": "0099006b-0000-0024-007c-00aa00520075.png",
        "timestamp": 1553871726030,
        "duration": 5834
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871732578,
                "type": ""
            }
        ],
        "screenShotFile": "0045009f-00fc-00db-00aa-00c7004a0043.png",
        "timestamp": 1553871732334,
        "duration": 5716
    },
    {
        "description": "Case 1:- Create Story & Publish With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f0d2e94e266abb38c5c1bf04b0cc2030",
        "instanceId": 786,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871666190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871680725,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871680725,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553871680726,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538716879955 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871688371,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538716879955 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871688373,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538716879955 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1553871705278,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538716879955 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1553871705316,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538716879955 - OTS parsing error: overlapping tables",
                "timestamp": 1553871705316,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-842806 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871727050,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-842806 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871727051,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553871728134,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-842806 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-842806' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/8b2c3250-5233-11e9-804f-1d63823c55a7.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553871729200,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871741695,
                "type": ""
            }
        ],
        "screenShotFile": "00b10031-0097-007c-007a-001100a8006d.png",
        "timestamp": 1553871664632,
        "duration": 77052
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f77a238c94cbd348fce154b4034e0a06",
        "instanceId": 785,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[id=\"newCloseIcon\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"newCloseIcon\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.offerClose (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:79:31)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:117:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:109:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871738671,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/js/loginCommon.js?v=4092 511:76 Uncaught TypeError: Cannot read property 'data' of undefined",
                "timestamp": 1553871761694,
                "type": ""
            }
        ],
        "screenShotFile": "001a0040-003a-001a-003e-002d00ce0021.png",
        "timestamp": 1553871738461,
        "duration": 24230
    },
    {
        "description": "Case 2:- Create Story & Save With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f0d2e94e266abb38c5c1bf04b0cc2030",
        "instanceId": 786,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871743256,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871756933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871756933,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553871756934,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538717622185 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871762594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538717622185 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871762595,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538717622185 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1553871784357,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538717622185 - OTS parsing error: overlapping tables",
                "timestamp": 1553871784357,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538717622185 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1553871784400,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-572735?showdraft=1 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871803240,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-572735?showdraft=1 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871803241,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553871803242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553871803242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553871803242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871815755,
                "type": ""
            }
        ],
        "screenShotFile": "00b500f2-007e-003a-007a-003e00740026.png",
        "timestamp": 1553871742484,
        "duration": 73262
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871965611,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871970670,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553871970670,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.127/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871975976,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.127/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871975976,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.127/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871976955,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.127/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871976958,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871996236,
                "type": ""
            }
        ],
        "screenShotFile": "003500ee-00e3-0069-0077-00a7006300b6.png",
        "timestamp": 1553871963730,
        "duration": 32501
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871997178,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872000437,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872000437,
                "type": ""
            }
        ],
        "screenShotFile": "00bc00d7-0014-00e5-001b-00fb00590069.png",
        "timestamp": 1553871996991,
        "duration": 7722
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872005244,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872008675,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872008676,
                "type": ""
            }
        ],
        "screenShotFile": "0068005f-0051-000b-003d-005a0098007a.png",
        "timestamp": 1553872005039,
        "duration": 5932
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872011624,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872014869,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872014869,
                "type": ""
            }
        ],
        "screenShotFile": "008b00ce-00fd-0018-00d7-005800a2006e.png",
        "timestamp": 1553872011390,
        "duration": 5719
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872017879,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872021322,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553872021322,
                "type": ""
            }
        ],
        "screenShotFile": "00ef007c-0013-0048-0072-00a7005f008d.png",
        "timestamp": 1553872017531,
        "duration": 6138
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872024313,
                "type": ""
            }
        ],
        "screenShotFile": "00c5002a-0009-00a2-0064-000200240071.png",
        "timestamp": 1553872024080,
        "duration": 5753
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872030620,
                "type": ""
            }
        ],
        "screenShotFile": "008500e2-0066-0088-00c4-0047008900cc.png",
        "timestamp": 1553872030317,
        "duration": 5681
    },
    {
        "description": "Case 1:- Create Story & Publish With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "84ceeacc16c3eada8a9bca87019845d8",
        "instanceId": 889,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553871968770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871982435,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871982435,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553871982435,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538719886485 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871988969,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538719886485 3554 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553871988970,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538719886485 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1553872005970,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538719886485 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1553872006035,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15538719886485 - OTS parsing error: overlapping tables",
                "timestamp": 1553872006036,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-627268 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553872027770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-627268 3578 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553872027771,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553872028983,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-627268 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-627268' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/3e61e1d0-5234-11e9-804f-1d63823c55a7.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553872030026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872042340,
                "type": ""
            }
        ],
        "screenShotFile": "009b00b0-0053-003a-0049-00c9004f0059.png",
        "timestamp": 1553871963731,
        "duration": 78603
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8bb5ff75bf1fc2c0644438c026481e9b",
        "instanceId": 888,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, [ng-show=\"loggedInUser\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, [ng-show=\"loggedInUser\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.Logout (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:108:37)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:119:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:109:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specSignup.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4092 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553872036648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/js/loginCommon.js?v=4092 511:76 Uncaught TypeError: Cannot read property 'data' of undefined",
                "timestamp": 1553872067074,
                "type": ""
            }
        ],
        "screenShotFile": "00d600bb-0038-0083-00ab-002f001300a6.png",
        "timestamp": 1553872036410,
        "duration": 30695
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e975875c2532b1b3af7e1df0d25d44e5",
        "instanceId": 1509,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:51:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4093 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553933936288,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933950017,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933950017,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553933950018,
                "type": ""
            }
        ],
        "screenShotFile": "008c00a8-00b3-0069-0087-009f004b00ba.png",
        "timestamp": 1553933934634,
        "duration": 23435
    },
    {
        "description": "Negative Case1 :- Enter In-valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e975875c2532b1b3af7e1df0d25d44e5",
        "instanceId": 1509,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:55:11)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933958698,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933958698,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553933958700,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933959360,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933959360,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553933963995,
                "type": ""
            }
        ],
        "screenShotFile": "001a00ce-0080-003a-0065-001a00fa00ac.png",
        "timestamp": 1553933958483,
        "duration": 10878
    },
    {
        "description": "Negative Case2 :- After Removing Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e975875c2532b1b3af7e1df0d25d44e5",
        "instanceId": 1509,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:55:11)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933970762,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553933970764,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553933975931,
                "type": ""
            }
        ],
        "screenShotFile": "004400ca-0048-00f1-0092-002200aa006b.png",
        "timestamp": 1553933969736,
        "duration": 11894
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b24e756ad58b3e56aff55a5699d29275",
        "instanceId": 1565,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:51:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4093 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553934180609,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553934194121,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553934194121,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553934194122,
                "type": ""
            }
        ],
        "screenShotFile": "00c900d2-009f-00f5-00d9-005e00810079.png",
        "timestamp": 1553934178974,
        "duration": 23244
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "571ab5f73660eae52f7f7551c4c62651",
        "instanceId": 1600,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:51:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4093 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553934455842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553934460487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553934460487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553934460487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553934460487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553934469415,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3549 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553934469415,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1553934469416,
                "type": ""
            }
        ],
        "screenShotFile": "002e0073-006e-00c3-00d2-007c00e500b9.png",
        "timestamp": 1553934452871,
        "duration": 26016
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f530484dce8ed701492afa2ef32d6cb8",
        "instanceId": 1749,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:51:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554002019703,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002033577,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002033577,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554002033578,
                "type": ""
            }
        ],
        "screenShotFile": "00a60011-00ca-00d9-00d8-000f006400ca.png",
        "timestamp": 1554002017611,
        "duration": 24055
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "d55e1d39aa4ca55fd3e6086437b87124",
        "instanceId": 1789,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:51:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554002101706,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002115650,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002115650,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554002115651,
                "type": ""
            }
        ],
        "screenShotFile": "00f8007f-0045-00bf-003d-00970023000f.png",
        "timestamp": 1554002100763,
        "duration": 22932
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "52fb70ee6158cddb38b677b44d5c2f16",
        "instanceId": 1835,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:33)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554002339713,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002353507,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002353507,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554002353509,
                "type": ""
            }
        ],
        "screenShotFile": "00b50063-00fa-000b-001e-0097001b0017.png",
        "timestamp": 1554002338822,
        "duration": 22697
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "062fb977771995a9d8d9221f64746d5e",
        "instanceId": 1889,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554002440737,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002454532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554002454532,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554002454533,
                "type": ""
            }
        ],
        "screenShotFile": "00c400bd-007d-0004-004a-007e0023003a.png",
        "timestamp": 1554002439546,
        "duration": 25011
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "70ed658f73d5a13254cfce8ebef85001",
        "instanceId": 656,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554003770817,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554003784848,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554003784848,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554003784849,
                "type": ""
            }
        ],
        "screenShotFile": "00de002b-00c4-0014-004e-00a700dd0069.png",
        "timestamp": 1554003769865,
        "duration": 24901
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "91a68101d592611f5a0d30180f6778ed",
        "instanceId": 701,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554003857962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554003871722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554003871722,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554003871725,
                "type": ""
            }
        ],
        "screenShotFile": "0091008d-001f-0055-002c-0009007400b5.png",
        "timestamp": 1554003857085,
        "duration": 26692
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "0dff306f7a9c742bf2ef8df831554c39",
        "instanceId": 733,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554004057612,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004071450,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004071450,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004071451,
                "type": ""
            }
        ],
        "screenShotFile": "0053000b-00a5-009e-000d-001d00f800e6.png",
        "timestamp": 1554004055051,
        "duration": 28416
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4feb7dfe3e788cdf830491b427e45df3",
        "instanceId": 776,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554004381667,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004395635,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004395635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004395637,
                "type": ""
            }
        ],
        "screenShotFile": "00e20050-0098-007c-0038-0013003b0014.png",
        "timestamp": 1554004380733,
        "duration": 26931
    },
    {
        "description": "encountered a declaration exception|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6c1bb720d2257806fbf744ac4e1f76ce",
        "instanceId": 894,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Error: Woovly Login is not a function"
        ],
        "trace": [
            "Error: Woovly Login is not a function\n    at validateFunction (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:21:11)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:153:16\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e40093-00a5-0068-00c6-001000b80058.png",
        "timestamp": 1554004763605,
        "duration": 4
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c1103e4224a6b488e4ab897b6011c2ed",
        "instanceId": 929,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/Users/shafi/Desktop/WoovlyAutomation/pom/inviteFriend.js:55:15)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554004807643,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004821128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004821128,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004821129,
                "type": ""
            }
        ],
        "screenShotFile": "0096004a-0001-0075-00d8-004100d6002c.png",
        "timestamp": 1554004804727,
        "duration": 28423
    },
    {
        "description": "Negative Case1 :- Enter In-valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c1103e4224a6b488e4ab897b6011c2ed",
        "instanceId": 929,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:55:11)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004833758,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004833758,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004833760,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004834183,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004834185,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004838840,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554004840973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554004840973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554004840973,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.k075T-KPfhg.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCPwAoUJo6Gd1t5JO7oWH71meRocYw/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554004840974,
                "type": ""
            }
        ],
        "screenShotFile": "0069002a-00f7-00fc-00d9-009c005000ae.png",
        "timestamp": 1554004833548,
        "duration": 10576
    },
    {
        "description": "Negative Case2 :- After Removing Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c1103e4224a6b488e4ab897b6011c2ed",
        "instanceId": 929,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/Users/shafi/Desktop/WoovlyAutomation/pom/login.js:55:11)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004845530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554004845531,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554004850248,
                "type": ""
            }
        ],
        "screenShotFile": "00c50018-00fd-002e-0075-001d00d800ac.png",
        "timestamp": 1554004844521,
        "duration": 11375
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "cfbaed3f9c8ce2fd9b6ddd4decd8742f",
        "instanceId": 753,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554012136097,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012150040,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012150040,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554012150041,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012160715,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012160715,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554012160746,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554012162563,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554012163596,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167773,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167774,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167774,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167775,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167779,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167779,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167779,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167779,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167786,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167786,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167787,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167787,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554012167787,
                "type": ""
            }
        ],
        "screenShotFile": "006a00af-00fe-00be-008d-00f5008a005e.png",
        "timestamp": 1554012134898,
        "duration": 32920
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7cc2dcc40b1f9a458ec8485dffc4fb46",
        "instanceId": 881,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554012599524,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012613295,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012613295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554012613296,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012623945,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554012623945,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554012623978,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554012625043,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554012627107,
                "type": ""
            }
        ],
        "screenShotFile": "00f50023-0060-00a2-00c2-00780099004f.png",
        "timestamp": 1554012598423,
        "duration": 36755
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "8cb73ebfcfc6b83d83509e5bcafec2b3",
        "instanceId": 953,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "ReferenceError: uploadImages is not defined"
        ],
        "trace": [
            "ReferenceError: uploadImages is not defined\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:20:6)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554012997545,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013011314,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013011314,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554013011315,
                "type": ""
            }
        ],
        "screenShotFile": "0080007c-0026-0054-0006-004000550025.png",
        "timestamp": 1554012996355,
        "duration": 20100
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6376e19bf067d5fd42088417f16e5c70",
        "instanceId": 1021,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at fs.readdir (/Users/shafi/Desktop/WoovlyAutomation/lib/common.js:17:16)\n    at FSReqCallback.oncomplete (fs.js:148:20)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554013210894,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013224697,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013224697,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554013224698,
                "type": ""
            }
        ],
        "screenShotFile": "00270066-003f-0019-004f-0019007000d7.png",
        "timestamp": 1554013209905,
        "duration": 23972
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "213c707c20c02dcd96c757cbed8531ce",
        "instanceId": 1079,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at fs.readdir (/Users/shafi/Desktop/WoovlyAutomation/lib/common.js:17:16)\n    at FSReqCallback.oncomplete (fs.js:148:20)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554013395505,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013409568,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013409568,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554013409569,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013420337,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013420338,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554013420371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554013422258,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554013422268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430765,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013430766,
                "type": ""
            }
        ],
        "screenShotFile": "00580010-00a0-0079-00fe-009200380066.png",
        "timestamp": 1554013394534,
        "duration": 36276
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6fb46b62f170f25bcd97940e62c6bce8",
        "instanceId": 1131,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at fs.readdir (/Users/shafi/Desktop/WoovlyAutomation/lib/common.js:17:16)\n    at FSReqCallback.oncomplete (fs.js:148:20)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554013612529,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013626558,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013626558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554013626559,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013637321,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554013637322,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554013637352,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554013639291,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554013639304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643715,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643715,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643715,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643719,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643719,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643719,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643720,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643729,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643730,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643730,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643731,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643731,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643731,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554013643732,
                "type": ""
            }
        ],
        "screenShotFile": "00af00fe-00db-0012-00bc-005400920001.png",
        "timestamp": 1554013610209,
        "duration": 37641
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "936fce8f36f31ed527f5237860c24d99",
        "instanceId": 1314,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: uploadImage.uploadImage is not a function"
        ],
        "trace": [
            "TypeError: uploadImage.uploadImage is not a function\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:25:24)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:22:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554014520417,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014534248,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014534249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554014534249,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014544923,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014544923,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554014544958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554014546877,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554014546893,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556247,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014556249,
                "type": ""
            }
        ],
        "screenShotFile": "000a002e-0051-00a5-006e-00d500a30057.png",
        "timestamp": 1554014519059,
        "duration": 37179
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "74c04b0203af5ac8f4ae7e79bc1db5ab",
        "instanceId": 1352,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: uploadImage.uploadImage is not a function"
        ],
        "trace": [
            "TypeError: uploadImage.uploadImage is not a function\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:25:24)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:22:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554014610721,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014624580,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014624580,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554014624580,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014635291,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014635292,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554014635325,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554014636394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554014638462,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641618,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641618,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641619,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641619,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641625,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641625,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641626,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641627,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641627,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641628,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014641628,
                "type": ""
            }
        ],
        "screenShotFile": "00bf0060-0088-00f9-0010-00d700e20025.png",
        "timestamp": 1554014609616,
        "duration": 37043
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "45d92428946ce8dcc4039bea95540f78",
        "instanceId": 1423,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"forCoverImage\"])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at fs.readdir (/Users/shafi/Desktop/WoovlyAutomation/lib/common.js:17:16)\n    at FSReqCallback.oncomplete (fs.js:148:20)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554014930487,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014944390,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014944390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554014944390,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014955077,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554014955077,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554014955108,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554014957468,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554014959539,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962713,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962717,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962717,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962718,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962718,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962725,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962726,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962726,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962727,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554014962729,
                "type": ""
            }
        ],
        "screenShotFile": "009c006c-009a-0006-004a-00c0007f00ff.png",
        "timestamp": 1554014929535,
        "duration": 37265
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ceafb26e0537084c3add3cc2f4398bf",
        "instanceId": 1474,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "ReferenceError: SignupPO is not defined"
        ],
        "trace": [
            "ReferenceError: SignupPO is not defined\n    at fs.readdir (/Users/shafi/Desktop/WoovlyAutomation/lib/common.js:30:15)\n    at FSReqCallback.oncomplete (fs.js:148:20)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554015444286,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015458118,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015458118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554015458120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015468770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015468770,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554015468807,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554015470868,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554015470882,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480293,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015480295,
                "type": ""
            }
        ],
        "screenShotFile": "002e0059-0000-004b-0097-0010008a0051.png",
        "timestamp": 1554015443100,
        "duration": 37182
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "3fe4ec9b59c4819854c6640436baff00",
        "instanceId": 1531,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554015614532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015628283,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015628283,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554015628284,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015638963,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015638963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554015639000,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554015642195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554015642209,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646577,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646577,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646578,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646578,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646581,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646589,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646590,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646590,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015646592,
                "type": ""
            }
        ],
        "screenShotFile": "008a00c9-00a3-0038-008f-00e400e700e2.png",
        "timestamp": 1554015613265,
        "duration": 55672
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "11c4dce2f6e951581fc5c2482d4338b0",
        "instanceId": 1567,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554015833778,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015847607,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015847607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554015847609,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015858282,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554015858282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554015858313,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554015860071,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554015860084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865569,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865570,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865570,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865570,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865575,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865575,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865575,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865575,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865584,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554015865584,
                "type": ""
            }
        ],
        "screenShotFile": "003600a3-001a-004c-0095-00d600a90056.png",
        "timestamp": 1554015832717,
        "duration": 55631
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b7fc60cb5d98cc7ae4de36907ec452b0",
        "instanceId": 1633,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: datetime is not defined"
        ],
        "trace": [
            "ReferenceError: datetime is not defined\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:31:10)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:22:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:11:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554016152632,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016166514,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016166514,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554016166515,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016177272,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016177272,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554016177305,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554016178451,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554016180513,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183430,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183430,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183430,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183430,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183437,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016183439,
                "type": ""
            }
        ],
        "screenShotFile": "0077007a-00eb-0097-00b6-002000e0001c.png",
        "timestamp": 1554016150402,
        "duration": 58162
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4c1f6ae50b7c55568f2621e2757d5abc",
        "instanceId": 1680,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554016325835,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016339662,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016339663,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554016339665,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016350428,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554016350428,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554016350458,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554016351539,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554016353606,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357810,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554016357811,
                "type": ""
            }
        ],
        "screenShotFile": "008f00fa-00f0-0032-003a-00ac00b60016.png",
        "timestamp": 1554016324863,
        "duration": 65110
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "153047a4202ec1acaef21a994e3b2c30",
        "instanceId": 1805,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:20:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:47:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554017127872,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017141903,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017141903,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554017141904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017152635,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017152635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554017152672,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554017154527,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554017154543,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159939,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159940,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017159940,
                "type": ""
            }
        ],
        "screenShotFile": "00a700dd-00fa-009b-0017-00a500e80015.png",
        "timestamp": 1554017126772,
        "duration": 81383
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7a6a50e6adce17e09aa2102dd0a814f3",
        "instanceId": 1836,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "WebDriverError: unknown error: Element <div class=\"addingF16 row lh22 p_cont opa5 cursor_pointer\" style=\"max-height: 130px; overflow: auto;\" ng-click=\"openPostPanel($event)\" id=\"actualPostTxtHolder\">...</div> is not clickable at point (729, 217). Other element would receive the click: <div class=\"swipe brw_3\" id=\"swipe\" style=\"transform: translateY(0px) scale(1); display: block;\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.4 x86_64)",
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"addingF16 row lh22 p_cont opa5 cursor_pointer\" style=\"max-height: 130px; overflow: auto;\" ng-click=\"openPostPanel($event)\" id=\"actualPostTxtHolder\">...</div> is not clickable at point (729, 217). Other element would receive the click: <div class=\"swipe brw_3\" id=\"swipe\" style=\"transform: translateY(0px) scale(1); display: block;\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.4 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at addOthersBucket.expDesc (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:14:16)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:40:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)",
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:20:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:47:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554017245565,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017259373,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017259373,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554017259374,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017270014,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017270014,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554017270049,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554017271792,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554017271808,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277393,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017277395,
                "type": ""
            }
        ],
        "screenShotFile": "00130033-003e-005c-00c0-001700fe00cd.png",
        "timestamp": 1554017243847,
        "duration": 57632
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "f1b3af9e2d6d0a4563d41eb8224e11b0",
        "instanceId": 1892,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:22:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:47:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554017553169,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017566919,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017566919,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554017566920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017577577,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017577578,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554017577610,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554017578669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554017580735,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584085,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584086,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584086,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584090,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584090,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584091,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584091,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584097,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584097,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584097,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584098,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584098,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584098,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017584099,
                "type": ""
            }
        ],
        "screenShotFile": "002500b4-009f-0038-0067-007c007a000c.png",
        "timestamp": 1554017551470,
        "duration": 82026
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c7adcccfe306b2aabf1597903add6a43",
        "instanceId": 1935,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:22:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:47:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554017694450,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017708215,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017708215,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554017708217,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017718873,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554017718874,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554017718910,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554017720805,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554017720819,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726432,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554017726433,
                "type": ""
            }
        ],
        "screenShotFile": "00990056-0024-0024-0084-00d900eb0074.png",
        "timestamp": 1554017693468,
        "duration": 91208
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "bd591795891eb4602686449136801907",
        "instanceId": 2072,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:34:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:48:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554018817193,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554018830971,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554018830971,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554018830972,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554018841725,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554018841725,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554018841758,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554018843713,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554018843726,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848198,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848198,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848201,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848202,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848202,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848212,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848212,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554018848213,
                "type": ""
            }
        ],
        "screenShotFile": "00df00ec-0098-00a0-0063-004100ee0081.png",
        "timestamp": 1554018815440,
        "duration": 95157
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dcf0b9145e1db000a2904ff3146c773c",
        "instanceId": 2131,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: rating_1 is not defined"
        ],
        "trace": [
            "ReferenceError: rating_1 is not defined\n    at addOthersBucket.feedBackLocTag (/Users/shafi/Desktop/WoovlyAutomation/pom/addOthersBucket.js:36:5)\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:48:13)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"Positive Case1 :- Add Others Bucket List\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:35:5)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec/specAddOthersBucket.js:24:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554019250281,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019264160,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019264160,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554019264162,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019274967,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019274969,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554019275002,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554019276301,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554019278361,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281601,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281603,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281606,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281613,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281613,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281613,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281614,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281614,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019281615,
                "type": ""
            }
        ],
        "screenShotFile": "000b0078-0055-00dd-000e-004300c40005.png",
        "timestamp": 1554019249220,
        "duration": 95023
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b34cc1a1d5000e2002f5570cbd3f5b30",
        "instanceId": 2186,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554019562917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019576650,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019576650,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554019576652,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019587309,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019587310,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554019587342,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554019589970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554019589983,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019595427,
                "type": ""
            }
        ],
        "screenShotFile": "00800077-002b-008e-0060-00a3003800f7.png",
        "timestamp": 1554019561931,
        "duration": 88794
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "6568d28927d3b70864cd2668aa7f91a2",
        "instanceId": 2243,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554019924771,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019938572,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019938572,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554019938573,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019949277,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554019949277,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554019949332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554019950417,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554019952478,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955596,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955600,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955600,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955609,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955609,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955609,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554019955610,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 0:0 Uncaught Pc: initAutocomplete is not a function",
                "timestamp": 1554020013431,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554020013431,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554020013431,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 - Mixed Content: The page at 'https://alpha.woovly.com/11552480738195' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554020013431,
                "type": ""
            }
        ],
        "screenShotFile": "0038002d-0020-00be-00e9-00eb004500f1.png",
        "timestamp": 1554019923343,
        "duration": 90083
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List and accomplish|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "92650d93709533f933654eab5815c7ce",
        "instanceId": 23366,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at addOthersBucket.mmYyyy (/home/shafi/Desktop/woovly-automation/pom/addOthersBucket.js:44:15)\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specAddOthersBucket.js:46:13)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554196908764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554196921965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554196921965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554196921966,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554196932645,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554196932645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554196932668,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554196933560,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554196935582,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554196939497,
                "type": ""
            }
        ],
        "screenShotFile": "00620021-0036-006f-0087-007f004500dc.png",
        "timestamp": 1554196907161,
        "duration": 63214
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List and accomplish|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "84ce00d7d964a394209801acf502f02f",
        "instanceId": 23850,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at addOthersBucket.mmYyyy (/home/shafi/Desktop/woovly-automation/pom/addOthersBucket.js:52:15)\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specAddOthersBucket.js:46:13)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554197206372,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197219467,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197219467,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554197219468,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197230126,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197230126,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554197230146,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554197230931,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554197232961,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235664,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235664,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235664,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235664,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235670,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197235670,
                "type": ""
            }
        ],
        "screenShotFile": "002e009a-00ce-005d-004e-00af00cf00b6.png",
        "timestamp": 1554197204349,
        "duration": 63445
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List and accomplish|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "8653d302c747f2cc4a8a0ca51e4fff85",
        "instanceId": 24177,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554197313005,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197326030,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197326030,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554197326031,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197336764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197336764,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554197336784,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554197337528,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554197339545,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554197343440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 0:0 Uncaught Pc: initAutocomplete is not a function",
                "timestamp": 1554197395359,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197395359,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554197395359,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 - Mixed Content: The page at 'https://alpha.woovly.com/11552480738195' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554197395359,
                "type": ""
            }
        ],
        "screenShotFile": "001a00e5-002f-00b9-008d-00d600ca00ff.png",
        "timestamp": 1554197310935,
        "duration": 84415
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List and accomplish|Woovly Invite Friend Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "fa19a005cd9486a746cffb7dbdb76a9f",
        "instanceId": 25209,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198507619,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198520662,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198520662,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198520663,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198531357,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198531358,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554198531377,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554198532205,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198534250,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540942,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540942,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540942,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540942,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554198540943,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198589308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/11552480738195 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198589308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 0:0 Uncaught Pc: initAutocomplete is not a function",
                "timestamp": 1554198589308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/11552480738195 - Mixed Content: The page at 'https://alpha.woovly.com/11552480738195' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554198589308,
                "type": ""
            }
        ],
        "screenShotFile": "003600c5-00ec-00c5-0060-004e00ee00d9.png",
        "timestamp": 1554198505618,
        "duration": 83681
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198638980,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198644237,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198644237,
                "type": ""
            }
        ],
        "screenShotFile": "009e00b1-0096-00de-0076-00dc00e10042.png",
        "timestamp": 1554198637202,
        "duration": 7131
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198645151,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198648741,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198648744,
                "type": ""
            }
        ],
        "screenShotFile": "00d10037-00e9-0080-00ef-006a000200df.png",
        "timestamp": 1554198644868,
        "duration": 3945
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198649298,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198652923,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198652923,
                "type": ""
            }
        ],
        "screenShotFile": "007700af-00bc-006a-0077-008c00670094.png",
        "timestamp": 1554198649081,
        "duration": 3890
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198653544,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198656939,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198656939,
                "type": ""
            }
        ],
        "screenShotFile": "00360047-00ed-0089-005b-003c00e8005c.png",
        "timestamp": 1554198653306,
        "duration": 3702
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198657458,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198660435,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198660435,
                "type": ""
            }
        ],
        "screenShotFile": "00290031-00ac-0032-0068-0008004b008e.png",
        "timestamp": 1554198657270,
        "duration": 3199
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198661012,
                "type": ""
            }
        ],
        "screenShotFile": "00ee004f-006f-0087-00a9-00e7005d0001.png",
        "timestamp": 1554198660870,
        "duration": 5249
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198666806,
                "type": ""
            }
        ],
        "screenShotFile": "00ec0094-00b6-000b-0007-009b007f003b.png",
        "timestamp": 1554198666609,
        "duration": 5823
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "8195985915fd84d1bfa974dc509098f6",
        "instanceId": 25569,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR\" onclick=\"userstory()\" ng-show=\"loggedInUser\">...</div> is not clickable at point (1480, 29). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR\" onclick=\"userstory()\" ng-show=\"loggedInUser\">...</div> is not clickable at point (1480, 29). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.Logout (/home/shafi/Desktop/woovly-automation/pom/login.js:108:37)\n    at UserContext.it (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:119:19)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:109:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198672904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198703076,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198703076,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds - Mixed Content: The page at 'https://alpha.woovly.com/Karan.Xelp/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/e3ee2d70-552c-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198703076,
                "type": ""
            }
        ],
        "screenShotFile": "00540092-0065-00e2-00a1-0066009600be.png",
        "timestamp": 1554198672787,
        "duration": 30381
    },
    {
        "description": "Case 1:- Create Story & Publish With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "da0c2b4d9a96d59ca97bd9c18bbca062",
        "instanceId": 25575,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198639120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198652615,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198652615,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198652616,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541986581515 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198658486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541986581515 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198658486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541986581515 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1554198675960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541986581515 - OTS parsing error: overlapping tables",
                "timestamp": 1554198675960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541986581515 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1554198675960,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-104183 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198697926,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-104183 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198697926,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198698243,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-104183 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-104183' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/d4c91260-552c-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198698737,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198711949,
                "type": ""
            }
        ],
        "screenShotFile": "0046006a-0020-0059-0024-004a000400ba.png",
        "timestamp": 1554198637132,
        "duration": 74802
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198745413,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198750402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198750402,
                "type": ""
            }
        ],
        "screenShotFile": "002500a8-0010-00e0-00b2-0042009600a4.png",
        "timestamp": 1554198743636,
        "duration": 6823
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198750989,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198754014,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198754014,
                "type": ""
            }
        ],
        "screenShotFile": "005b00f1-00ef-00c7-007a-007600580015.png",
        "timestamp": 1554198750827,
        "duration": 3217
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198754532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198757402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198757402,
                "type": ""
            }
        ],
        "screenShotFile": "0077007d-009a-006b-0083-00b80093003b.png",
        "timestamp": 1554198754380,
        "duration": 3056
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198757962,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198760892,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198760892,
                "type": ""
            }
        ],
        "screenShotFile": "007d0086-005e-00a6-0054-00e2006800a5.png",
        "timestamp": 1554198757805,
        "duration": 3114
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"signupDobDiv\"]/div/table/tbody/tr[5]/td[4]/a)\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/home/shafi/Desktop/woovly-automation/pom/signup.js:9:27)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198761434,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198761572,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198761573,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198761573,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198761574,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198764483,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/ - Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1554198764483,
                "type": ""
            }
        ],
        "screenShotFile": "00a400df-0047-0062-0039-0073005b0022.png",
        "timestamp": 1554198761287,
        "duration": 3228
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198764955,
                "type": ""
            }
        ],
        "screenShotFile": "006b0015-00dd-0029-0028-00eb00b20062.png",
        "timestamp": 1554198764805,
        "duration": 5121
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198770428,
                "type": ""
            }
        ],
        "screenShotFile": "005a00ad-0050-002d-00cb-0061008b00ad.png",
        "timestamp": 1554198770304,
        "duration": 5255
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "48b6abe4f99c4301b8a18acaecb7bbec",
        "instanceId": 26940,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: unknown error: Element <div class=\"userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR\" onclick=\"userstory()\" ng-show=\"loggedInUser\">...</div> is not clickable at point (1480, 29). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"userOpt colour_white txt_cap align_center bolder display_flex flex_end transition300 flexdir_row poR\" onclick=\"userstory()\" ng-show=\"loggedInUser\">...</div> is not clickable at point (1480, 29). Other element would receive the click: <div class=\"overlaySh\" id=\"overlayLogin\" onclick=\"closeAddPopMob()\" style=\"display: block; opacity: 1;\"></div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.Logout (/home/shafi/Desktop/woovly-automation/pom/login.js:108:37)\n    at UserContext.it (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:119:19)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:109:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specSignup.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198776067,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198805273,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198805273,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/Karan.Xelp/feeds - Mixed Content: The page at 'https://alpha.woovly.com/Karan.Xelp/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/20c966b0-552d-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198805274,
                "type": ""
            }
        ],
        "screenShotFile": "00790098-0083-004c-0080-004500c800f4.png",
        "timestamp": 1554198775917,
        "duration": 29455
    },
    {
        "description": "Case 1:- Create Story & Publish With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "1548ed5c2e8d44321701eaf196237e85",
        "instanceId": 27399,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198807828,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198821019,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198821019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198821020,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988263674 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198826647,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988263674 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198826647,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988263674 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1554198842796,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988263674 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1554198842797,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988263674 - OTS parsing error: overlapping tables",
                "timestamp": 1554198842797,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-169683 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198862785,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-169683 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198862785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198863286,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-169683 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-169683' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/38a6de20-552d-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198863845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198877342,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198877343,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198877343,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198877343,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198877344,
                "type": ""
            }
        ],
        "screenShotFile": "00a3003e-007c-004c-004a-00e200b3006c.png",
        "timestamp": 1554198806377,
        "duration": 70944
    },
    {
        "description": "Case 2:- Create Story & Save With Existing Bucketlist|Woovly Create Story Module",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "1548ed5c2e8d44321701eaf196237e85",
        "instanceId": 27399,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198878486,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198891328,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198891328,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198891329,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988965022 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198896732,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988965022 3555 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198896732,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988965022 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/Courier-Regular.ttf",
                "timestamp": 1554198917904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988965022 - OTS parsing error: overlapping tables",
                "timestamp": 1554198917904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/story/15541988965022 - Failed to decode downloaded font: https://alpha.woovly.com/fonts/AveriaSerifLibre-Regular.ttf",
                "timestamp": 1554198918028,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198936348,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1 3579 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198936348,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/8aff2610-552c-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/98347f10-552c-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1 - Mixed Content: The page at 'https://alpha.woovly.com/stories/automated-story-id-747775?showdraft=1' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_720/919d2df0-552c-11e9-9a07-d790929c1e1d.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554198936349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198947862,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198947863,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198947863,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198947863,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554198947863,
                "type": ""
            }
        ],
        "screenShotFile": "008800f1-0074-000d-00f1-00ef00c40020.png",
        "timestamp": 1554198878058,
        "duration": 69794
    },
    {
        "description": "Positive Case1 :- Enter valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "a5c5acb6d9b4e02cd85e868f8cc53182",
        "instanceId": 27825,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id='likers']/div/div[3]/div[2])\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at inviteSubmit (/home/shafi/Desktop/woovly-automation/pom/inviteFriend.js:29:29)\n    at InviteFriend.Get_Invite_Friends1 (/home/shafi/Desktop/woovly-automation/pom/inviteFriend.js:55:15)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run it(\"Positive Case1 :- Enter valid Email-id\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:17:5)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198950722,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198963749,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198963749,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198963750,
                "type": ""
            }
        ],
        "screenShotFile": "00e70094-0055-000a-0076-006100c600b9.png",
        "timestamp": 1554198949294,
        "duration": 26438
    },
    {
        "description": "Negative Case1 :- Enter In-valid Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "a5c5acb6d9b4e02cd85e868f8cc53182",
        "instanceId": 27825,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/home/shafi/Desktop/woovly-automation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/home/shafi/Desktop/woovly-automation/pom/login.js:55:11)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198976062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198976062,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198976062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198980324,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198980324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198980325,
                "type": ""
            }
        ],
        "screenShotFile": "006f00aa-001c-0088-0041-0085001b0043.png",
        "timestamp": 1554198975972,
        "duration": 9863
    },
    {
        "description": "Negative Case2 :- After Removing Email-id|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "a5c5acb6d9b4e02cd85e868f8cc53182",
        "instanceId": 27825,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //div[@class='landing-nav regular opacity50 transition300'])\n    at elementArrayFinder.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at loginButton (/home/shafi/Desktop/woovly-automation/pom/login.js:4:38)\n    at doLogin.Get_Email_Login (/home/shafi/Desktop/woovly-automation/pom/login.js:55:11)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:9:5)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specInviteFriend.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198990675,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554198990675,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554198990676,
                "type": ""
            }
        ],
        "screenShotFile": "00dd004e-0066-0030-00dc-004b0049007c.png",
        "timestamp": 1554198986197,
        "duration": 10047
    },
    {
        "description": "Positive Case1 :- Add Others Bucket List and accomplish|Woovly Invite Friend Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "0da0209dd4cb90407341c7d688164e7a",
        "instanceId": 28173,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "WebDriverError: unknown error: Element <div class=\"required_props poR align_center  lastStep icon ic-right\" ng-click=\"openLocation()\">...</div> is not clickable at point (928, 558). Other element would receive the click: <div class=\"excitmentPanel velocity-animating\" id=\"excitmentPanel\" style=\"transform: translateY(0.0899694%) scale(1); display: block;\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <div class=\"required_props poR align_center  lastStep icon ic-right\" ng-click=\"openLocation()\">...</div> is not clickable at point (928, 558). Other element would receive the click: <div class=\"excitmentPanel velocity-animating\" id=\"excitmentPanel\" style=\"transform: translateY(0.0899694%) scale(1); display: block;\">...</div>\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at addOthersBucket.feedBackLocTag (/home/shafi/Desktop/woovly-automation/pom/addOthersBucket.js:37:35)\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specAddOthersBucket.js:40:12)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554198998821,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554199011846,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554199011846,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554199011847,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554199022489,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/woovly.1 3574 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554199022489,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/woovly.1 - Mixed Content: The page at 'https://alpha.woovly.com/woovly.1' was loaded over HTTPS, but requested an insecure script 'http://kentor.github.io/jquery-draggable-background/draggable_background.js'. This request has been blocked; the content must be served over HTTPS.",
                "timestamp": 1554199022523,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://maps.googleapis.com/maps/api/js?key=AIzaSyApzLoP2zgs3DjXwEG2fwN8BErPrKMDT7A&libraries=places&callback=initAutocomplete&types=(cities) 60:127 \"InvalidValueError: not an instance of HTMLInputElement\"",
                "timestamp": 1554199024195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://alpha.woovly.com/404 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1554199026239,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://html2canvas.hertzen.com/dist/html2canvas.js 362:20 \"Invalid value given for Length: \\\"auto\\\"\"",
                "timestamp": 1554199033057,
                "type": ""
            }
        ],
        "screenShotFile": "00ec00df-009e-00f3-0010-004a00b0000d.png",
        "timestamp": 1554198997346,
        "duration": 72041
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "591007bdf3fd887d72211890f8207704",
        "instanceId": 323,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554203638119,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554203651767,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554203651767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554203651767,
                "type": ""
            }
        ],
        "screenShotFile": "009000d1-00f3-000c-008c-001b00c7003c.png",
        "timestamp": 1554203635707,
        "duration": 23310
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "d5dfa661772518b97ac480cf123bf169",
        "instanceId": 1068,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554204069501,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204082616,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204082616,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554204082617,
                "type": ""
            }
        ],
        "screenShotFile": "00b800fb-00c3-00cd-00d2-00fb00b200a4.png",
        "timestamp": 1554204067439,
        "duration": 22559
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "6d8ec59061a851b120e5f931471cf384",
        "instanceId": 1854,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554204833856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204847090,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204847090,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554204847091,
                "type": ""
            }
        ],
        "screenShotFile": "001f00cc-001d-00e8-00ae-00ae008b004f.png",
        "timestamp": 1554204832063,
        "duration": 22441
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "dd74d6c19c3430c440a9f2e743b52864",
        "instanceId": 2232,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554204894885,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204908308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554204908308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554204908309,
                "type": ""
            }
        ],
        "screenShotFile": "002700a7-00d2-0012-000e-008000c8006a.png",
        "timestamp": 1554204892980,
        "duration": 22683
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "e2c3c33d570d8fd1aae4a400b2e84e03",
        "instanceId": 2603,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554205065130,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205079092,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205079092,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554205079093,
                "type": ""
            }
        ],
        "screenShotFile": "00fc0059-00f7-004f-00f6-008b005b005d.png",
        "timestamp": 1554205063249,
        "duration": 28235
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "72910afcdb9d8b36ea797fbddfb60c91",
        "instanceId": 2921,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554205110721,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205123956,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205123956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554205123957,
                "type": ""
            }
        ],
        "screenShotFile": "00d70012-0025-00dd-0043-00c600d70017.png",
        "timestamp": 1554205108804,
        "duration": 27508
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48860a87ed5136fc7b669b86c5e8bed8",
        "instanceId": 3301,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554205184956,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205198142,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205198143,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554205198143,
                "type": ""
            }
        ],
        "screenShotFile": "00040042-001e-0006-00be-00fc009a0000.png",
        "timestamp": 1554205183052,
        "duration": 27468
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "8a283572c4d44c6315437c5369901d67",
        "instanceId": 4528,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554205551059,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205564094,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205564094,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554205564095,
                "type": ""
            }
        ],
        "screenShotFile": "00cc0074-004e-0049-0064-005d008300ac.png",
        "timestamp": 1554205549075,
        "duration": 27465
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "f6f7729debfe979bc321857162bfae0c",
        "instanceId": 4891,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554205676010,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205689022,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554205689022,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554205689023,
                "type": ""
            }
        ],
        "screenShotFile": "005a0064-0027-0088-0079-000f00c5003f.png",
        "timestamp": 1554205674028,
        "duration": 27784
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "88e3ea781437bd99399743cad959d235",
        "instanceId": 6142,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554209485236,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554209498445,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554209498445,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554209498446,
                "type": ""
            }
        ],
        "screenShotFile": "00210031-001b-00f7-0087-005400040079.png",
        "timestamp": 1554209481638,
        "duration": 29476
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ff917919e807b8df33f1a00546684936",
        "instanceId": 7039,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554210829651,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554210842796,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554210842796,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554210842797,
                "type": ""
            }
        ],
        "screenShotFile": "00bf00da-0062-002c-00b6-009e007b009e.png",
        "timestamp": 1554210825451,
        "duration": 30273
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "5c9dd53b1feec0f33013c6885ce03ed1",
        "instanceId": 7394,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554210994321,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211007601,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211007601,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554211007602,
                "type": ""
            }
        ],
        "screenShotFile": "007f00e3-0039-009b-008e-005f00360028.png",
        "timestamp": 1554210992469,
        "duration": 27823
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ec0b39352f27dd49cc1ca6bc64756090",
        "instanceId": 7912,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554211261867,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211274972,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211274972,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554211274973,
                "type": ""
            }
        ],
        "screenShotFile": "00140096-00fc-00bb-00bb-00be006500af.png",
        "timestamp": 1554211259041,
        "duration": 28794
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "f44cf9d59892eba13710497581953ac1",
        "instanceId": 8630,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554211602561,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211615638,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554211615638,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554211615639,
                "type": ""
            }
        ],
        "screenShotFile": "00e00064-001e-001b-0074-002200e600c2.png",
        "timestamp": 1554211600759,
        "duration": 27621
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ad958304ef0a24bb1b0db0f0c3d5e267",
        "instanceId": 9120,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554212131080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554212144110,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554212144110,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554212144111,
                "type": ""
            }
        ],
        "screenShotFile": "00ac0077-0058-00c0-00c9-000200390049.png",
        "timestamp": 1554212129252,
        "duration": 23700
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "aa7adac6972d60a7d3e4c6802e28408a",
        "instanceId": 9609,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554212550301,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554212563360,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554212563360,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554212563361,
                "type": ""
            }
        ],
        "screenShotFile": "00b400b7-00c4-00e8-007b-00b50096000b.png",
        "timestamp": 1554212548404,
        "duration": 23513
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "c04ced8c2f365f5f191c1fd01e7550cf",
        "instanceId": 10847,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: featureDash.likePost is not a function"
        ],
        "trace": [
            "TypeError: featureDash.likePost is not a function\n    at LOCATOR_Featured.likeText.getText.then.text (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:23:19)\n    at elementArrayFinder_.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:804:32)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run it(\"Positive Case1 :- Like a post on dashboard page\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:18:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554214196056,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214209120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214209120,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554214209121,
                "type": ""
            }
        ],
        "screenShotFile": "005c00d7-0046-00f5-00d4-00e9007e00d9.png",
        "timestamp": 1554214193274,
        "duration": 21081
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "a74ddfa2d277c348606a9f942b35364f",
        "instanceId": 11255,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "TypeError: Cannot read property 'oldLikeCount' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'oldLikeCount' of undefined\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:26:44)\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2974:25)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554214505294,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214518434,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214518434,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554214518434,
                "type": ""
            }
        ],
        "screenShotFile": "001c008d-000f-00f8-0037-00260045009c.png",
        "timestamp": 1554214503363,
        "duration": 20276
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "ddc46edfe40c79619787f312d19e3fc3",
        "instanceId": 11639,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554214707159,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554214711422,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554214711422,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554214711422,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.ykSHrfQM9QA.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCP1yoYpPlJ6Ad38ZCkvGQHEfpM82w/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1554214711423,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214720170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214720170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554214720170,
                "type": ""
            }
        ],
        "screenShotFile": "00890076-00af-00e6-0081-00c200090021.png",
        "timestamp": 1554214705705,
        "duration": 23475
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "49733156a9223d011c1234d658a4b5c3",
        "instanceId": 11966,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554214794086,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214807170,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554214807170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554214807171,
                "type": ""
            }
        ],
        "screenShotFile": "00dc00cd-0097-002e-003c-00e500020023.png",
        "timestamp": 1554214792497,
        "duration": 23385
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "1d33cc81b8c6dd7edf5d9f658652cbb1",
        "instanceId": 12602,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554215514236,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215527218,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215527218,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554215527219,
                "type": ""
            }
        ],
        "screenShotFile": "00a300af-009f-00f1-0083-004a00240061.png",
        "timestamp": 1554215510283,
        "duration": 25844
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "4ca9d45c7efab8122de98062a7ec9640",
        "instanceId": 13022,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554215822465,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215835476,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215835476,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554215835477,
                "type": ""
            }
        ],
        "screenShotFile": "00d8001c-00bc-00fc-003b-003d006600c7.png",
        "timestamp": 1554215819785,
        "duration": 24531
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "7472bb12512d227e930308b1170246b5",
        "instanceId": 13393,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554215975345,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215988434,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554215988434,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554215988434,
                "type": ""
            }
        ],
        "screenShotFile": "00500082-002d-002e-0024-00e600b10016.png",
        "timestamp": 1554215973570,
        "duration": 23757
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "d60bb330faa05bdb3e7cbcafb090be5a",
        "instanceId": 13742,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected '39' to equal ''."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:26:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554216068451,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216081797,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216081798,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554216081798,
                "type": ""
            }
        ],
        "screenShotFile": "00bb00f0-00b4-000a-00e7-006e00400078.png",
        "timestamp": 1554216066791,
        "duration": 23694
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "84a9c204007628efa129fe010d04f4dc",
        "instanceId": 14181,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Expected '40' to equal 'likes.oldLikeCount'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:26:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554216180429,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216193569,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216193569,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554216193570,
                "type": ""
            }
        ],
        "screenShotFile": "002000f4-00e8-0060-0096-00c000d40060.png",
        "timestamp": 1554216178835,
        "duration": 23588
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "b8d0d944d503132c073add48f9b07543",
        "instanceId": 14948,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: expect(...).contains is not a function"
        ],
        "trace": [
            "TypeError: expect(...).contains is not a function\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:26:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run it(\"Positive Case1 :- Like a post on dashboard page\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:18:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554216279545,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216292672,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216292672,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554216292673,
                "type": ""
            }
        ],
        "screenShotFile": "007c00c4-0071-001a-00d9-0083004f0078.png",
        "timestamp": 1554216276855,
        "duration": 24691
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "abcdc2a9baf9efa71147b9b49a9d7994",
        "instanceId": 15256,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554216340542,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216353612,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216353612,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554216353613,
                "type": ""
            }
        ],
        "screenShotFile": "00a70089-0005-0013-000a-00c9006200ae.png",
        "timestamp": 1554216338172,
        "duration": 24404
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "4efc905f7d6431b8207f5817701f87d8",
        "instanceId": 15681,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554216757729,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216770779,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554216770779,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554216770780,
                "type": ""
            }
        ],
        "screenShotFile": "00c400f4-001f-00ae-00c9-00d80059005b.png",
        "timestamp": 1554216755726,
        "duration": 23624
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "sessionId": "ef6d993a463f7dec697c18337410d4a3",
        "instanceId": 16075,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": [
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)",
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)"
        ],
        "trace": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, [onclick=\"closeAddPart()\"])\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at closeApp (/home/shafi/Desktop/woovly-automation/pom/login.js:32:35)\n    at doLogin.Get_Email_Login (/home/shafi/Desktop/woovly-automation/pom/login.js:64:11)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:10:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)",
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=73.0.3683.86)\n  (Driver info: chromedriver=2.46.628388 (4a34a70827ac54148e092aafb70504c4ea7ae926),platform=Linux 4.18.0-16-generic x86_64)\n    at Object.checkLegacyResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)\nFrom: Task: Protractor.waitForAngular() - Locator: By(xpath, //*[@id=\"mainFeeds\"]/div[1]/div/div[2]/div[2]/div[2]/div[3]/div[1]/div[2]/span)\n    at thenableWebDriverProxy.schedule (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/browser.js:425:28)\n    at angularAppRoot.then (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)Error\n    at ElementArrayFinder.applyAction_ (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (/home/shafi/Desktop/woovly-automation/node_modules/protractor/built/element.js:831:22)\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:20:31)\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\nFrom: Task: Run it(\"Positive Case1 :- Like a post on dashboard page\") in control flow\n    at UserContext.<anonymous> (/home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at Function.next.fail (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4274:9)\n    at /home/shafi/Desktop/woovly-automation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/shafi/Desktop/woovly-automation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:18:3)\n    at addSpecsToSuite (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/shafi/Desktop/woovly-automation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/shafi/Desktop/woovly-automation/spec/specLikePost.js:7:1)\n    at Module._compile (internal/modules/cjs/loader.js:805:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:816:10)\n    at Module.load (internal/modules/cjs/loader.js:672:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:612:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554217072049,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217085173,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217085173,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554217085173,
                "type": ""
            }
        ],
        "screenShotFile": "00280020-0081-004b-00f0-006400590054.png",
        "timestamp": 1554217070204,
        "duration": 37098
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "30419d262e62005a4e2b211e6d1d7ccb",
        "instanceId": 16394,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554217125269,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217138242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217138242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554217138243,
                "type": ""
            }
        ],
        "screenShotFile": "00310038-00d6-002a-00de-00ef00fb0033.png",
        "timestamp": 1554217123356,
        "duration": 23848
    },
    {
        "description": "Positive Case1 :- Like a post on dashboard page|Woovly Like Post Module ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "7f6b5d6a2f5c4204286aaefced47257f",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "73.0.3683.86"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4094 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1554217210731,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217223780,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/test.14/feeds 3550 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1554217223780,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://wzh2p5ewb1.execute-api.ap-south-1.amazonaws.com/prod/resized?key=w_150/null - Failed to load resource: the server responded with a status of 502 ()",
                "timestamp": 1554217223780,
                "type": ""
            }
        ],
        "screenShotFile": "0081001e-00c5-0096-00eb-00f70025001d.png",
        "timestamp": 1554217209113,
        "duration": 23575
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

