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
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086159186,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086160699,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086160699,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.75/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086164542,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.75/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086164542,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.75/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086171956,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shafi.75/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086171956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553086171957,
                "type": ""
            }
        ],
        "screenShotFile": "007200ef-00d3-0055-00b8-0099009600c8.png",
        "timestamp": 1553086150374,
        "duration": 25181
    },
    {
        "description": "TestCase 2:- Sign Up with all valid data expect Invalid email id  |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086176027,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086176706,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086176708,
                "type": ""
            }
        ],
        "screenShotFile": "007100b9-0029-0091-0092-006800720000.png",
        "timestamp": 1553086175843,
        "duration": 1700
    },
    {
        "description": "TestCase 3:- Sign Up with all valid data and empty Full name |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086178044,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086178757,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086178758,
                "type": ""
            }
        ],
        "screenShotFile": "007a000b-001e-0090-00bb-007e007600a7.png",
        "timestamp": 1553086177882,
        "duration": 1585
    },
    {
        "description": "TestCase 4:- Sign Up with all valid data and empty email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086179965,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086180696,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086180697,
                "type": ""
            }
        ],
        "screenShotFile": "00d200b4-00c5-00ab-00ca-00ca001e0062.png",
        "timestamp": 1553086179800,
        "duration": 2031
    },
    {
        "description": "TestCase 5:-Sign Up with all valid data and empty password |Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086182345,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086183028,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086183028,
                "type": ""
            }
        ],
        "screenShotFile": "00f7002f-0002-009e-0088-001b00b7009f.png",
        "timestamp": 1553086182215,
        "duration": 1515
    },
    {
        "description": "TestCase 6:- Sign Up with all valid data and  empty DOB|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086184200,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086184746,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086184746,
                "type": ""
            }
        ],
        "screenShotFile": "00ed00f0-0091-007c-00ee-002a003400f6.png",
        "timestamp": 1553086184046,
        "duration": 1445
    },
    {
        "description": "TestCase 7:- Sign Up with all valid data and already existing email id|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086185944,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086186652,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086186652,
                "type": ""
            }
        ],
        "screenShotFile": "0087009d-0019-0067-00df-005c00c500ac.png",
        "timestamp": 1553086185783,
        "duration": 1337
    },
    {
        "description": "TestCase 8:-Sign Up with Facebook|Sign Up",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "sessionId": "48965e144e01b9d4a0772c521265e3cc",
        "instanceId": 10766,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.96"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/js/Precommon.js?v=4087 43 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1553086187591,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086188290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js 2 Mixed Content: The page at 'https://alpha.woovly.com/' was loaded over HTTPS, but requested an insecure image 'http://d3mzj1v5onbwd7.cloudfront.net/staticNew/img/down_arrow_white.svg'. This content should also be served over HTTPS.",
                "timestamp": 1553086188291,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086203746,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://alpha.woovly.com/shivam.186/feeds 3551 A parser-blocking, cross site (i.e. different eTLD+1) script, https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js, is invoked via document.write. The network request for this script MAY be blocked by the browser in this or a future page load due to poor network connectivity. If blocked in this page load, it will be confirmed in a subsequent console message. See https://www.chromestatus.com/feature/5718547946799104 for more details.",
                "timestamp": 1553086203746,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://videos.woovly.com/assets/bb2df880-f39c-11e8-a98d-1b3aafea3471.mp4/Thumbnails/bb2df880-f39c-11e8-a98d-1b3aafea3471.0000001.jpg - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1553086203746,
                "type": ""
            }
        ],
        "screenShotFile": "006c0005-001c-0077-00aa-00a300680046.png",
        "timestamp": 1553086187451,
        "duration": 19534
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

