angular.module('ako977.token-session-service',['localStorageService'])

    //set the session service and session injector factories; They deal with applying any apikey present in sessionservice to header of http requests
    .service('Ako977SessionService', ['$window','$interval','$filter','$http','localStorageService',
        function($window, $interval, $filter, $http, localStorageService) {
        var $this = this;
        var stop;
        $this.config = {
            apiKeyName: 'ako977ApiKey',
            customDataName: 'ako977CustomData',
            tokenTimestamp: 'ako977TokenTimestamp',
            tokenTimeout: 8, //in hours
            apiKey: null,
            injectorCallback: null,
            headerTitle: 'x-wsse',
            headerContent: function() {
                return 'AuthenticationToken ApiKey="'+ $this.apiKey +'", Created="'+ (new Date().toUTCString()) +'"';
            }
        };

        $this.monitor = function(config) {
            config = {
                apiUrl: null,
                apiMethod: 'GET',
                errorCallback: null,
                successCallback: null,
                params: {},
                delay: 5 //in minutes
            };

            stop = $interval( function() {
                $http({
                    method: monitoredApiMethod,
                    url: monitoredUrl,
                    params: params
                })
                .error(function(response,statusCode) {
                    $interval.cancel(stop);
                    if (typeof config.errorCallback === 'function') {
                        config.errorCallback(response,statusCode);
                    }
                })
                .success(function(data) {
                    if (typeof config.successCallback === 'function') {
                        config.successCallback(data);
                    }
                });
            },(1000 * 60 * config.delay));
        };

        $this.stop = function() {
            $interval.cancel(stop);
        };

        $this.init = function(args) {
            localStorageService.set($this.config.apiKeyName, args.apiKey);
            localStorageService.set($this.config.customDataName, args.customData);
            var timestamp = new Date().addHours($this.config.tokenTimeout);
            timestamp = Date.parse(timestamp.toISOString());
            localStorageService.set($this.config.tokenTimestamp, timestamp);
            $this.monitor(args);
        };

    }])
    .factory('ako977SessionInjector', ['Ako977SessionService', function(Ako977SessionService) {
        return {
            request: function(config) {
                var callbackResult = true;
                if (typeof Ako977SessionService.config.injectorCallback === 'function') {
                    callbackResult = Ako977SessionService.config.injectorCallback(config);
                }
                if ( Ako977SessionService.config.apiKey && Ako977SessionService.config.apiKey !== null &&
                    typeof Ako977SessionService.config.apiKey !== 'undefined' && callbackResult === true) {
                    config.headers[Ako977SessionService.config.headerTitle] = ( typeof Ako977SessionService.config.headerContent === 'function' ? Ako977SessionService.config.headerContent() : Ako977SessionService.config.headerContent );
                }
                return config;
            }
        };
    }])
    .config(['$httpProvider', function($httpProvider) {
        $httpProvider.interceptors.push('ako977SessionInjector');
    }]);