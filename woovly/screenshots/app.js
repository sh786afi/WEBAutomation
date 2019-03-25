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
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145653275,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145655225,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145655225,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.87/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145663361,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.87/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145663361,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.87/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145670823,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.87/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145670823,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145682167,
                "type": ""
            }
        ],
        "screenShotFile": "000c00d0-006e-003f-0030-008b00150019.png",
        "timestamp": 1553145643231,
        "duration": 38928
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145683009,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145683614,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145683614,
                "type": ""
            }
        ],
        "screenShotFile": "00a500ce-0025-003c-00dd-005e008900e4.png",
        "timestamp": 1553145682813,
        "duration": 7713
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145691039,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145691646,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145691647,
                "type": ""
            }
        ],
        "screenShotFile": "002d00a3-00eb-000a-008a-00f600490003.png",
        "timestamp": 1553145690841,
        "duration": 5601
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145697037,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145697715,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145697715,
                "type": ""
            }
        ],
        "screenShotFile": "009b008e-00b1-0099-009d-00ce003000fc.png",
        "timestamp": 1553145696833,
        "duration": 5512
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145702949,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145703527,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145703527,
                "type": ""
            }
        ],
        "screenShotFile": "005e0000-0005-003c-00d9-001900b70067.png",
        "timestamp": 1553145702743,
        "duration": 5514
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145708822,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145709401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145709401,
                "type": ""
            }
        ],
        "screenShotFile": "00d5002e-0038-001a-0072-00d70035001c.png",
        "timestamp": 1553145708635,
        "duration": 5384
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145714597,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145715173,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145715174,
                "type": ""
            }
        ],
        "screenShotFile": "00250044-00e9-0021-00d4-00ca00030041.png",
        "timestamp": 1553145714402,
        "duration": 5380
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "7297b1b3c0e3a5ca4dfc21545a28f2ea",
        "instanceId": 2271,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145720369,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145720920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145720920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145740401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145740401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/4950c3a0-4b99-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553145740401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145749624,
                "type": ""
            }
        ],
        "screenShotFile": "000a00ec-0053-006b-0008-009e00e20076.png",
        "timestamp": 1553145720169,
        "duration": 29445
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145845391,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145847741,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145847741,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.88/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145855797,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.88/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145855798,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.88/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145856510,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.88/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145856514,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145877957,
                "type": ""
            }
        ],
        "screenShotFile": "00ae00db-007b-0021-0062-00aa0062007f.png",
        "timestamp": 1553145836372,
        "duration": 41578
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145878805,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145879792,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145879792,
                "type": ""
            }
        ],
        "screenShotFile": "008700fe-0052-00e1-004f-003600ba0057.png",
        "timestamp": 1553145878597,
        "duration": 8065
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145887220,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145888203,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145888203,
                "type": ""
            }
        ],
        "screenShotFile": "00cb0023-00c3-0067-0074-0033009200c7.png",
        "timestamp": 1553145886991,
        "duration": 6069
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145893668,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145894542,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145894542,
                "type": ""
            }
        ],
        "screenShotFile": "0004009f-003e-00a3-0028-002f00ab0045.png",
        "timestamp": 1553145893446,
        "duration": 5705
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145899751,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145900736,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145900736,
                "type": ""
            }
        ],
        "screenShotFile": "00de00d1-00a0-000e-0092-00ff0052007a.png",
        "timestamp": 1553145899544,
        "duration": 5915
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145906057,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145906892,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145906893,
                "type": ""
            }
        ],
        "screenShotFile": "00b6006e-006a-008e-0081-006b001c0092.png",
        "timestamp": 1553145905842,
        "duration": 5667
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145912101,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145912950,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145912951,
                "type": ""
            }
        ],
        "screenShotFile": "001d00e5-0086-00d5-0077-008800ef0041.png",
        "timestamp": 1553145911897,
        "duration": 5687
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "72154ee250b784366fa888a3dac4195c",
        "instanceId": 2333,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145918200,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145919190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553145919190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145938532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553145938532,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/bf6b98d0-4b99-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553145938533,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553145947763,
                "type": ""
            }
        ],
        "screenShotFile": "00cf0091-008e-001d-009d-000000ea0090.png",
        "timestamp": 1553145917980,
        "duration": 29774
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146003619,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146005873,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146005873,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.89/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146013949,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.89/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146013949,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.89/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146021424,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.89/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146021424,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146032776,
                "type": ""
            }
        ],
        "screenShotFile": "00330047-00c5-001f-006e-00b3006d0082.png",
        "timestamp": 1553145999621,
        "duration": 33149
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146033674,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146034691,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146034691,
                "type": ""
            }
        ],
        "screenShotFile": "00b500c4-0026-005a-0049-000200b800a3.png",
        "timestamp": 1553146033437,
        "duration": 8160
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146042150,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146043125,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146043125,
                "type": ""
            }
        ],
        "screenShotFile": "003a002e-0096-00c5-00fd-00d200fc0097.png",
        "timestamp": 1553146041911,
        "duration": 6079
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146048591,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146049511,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146049511,
                "type": ""
            }
        ],
        "screenShotFile": "00d000ed-00f2-0013-0064-003500d100d8.png",
        "timestamp": 1553146048379,
        "duration": 5734
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146054719,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146055705,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146055705,
                "type": ""
            }
        ],
        "screenShotFile": "008b00ff-00df-00b5-009c-0079003a0020.png",
        "timestamp": 1553146054511,
        "duration": 5974
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146061090,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146061891,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146061891,
                "type": ""
            }
        ],
        "screenShotFile": "001f00f6-0014-003d-0076-00c1008300a5.png",
        "timestamp": 1553146060877,
        "duration": 5697
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146067178,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146067969,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146067969,
                "type": ""
            }
        ],
        "screenShotFile": "003d006f-0054-0099-0042-005a009500aa.png",
        "timestamp": 1553146066966,
        "duration": 5667
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "39ec1f031099a061e43e5865c46c1fe1",
        "instanceId": 2410,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146073242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146074251,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553146074252,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146093501,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553146093502,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553146102747,
                "type": ""
            }
        ],
        "screenShotFile": "00f90035-00a0-0068-0017-004400660074.png",
        "timestamp": 1553146073030,
        "duration": 29702
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147147756,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147149622,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147149622,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.90/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147157701,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.90/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147157701,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.90/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147165181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.90/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147165181,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147176571,
                "type": ""
            }
        ],
        "screenShotFile": "00cf0029-0015-00ad-002b-007800f100fc.png",
        "timestamp": 1553147146281,
        "duration": 30279
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147177451,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147178063,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147178063,
                "type": ""
            }
        ],
        "screenShotFile": "008500ad-0079-008b-009b-00a500dd00cd.png",
        "timestamp": 1553147177238,
        "duration": 7658
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147185425,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147186043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147186043,
                "type": ""
            }
        ],
        "screenShotFile": "008c00ce-0087-002f-00a1-003f00220066.png",
        "timestamp": 1553147185221,
        "duration": 5573
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147191382,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147191966,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147191967,
                "type": ""
            }
        ],
        "screenShotFile": "000000ef-0070-0057-002f-008f0048002e.png",
        "timestamp": 1553147191179,
        "duration": 5383
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147197149,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147197751,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147197751,
                "type": ""
            }
        ],
        "screenShotFile": "004e0066-0012-0015-0042-0010004b0069.png",
        "timestamp": 1553147196943,
        "duration": 5509
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147203077,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147203643,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147203643,
                "type": ""
            }
        ],
        "screenShotFile": "00790005-0048-00b3-004a-005700090033.png",
        "timestamp": 1553147202849,
        "duration": 5385
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147208842,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147209427,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147209427,
                "type": ""
            }
        ],
        "screenShotFile": "0004001b-0099-00cf-009d-000800600039.png",
        "timestamp": 1553147208637,
        "duration": 5413
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "75656ba43f17b3ee6a8f8445c0b52392",
        "instanceId": 2569,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147214635,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147215162,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147215162,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147234289,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147234289,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/c3ad32c0-4b9c-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553147234290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147243529,
                "type": ""
            }
        ],
        "screenShotFile": "005700cf-0003-0036-00bd-001600380020.png",
        "timestamp": 1553147214443,
        "duration": 29077
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147543585,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147545232,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147545232,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.91/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147553323,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.91/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147553323,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.91/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147554021,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.91/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147554022,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147575512,
                "type": ""
            }
        ],
        "screenShotFile": "00320029-005c-002f-00f2-008b006d0027.png",
        "timestamp": 1553147542606,
        "duration": 32896
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147576374,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147576982,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147576982,
                "type": ""
            }
        ],
        "screenShotFile": "0076008a-009b-004a-0015-008500440037.png",
        "timestamp": 1553147576164,
        "duration": 7707
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147584414,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147585015,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147585015,
                "type": ""
            }
        ],
        "screenShotFile": "006c002a-0084-0055-007c-00d800970086.png",
        "timestamp": 1553147584194,
        "duration": 5613
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147590411,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147590984,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147590984,
                "type": ""
            }
        ],
        "screenShotFile": "0034006e-002c-00be-0024-00cb004e0026.png",
        "timestamp": 1553147590206,
        "duration": 5349
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147596163,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147596773,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147596774,
                "type": ""
            }
        ],
        "screenShotFile": "006800b2-003f-000d-0000-008300770063.png",
        "timestamp": 1553147595951,
        "duration": 5573
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147602136,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147602721,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147602721,
                "type": ""
            }
        ],
        "screenShotFile": "0081007b-0078-003a-001c-00ec002400ae.png",
        "timestamp": 1553147601924,
        "duration": 5399
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147607913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147608502,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147608502,
                "type": ""
            }
        ],
        "screenShotFile": "00b3003f-004f-00cb-0082-0065009c004e.png",
        "timestamp": 1553147607720,
        "duration": 5403
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "b85363886574e898e2debb40e321079b",
        "instanceId": 2645,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147613783,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147614401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147614402,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147633447,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147633447,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/b1a9ba70-4b9d-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553147633447,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147642676,
                "type": ""
            }
        ],
        "screenShotFile": "000400b4-0055-007b-000f-0018006c0087.png",
        "timestamp": 1553147613530,
        "duration": 29137
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=72.0.3626.121)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=72.0.3626.121)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.splashScreen (/Users/shafi/Desktop/WoovlyAutomation/signup.js:27:25)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:23:20)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147800260,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147802215,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147802216,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147807255,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147807255,
                "type": ""
            }
        ],
        "screenShotFile": "0033009c-007a-0095-0079-004000930054.png",
        "timestamp": 1553147797486,
        "duration": 9915
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:33:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147808289,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147808290,
                "type": ""
            }
        ],
        "screenShotFile": "0024003b-0039-00e4-0024-00df0077005b.png",
        "timestamp": 1553147807773,
        "duration": 3627
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:49:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147812370,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147812370,
                "type": ""
            }
        ],
        "screenShotFile": "00a90097-0057-0085-0093-007e004b008a.png",
        "timestamp": 1553147811914,
        "duration": 2406
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:64:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147815396,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147815396,
                "type": ""
            }
        ],
        "screenShotFile": "002f001e-0063-006d-00f7-0057005a0028.png",
        "timestamp": 1553147814997,
        "duration": 1250
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:74:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147818167,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147818168,
                "type": ""
            }
        ],
        "screenShotFile": "00620007-0013-00f5-00d7-005f005f00b7.png",
        "timestamp": 1553147817739,
        "duration": 2529
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:84:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147821169,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147821169,
                "type": ""
            }
        ],
        "screenShotFile": "00cf00e2-0034-0070-00f3-00ff00e900ef.png",
        "timestamp": 1553147820765,
        "duration": 2664
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:95:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147824418,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147824418,
                "type": ""
            }
        ],
        "screenShotFile": "002600dd-00b6-001f-00ee-0006009100fc.png",
        "timestamp": 1553147823996,
        "duration": 2111
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "e9482cd8b8661b9b33f08aa4fd27edfc",
        "instanceId": 2726,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:22:29)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:105:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:104:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147827574,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.92/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147827575,
                "type": ""
            }
        ],
        "screenShotFile": "00b10071-001b-00f3-007c-009300d600db.png",
        "timestamp": 1553147827141,
        "duration": 1346
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147874197,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147875819,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147875819,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.93/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147882895,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.93/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147882895,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.93/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147890361,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.93/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147890361,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147901704,
                "type": ""
            }
        ],
        "screenShotFile": "00b0001c-00ae-0009-0027-00560006009f.png",
        "timestamp": 1553147873341,
        "duration": 28356
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147902574,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147903148,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147903148,
                "type": ""
            }
        ],
        "screenShotFile": "006b009d-00a3-00dd-00a7-009f00ad00ee.png",
        "timestamp": 1553147902363,
        "duration": 7663
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147910550,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147911101,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147911102,
                "type": ""
            }
        ],
        "screenShotFile": "00da00b6-005a-00aa-0077-005b00350089.png",
        "timestamp": 1553147910352,
        "duration": 5508
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147916457,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147917043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147917044,
                "type": ""
            }
        ],
        "screenShotFile": "00fd00f1-0055-00bb-00be-000b009c00d4.png",
        "timestamp": 1553147916265,
        "duration": 5359
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147922234,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147922810,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147922811,
                "type": ""
            }
        ],
        "screenShotFile": "0032002a-00b1-004d-001b-006300ab0023.png",
        "timestamp": 1553147922028,
        "duration": 5498
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147928134,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553147928344,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553147928344,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553147928344,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553147928344,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147928706,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147928706,
                "type": ""
            }
        ],
        "screenShotFile": "008900e9-0004-0032-00fd-0055008700a1.png",
        "timestamp": 1553147927932,
        "duration": 5361
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147933901,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147934505,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147934506,
                "type": ""
            }
        ],
        "screenShotFile": "000c00e5-00ea-0058-000f-00e8003600f6.png",
        "timestamp": 1553147933699,
        "duration": 5390
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "a956d6e502851bfd2134c87328c0cc86",
        "instanceId": 2770,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147939667,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147940263,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553147940263,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147959593,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553147959593,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/7423f3e0-4b9e-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553147959593,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553147968813,
                "type": ""
            }
        ],
        "screenShotFile": "00fa0067-0020-0046-00e8-00b300ca00ab.png",
        "timestamp": 1553147939477,
        "duration": 29330
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149975268,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149976985,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149976985,
                "type": ""
            }
        ],
        "screenShotFile": "003300bf-0064-0034-00a0-00ab00350008.png",
        "timestamp": 1553149974203,
        "duration": 5096
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149980043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149980743,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149980743,
                "type": ""
            }
        ],
        "screenShotFile": "001f0073-0078-0017-009d-002800ef002b.png",
        "timestamp": 1553149979751,
        "duration": 3147
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149983530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149984120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149984121,
                "type": ""
            }
        ],
        "screenShotFile": "00cc000b-00dd-002e-007a-001b00b400e4.png",
        "timestamp": 1553149983296,
        "duration": 2939
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149986862,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149987438,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149987438,
                "type": ""
            }
        ],
        "screenShotFile": "005f00eb-008d-00a9-0052-004e001f0058.png",
        "timestamp": 1553149986639,
        "duration": 2958
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149990202,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149990790,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149990790,
                "type": ""
            }
        ],
        "screenShotFile": "00da0096-00da-00fd-006a-003500a100a1.png",
        "timestamp": 1553149989990,
        "duration": 2959
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149993565,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149994166,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149994167,
                "type": ""
            }
        ],
        "screenShotFile": "00db003c-0088-00e2-0029-004b003a0005.png",
        "timestamp": 1553149993353,
        "duration": 2963
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553149996928,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149997528,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553149997528,
                "type": ""
            }
        ],
        "screenShotFile": "002600a8-00ad-0028-0013-003a009d00fa.png",
        "timestamp": 1553149996702,
        "duration": 2989
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "53d9fd8f27c8157c230118ebbb660c75",
        "instanceId": 3197,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150000324,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150000951,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150000952,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150020369,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150020369,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/4062a5b0-4ba3-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553150020370,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150029667,
                "type": ""
            }
        ],
        "screenShotFile": "002e00a5-009a-005b-00c1-00c9008a0030.png",
        "timestamp": 1553150000088,
        "duration": 29571
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9c8811854a4ef55b59c5ddd66e2adcdd",
        "instanceId": 3259,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150130198,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150131889,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150131889,
                "type": ""
            }
        ],
        "screenShotFile": "004a000f-009d-00ab-00a8-0074004400c7.png",
        "timestamp": 1553150129329,
        "duration": 4851
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9c8811854a4ef55b59c5ddd66e2adcdd",
        "instanceId": 3259,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150134891,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150135533,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150135533,
                "type": ""
            }
        ],
        "screenShotFile": "0006001c-00b2-0080-0082-0022004900c7.png",
        "timestamp": 1553150134622,
        "duration": 3065
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9c8811854a4ef55b59c5ddd66e2adcdd",
        "instanceId": 3259,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150138286,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150138879,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150138880,
                "type": ""
            }
        ],
        "screenShotFile": "00320017-0019-00e0-0001-00b0001000b4.png",
        "timestamp": 1553150138082,
        "duration": 2915
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9c8811854a4ef55b59c5ddd66e2adcdd",
        "instanceId": 3259,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150141586,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150142188,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150142188,
                "type": ""
            }
        ],
        "screenShotFile": "00b40042-00a9-004c-00a7-00a2005c004a.png",
        "timestamp": 1553150141389,
        "duration": 2958
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9c8811854a4ef55b59c5ddd66e2adcdd",
        "instanceId": 3259,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150144958,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150145543,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150145544,
                "type": ""
            }
        ],
        "screenShotFile": "008b000b-0034-0057-0048-00b900cd00be.png",
        "timestamp": 1553150144738,
        "duration": 2962
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fe0ac3239ad068a8013d14d8b82c04fd",
        "instanceId": 3320,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150237274,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150239198,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150239199,
                "type": ""
            }
        ],
        "screenShotFile": "00db0083-00d6-00f4-0083-000b00eb001a.png",
        "timestamp": 1553150236398,
        "duration": 5075
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fe0ac3239ad068a8013d14d8b82c04fd",
        "instanceId": 3320,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150242187,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150242830,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150242830,
                "type": ""
            }
        ],
        "screenShotFile": "00c500a1-0008-00a9-004b-006400860042.png",
        "timestamp": 1553150241919,
        "duration": 3094
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fe0ac3239ad068a8013d14d8b82c04fd",
        "instanceId": 3320,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150245631,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150246195,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150246196,
                "type": ""
            }
        ],
        "screenShotFile": "00af0017-0064-0034-00d8-008800b900c4.png",
        "timestamp": 1553150245412,
        "duration": 2890
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "fe0ac3239ad068a8013d14d8b82c04fd",
        "instanceId": 3320,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150248928,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150249513,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150249513,
                "type": ""
            }
        ],
        "screenShotFile": "009300c2-0028-000c-0022-007b005b0039.png",
        "timestamp": 1553150248701,
        "duration": 2978
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150368027,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150369796,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150369796,
                "type": ""
            }
        ],
        "screenShotFile": "0098003a-000c-0004-00d5-00a300f40022.png",
        "timestamp": 1553150366717,
        "duration": 5361
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150372793,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150373443,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150373444,
                "type": ""
            }
        ],
        "screenShotFile": "00e5007b-0073-0070-00eb-004d00b5006f.png",
        "timestamp": 1553150372500,
        "duration": 3117
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150376245,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150376843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150376843,
                "type": ""
            }
        ],
        "screenShotFile": "00d0006d-00d0-00c2-0032-004b00a300c2.png",
        "timestamp": 1553150376012,
        "duration": 2945
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150379600,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150380280,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150380280,
                "type": ""
            }
        ],
        "screenShotFile": "0091006f-0088-00d6-00bb-0093009c005f.png",
        "timestamp": 1553150379363,
        "duration": 3070
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150383062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150383728,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150383728,
                "type": ""
            }
        ],
        "screenShotFile": "00ff0078-0024-00bb-00bc-009200d300c7.png",
        "timestamp": 1553150382825,
        "duration": 3059
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150386509,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150387145,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150387146,
                "type": ""
            }
        ],
        "screenShotFile": "003400af-00a8-006e-001e-009300ca0005.png",
        "timestamp": 1553150386279,
        "duration": 3022
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2157:16)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.sendKeys (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2174:19)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.signUp (/Users/shafi/Desktop/WoovlyAutomation/signup.js:5:32)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150389923,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150390512,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150390512,
                "type": ""
            }
        ],
        "screenShotFile": "0018004f-0014-00a4-002e-005600da0005.png",
        "timestamp": 1553150389695,
        "duration": 2983
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c76f0960fda914c251501ea75b45dadf",
        "instanceId": 3372,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150393313,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150393934,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150393934,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150413418,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150413418,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/2abfbf80-4ba4-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553150413419,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150422753,
                "type": ""
            }
        ],
        "screenShotFile": "007400f8-0038-0034-00d3-0063003e0004.png",
        "timestamp": 1553150393081,
        "duration": 29665
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150552200,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150554105,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150554105,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.94/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150561210,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.94/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150561210,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.94/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150561840,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.94/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150561840,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150580834,
                "type": ""
            }
        ],
        "screenShotFile": "005f003a-00a6-004a-0093-007800110068.png",
        "timestamp": 1553150551359,
        "duration": 29466
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150581751,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150582386,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150582386,
                "type": ""
            }
        ],
        "screenShotFile": "00ec0031-004d-0051-0095-000300f4001b.png",
        "timestamp": 1553150581523,
        "duration": 7737
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150589803,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150590410,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150590410,
                "type": ""
            }
        ],
        "screenShotFile": "00d3002a-00a6-0001-00af-00bc009a00e0.png",
        "timestamp": 1553150589600,
        "duration": 5590
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150595800,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150596383,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150596383,
                "type": ""
            }
        ],
        "screenShotFile": "00e60056-00cf-0046-00c9-004b0010007e.png",
        "timestamp": 1553150595603,
        "duration": 5347
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150601563,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150602120,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150602120,
                "type": ""
            }
        ],
        "screenShotFile": "007b0082-0057-003a-00a8-000200c500bc.png",
        "timestamp": 1553150601361,
        "duration": 5449
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150607443,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150608008,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150608008,
                "type": ""
            }
        ],
        "screenShotFile": "0090007f-0053-00a2-0007-0012001c0059.png",
        "timestamp": 1553150607237,
        "duration": 5356
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150613501,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150614036,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150614037,
                "type": ""
            }
        ],
        "screenShotFile": "000c00ba-00a0-0076-00eb-00bf00180066.png",
        "timestamp": 1553150613288,
        "duration": 5316
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "88220e8567560fa0d37bc6b7e8edc411",
        "instanceId": 3444,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150619187,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150619758,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553150619758,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150639052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553150639052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/b1374560-4ba4-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553150639052,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553150648288,
                "type": ""
            }
        ],
        "screenShotFile": "00b300db-002d-0066-000e-008f009300c9.png",
        "timestamp": 1553150618998,
        "duration": 29281
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:14:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005200d2-00c7-00a4-000d-007e00d90019.png",
        "timestamp": 1553151304467,
        "duration": 1610
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:33:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00780020-0057-005f-0013-00c70029003f.png",
        "timestamp": 1553151306452,
        "duration": 220
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:49:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bd001c-0025-0019-006d-007900bb004c.png",
        "timestamp": 1553151306981,
        "duration": 211
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:64:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00c300f2-00be-002b-00b3-00e200ec00a0.png",
        "timestamp": 1553151307532,
        "duration": 246
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:74:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004a003e-0011-0027-00b0-001400fd009a.png",
        "timestamp": 1553151308081,
        "duration": 205
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:84:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0006005d-0002-0008-00ac-005c00f20016.png",
        "timestamp": 1553151308593,
        "duration": 210
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:95:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a0003e-001f-007f-0035-00a300db007c.png",
        "timestamp": 1553151309121,
        "duration": 198
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "4f2b6b0577e7be296716e584d5aed851",
        "instanceId": 3627,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:105:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:104:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00080035-0065-009e-009e-00c900220074.png",
        "timestamp": 1553151309625,
        "duration": 223
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: offer is not defined"
        ],
        "trace": [
            "ReferenceError: offer is not defined\n    at doLogin.offerClose (/Users/shafi/Desktop/WoovlyAutomation/login.js:15:5)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:25:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151361805,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151363501,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151363501,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151370592,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151370592,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151371397,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151371398,
                "type": ""
            }
        ],
        "screenShotFile": "005a00a0-0087-005c-007a-0002009f00b7.png",
        "timestamp": 1553151360055,
        "duration": 21404
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:33:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151382444,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151382445,
                "type": ""
            }
        ],
        "screenShotFile": "000a00e5-0075-00aa-0023-00c600df00e0.png",
        "timestamp": 1553151381968,
        "duration": 1827
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:49:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151385678,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151385678,
                "type": ""
            }
        ],
        "screenShotFile": "008800a9-0043-0068-008e-00a100df00dd.png",
        "timestamp": 1553151385179,
        "duration": 2892
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:64:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151389069,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151389070,
                "type": ""
            }
        ],
        "screenShotFile": "00ac0001-0089-0003-00d1-000900430010.png",
        "timestamp": 1553151388622,
        "duration": 2650
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:74:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151392292,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151392292,
                "type": ""
            }
        ],
        "screenShotFile": "00880073-0084-0004-006d-009200a40039.png",
        "timestamp": 1553151391833,
        "duration": 2616
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:84:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151395684,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151395685,
                "type": ""
            }
        ],
        "screenShotFile": "00ca0097-0018-0084-0009-00ba00cf00f1.png",
        "timestamp": 1553151395229,
        "duration": 2563
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:95:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151399050,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151399050,
                "type": ""
            }
        ],
        "screenShotFile": "00da0076-00d3-0049-00d3-00bc00de003d.png",
        "timestamp": 1553151398612,
        "duration": 2567
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "941d563c89901818dec0cf509fb4aca8",
        "instanceId": 3679,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:105:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:104:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151402476,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.95/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151402476,
                "type": ""
            }
        ],
        "screenShotFile": "007100ee-00e2-0074-007d-00a40020009a.png",
        "timestamp": 1553151401973,
        "duration": 2653
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ae4fb96b81989ec17f7f1cb1b924b8e",
        "instanceId": 3727,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: offer is not defined"
        ],
        "trace": [
            "ReferenceError: offer is not defined\n    at doLogin.offerClose (/Users/shafi/Desktop/WoovlyAutomation/login.js:15:5)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:25:19)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151575860,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151577737,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151577737,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151584766,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151584766,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151585492,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151585493,
                "type": ""
            }
        ],
        "screenShotFile": "0071000c-006c-00d6-001d-001100c7003d.png",
        "timestamp": 1553151574855,
        "duration": 22718
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ae4fb96b81989ec17f7f1cb1b924b8e",
        "instanceId": 3727,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:33:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151598536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151598537,
                "type": ""
            }
        ],
        "screenShotFile": "00e30029-00c4-005a-004d-00e4000900bf.png",
        "timestamp": 1553151598095,
        "duration": 2146
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "9ae4fb96b81989ec17f7f1cb1b924b8e",
        "instanceId": 3727,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:49:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151601716,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.96/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151601717,
                "type": ""
            }
        ],
        "screenShotFile": "00820070-0075-000a-0061-00d50002003d.png",
        "timestamp": 1553151601000,
        "duration": 2933
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151820710,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151822416,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151822416,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.97/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151829478,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.97/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151829479,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.97/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151837011,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.97/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151837012,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151848386,
                "type": ""
            }
        ],
        "screenShotFile": "006300ec-0001-00be-001c-00f7002c000d.png",
        "timestamp": 1553151819830,
        "duration": 28546
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151849275,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151849857,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151849857,
                "type": ""
            }
        ],
        "screenShotFile": "00da0084-0099-0050-00fe-0033008700a8.png",
        "timestamp": 1553151849072,
        "duration": 7635
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151857264,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151857976,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151857977,
                "type": ""
            }
        ],
        "screenShotFile": "001d007a-0054-0002-0062-004300eb0051.png",
        "timestamp": 1553151857058,
        "duration": 5686
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151863373,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151863957,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151863957,
                "type": ""
            }
        ],
        "screenShotFile": "006e0048-00a1-00ec-0099-00da006e00a4.png",
        "timestamp": 1553151863161,
        "duration": 5416
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151869176,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151869708,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151869708,
                "type": ""
            }
        ],
        "screenShotFile": "00750024-00a7-0093-007a-008100590024.png",
        "timestamp": 1553151868980,
        "duration": 5449
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151875055,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151875658,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151875658,
                "type": ""
            }
        ],
        "screenShotFile": "00fe0062-0071-0035-0046-001f001e004e.png",
        "timestamp": 1553151874844,
        "duration": 5387
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151880855,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151881459,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151881459,
                "type": ""
            }
        ],
        "screenShotFile": "00370099-00b5-0013-0045-00d6007100d0.png",
        "timestamp": 1553151880641,
        "duration": 5398
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "55c20c57443920ccc10f040debf3c50b",
        "instanceId": 3784,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151886647,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151887242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151887242,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151906895,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151906895,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/a4cc8800-4ba7-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553151906896,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151916135,
                "type": ""
            }
        ],
        "screenShotFile": "006c0036-0096-00a4-0025-00a200ea0056.png",
        "timestamp": 1553151886449,
        "duration": 29680
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151944238,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151946338,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151946338,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.98/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151953375,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.98/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151953375,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.98/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151960862,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.98/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553151960862,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151972193,
                "type": ""
            }
        ],
        "screenShotFile": "00c40019-00c8-00d7-00fd-00a50019006a.png",
        "timestamp": 1553151942947,
        "duration": 29236
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151973134,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151973756,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151973757,
                "type": ""
            }
        ],
        "screenShotFile": "007900af-000b-007b-0035-002b00f300f9.png",
        "timestamp": 1553151972898,
        "duration": 7720
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151981174,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151981771,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151981771,
                "type": ""
            }
        ],
        "screenShotFile": "005400ec-00b7-00a1-0024-007100ea0008.png",
        "timestamp": 1553151980966,
        "duration": 5540
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151987136,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151987701,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151987701,
                "type": ""
            }
        ],
        "screenShotFile": "0057001a-00fe-0092-0006-006d006e0018.png",
        "timestamp": 1553151986933,
        "duration": 5324
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151992926,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151993485,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151993485,
                "type": ""
            }
        ],
        "screenShotFile": "00c000d4-00ab-00e8-00ae-008800160071.png",
        "timestamp": 1553151992703,
        "duration": 5513
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553151998850,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151999420,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553151999421,
                "type": ""
            }
        ],
        "screenShotFile": "00dc00c7-00dd-00f6-0012-001700fe004c.png",
        "timestamp": 1553151998632,
        "duration": 5345
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553152004617,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553152005207,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553152005207,
                "type": ""
            }
        ],
        "screenShotFile": "000900e4-004f-00ef-0023-00ea00fb00b6.png",
        "timestamp": 1553152004399,
        "duration": 5378
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "dc8936223d15505ad9a21191326216f8",
        "instanceId": 3843,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553152010396,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553152010966,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553152010966,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553152030199,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553152030199,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/ee48c980-4ba7-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553152030200,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553152039424,
                "type": ""
            }
        ],
        "screenShotFile": "00c800fb-002c-0071-00e4-00e600d7005e.png",
        "timestamp": 1553152010188,
        "duration": 29231
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=72.0.3626.121)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=72.0.3626.121)\n  (Driver info: chromedriver=2.46.628411 (3324f4c8be9ff2f70a05a30ebc72ffb013e1a71e),platform=Mac OS X 10.14.3 x86_64)\n    at Object.checkLegacyResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/error.js:546:15)\n    at parseHttpResponse (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:509:13)\n    at doSend.then.response (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/http.js:441:30)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:807:17)\n    at WebElement.schedule_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2010:25)\n    at WebElement.click (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/webdriver.js:2092:17)\n    at actionFn (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:461:65)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doSignup.splashScreen (/Users/shafi/Desktop/WoovlyAutomation/signup.js:16:40)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:23:20)\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)\nFrom: Task: Run it(\"TestTestCase 1:-Sign Up with all valid data\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:13:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553173402682,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553173406934,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553173406935,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173413937,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173413937,
                "type": ""
            }
        ],
        "screenShotFile": "009a006c-0052-0020-009d-00a7001a0035.png",
        "timestamp": 1553173401282,
        "duration": 13030
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:33:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 2:- Sign Up with all valid data expect Invalid email id  \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:32:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173415279,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173415281,
                "type": ""
            }
        ],
        "screenShotFile": "00910047-0077-0013-00f5-007200a7006a.png",
        "timestamp": 1553173414736,
        "duration": 2713
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:49:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 3:- Sign Up with all valid data and empty Full name \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:48:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173419043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173419044,
                "type": ""
            }
        ],
        "screenShotFile": "00120020-00a9-004a-0039-0092001d000e.png",
        "timestamp": 1553173418485,
        "duration": 2651
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:64:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 4:- Sign Up with all valid data and empty email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:63:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173422463,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173422464,
                "type": ""
            }
        ],
        "screenShotFile": "00ed00a2-006f-0005-00d9-0059001000fb.png",
        "timestamp": 1553173421934,
        "duration": 1796
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:74:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 5:-Sign Up with all valid data and empty password \") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:73:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173425672,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173425672,
                "type": ""
            }
        ],
        "screenShotFile": "001b002e-0045-00f5-0011-00e700080017.png",
        "timestamp": 1553173425183,
        "duration": 2386
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:84:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 6:- Sign Up with all valid data and  empty DOB\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:83:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173428804,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173428804,
                "type": ""
            }
        ],
        "screenShotFile": "003b00b2-002b-00b2-0014-00de00320002.png",
        "timestamp": 1553173428349,
        "duration": 1269
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:95:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 7:- Sign Up with all valid data and already existing email id\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:94:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173431608,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173431608,
                "type": ""
            }
        ],
        "screenShotFile": "00590086-0099-0006-00e5-005200b40047.png",
        "timestamp": 1553173431033,
        "duration": 2337
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "c2711745d66f9e9b884d8ae56670f38b",
        "instanceId": 4221,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"contHt\"]/div[1]/div[2]/div[9]/div[1]/div[2])\n    at elementArrayFinder.getWebElements.then (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:814:27)\n    at ManagedPromise.invokeCallback_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at process.internalTickCallback (internal/process/next_tick.js:77:7)Error\n    at ElementArrayFinder.applyAction_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/built/element.js:831:22)\n    at doLogin.loginSignupLink (/Users/shafi/Desktop/WoovlyAutomation/login.js:12:43)\n    at UserContext.it (/Users/shafi/Desktop/WoovlyAutomation/spec.js:105:19)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:112:25\n    at new ManagedPromise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:1077:7)\n    at ControlFlow.promise (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2505:12)\n    at schedulerExecute (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:95:18)\n    at TaskQueue.execute_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:3084:14)\nFrom: Task: Run it(\"TestCase 8:-Sign Up with Facebook\") in control flow\n    at UserContext.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /Users/shafi/Desktop/WoovlyAutomation/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/Users/shafi/Desktop/WoovlyAutomation/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:104:3)\n    at addSpecsToSuite (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/Users/shafi/Desktop/WoovlyAutomation/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/Users/shafi/Desktop/WoovlyAutomation/spec.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:707:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:718:10)\n    at Module.load (internal/modules/cjs/loader.js:605:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:544:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173434871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.99/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553173434872,
                "type": ""
            }
        ],
        "screenShotFile": "00ea0031-00c8-00f7-00c2-00f50075004f.png",
        "timestamp": 1553173434345,
        "duration": 1771
    },
    {
        "description": "TestTestCase 1:-Sign Up with all valid data|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174627776,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174629730,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174629731,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.100/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174636816,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.100/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174636816,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.100/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174644294,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.100/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174644294,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174655676,
                "type": ""
            }
        ],
        "screenShotFile": "00f4009d-0051-0081-0095-0036008b00d1.png",
        "timestamp": 1553174625474,
        "duration": 30190
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174656629,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174657173,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174657173,
                "type": ""
            }
        ],
        "screenShotFile": "0059009f-00f3-001c-006c-000e003300d1.png",
        "timestamp": 1553174656414,
        "duration": 7625
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174664597,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174665210,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174665210,
                "type": ""
            }
        ],
        "screenShotFile": "000200c0-00b9-00cc-0060-002d00800068.png",
        "timestamp": 1553174664391,
        "duration": 5574
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174670609,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553174670845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553174670845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553174670845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.UtDiO6843iM.O/m=client/rt=j/sv=1/d=1/ed=1/am=wQ/rs=AGLTcCM20fpKUSeCZzGz28OficBNcovzNg/cb=gapi.loaded_0 609 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1553174670845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174671213,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174671213,
                "type": ""
            }
        ],
        "screenShotFile": "00960008-00f9-00bb-00c6-00b1000e003d.png",
        "timestamp": 1553174670396,
        "duration": 5389
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174676421,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174677030,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174677030,
                "type": ""
            }
        ],
        "screenShotFile": "00110023-004d-005b-0097-00d8005d00e4.png",
        "timestamp": 1553174676209,
        "duration": 5569
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174682409,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174683014,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174683014,
                "type": ""
            }
        ],
        "screenShotFile": "005b00aa-00d9-00e0-00af-00b3003200ca.png",
        "timestamp": 1553174682197,
        "duration": 5411
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174688253,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174688870,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174688871,
                "type": ""
            }
        ],
        "screenShotFile": "00de00fd-003e-004d-0016-008e00440006.png",
        "timestamp": 1553174688035,
        "duration": 5414
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "sessionId": "96218c2ff7ca439450f8000cb0154c2b",
        "instanceId": 4642,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.121"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174694055,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174694617,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553174694618,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174714172,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553174714172,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds - Mixed Content: The page at 'https://alpha.woovly.com/shivam.186/feeds' was loaded over HTTPS, but requested an insecure image 'http://images.woovly.com.s3-website.ap-south-1.amazonaws.com/w_200/bf093210-4bdc-11e9-bcbc-db258748901b.jpg'. This content should also be served over HTTPS.",
                "timestamp": 1553174714174,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4091 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553174723433,
                "type": ""
            }
        ],
        "screenShotFile": "000b005c-00a9-00cb-00c2-00cc00f700cf.png",
        "timestamp": 1553174693851,
        "duration": 29574
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

