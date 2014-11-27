angular.module('ako977.token-session-service',['LocalStorageModule'])

    //set the session service and session injector factories; They deal with applying any apikey present in sessionservice to header of http requests
    .provider('Ako977SessionService', function Ako977SessionServiceProvider() {

        var config = {
            apiKeyName: 'ako977ApiKey',
            customDataName: 'ako977CustomData',
            tokenTimestampName: 'ako977TokenTimestamp',
            tokenExpireLength: 8, //in hours
            apiKey: null,
            customData: null,
            injectorCallback: null,
            verifyInitCallback: true,
            initCallback: null,
            headerTitle: 'x-wsse',
            headerContent: function(apiKey) {
                return 'AuthenticationToken ApiKey="'+ apiKey +'", Created="'+ (new Date().toUTCString()) +'"';
            }
        };

        //set your own custom config object with this function in the Angular <App module>.config function of your app
        this.configure = function(customConfig) {
            config = angular.extend(config,customConfig);
        };

        this.$get = ['$window','$interval','$filter','localStorageService',
            function Ako977SessionServiceFactory($window, $interval, $filter, localStorageService) {
                var Ako977SessionService = {};
                var stop;

                Ako977SessionService.config = config;

                //get data directly from local storage
                Ako977SessionService.getApiKey = function() {
                  return localStorageService.get(Ako977SessionService.config.apiKeyName);
                };

                Ako977SessionService.getCustomData = function() {
                    return localStorageService.get(Ako977SessionService.config.customDataName);
                };

                Ako977SessionService.getTokenTimestamp = function() {
                    return localStorageService.get(Ako977SessionService.config.tokenTimestampName);
                };

                Ako977SessionService.init = function() {
                    Ako977SessionService.config.apiKey = Ako977SessionService.getApiKey();
                    Ako977SessionService.config.customData = Ako977SessionService.getCustomData();
                    var tokenTimestamp = Ako977SessionService.getTokenTimestamp();

                    var currentTimestamp = new Date();
                    currentTimestamp = Date.parse(currentTimestamp.toISOString());
                    var verifyInitCallback = typeof Ako977SessionService.config.verifyInitCallback === 'function' ? Ako977SessionService.config.verifyInitCallback() : Ako977SessionService.config.verifyInitCallback;

                    if (Ako977SessionService.config.apiKey !== null && verifyInitCallback === true && tokenTimestamp >= currentTimestamp) {
                        if (typeof Ako977SessionService.config.initCallback === 'function') {
                            Ako977SessionService.config.initCallback();
                        }
                    } else {
                        Ako977SessionService.clear();
                    }
                };

                Ako977SessionService.monitor = function(args,$http) {
                    localStorageService.set(Ako977SessionService.config.apiKeyName, args.apiKey);
                    localStorageService.set(Ako977SessionService.config.customDataName, args.customData);
                    var timestamp = new Date().addHours(Ako977SessionService.config.tokenExpireLength);
                    timestamp = Date.parse(timestamp.toISOString());
                    localStorageService.set(Ako977SessionService.config.tokenTimestampName, timestamp);
                    Ako977SessionService.config.apiKey = args.apiKey;
                    Ako977SessionService.beginMonitor(args, $http);
                };

                Ako977SessionService.beginMonitor = function(monitorConfig, $http) {
                    monitorConfig = angular.extend({
                        apiUrl: null,
                        apiMethod: 'GET',
                        errorCallback: null,
                        successCallback: null,
                        params: {},
                        delay: 5 //in minutes
                    }, monitorConfig);

                    stop = $interval( function() {
                        $http({
                            method: monitorConfig.apiMethod,
                            url: monitorConfig.apiUrl,
                            params: monitorConfig.params
                        })
                        .error(function(data, status, headers, config) {
                            $interval.cancel(stop);
                            if (typeof monitorConfig.errorCallback === 'function') {
                                monitorConfig.errorCallback(data, status, headers, config);
                            }
                        })
                        .success(function(data, status, headers, config) {
                            if (typeof monitorConfig.successCallback === 'function') {
                                monitorConfig.successCallback(data, status, headers, config);
                            }
                        });
                    },(1000 * 60 * monitorConfig.delay));
                };

                Ako977SessionService.stop = function() {
                    $interval.cancel(stop);
                };

                //stop any interval monitor activity, clear session data
                Ako977SessionService.clear = function() {
                    Ako977SessionService.config.apiKey = null;
                    Ako977SessionService.config.customData = null;
                    localStorageService.clearAll();
                    Ako977SessionService.stop();
                };

                return Ako977SessionService;
            }];
    })
    .factory('ako977SessionInjector', ['Ako977SessionService', function(Ako977SessionService) {
        return {
            request: function(config) {
                var callbackResult = true;
                if (typeof Ako977SessionService.config.injectorCallback === 'function') {
                    callbackResult = Ako977SessionService.config.injectorCallback(config);
                }
                if ( Ako977SessionService.config.apiKey && Ako977SessionService.config.apiKey !== null &&
                    typeof Ako977SessionService.config.apiKey !== 'undefined' && callbackResult === true) {
                    config.headers[Ako977SessionService.config.headerTitle] = ( typeof Ako977SessionService.config.headerContent === 'function' ? Ako977SessionService.config.headerContent(Ako977SessionService.config.apiKey) : Ako977SessionService.config.headerContent );
                }
                return config;
            }
        };
    }])
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.interceptors.push('ako977SessionInjector');
    }]);