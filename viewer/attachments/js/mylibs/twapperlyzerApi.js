(function (twapperlyzerApi, $, undefined) {

	var errorDataproviderUrl = "Dataprovider URL is not valid",
	    errorYtkUrl = "ytk Url is not valid";

	twapperlyzerApi.testAPI = function (dataprovider, callback) {

		var jsonpTestAPI = $.ajax({
			url: 'http://' + dataprovider + '/testAPI?callback=?',
			dataType: "jsonp",
			timeout: 1000
		});

		jsonpTestAPI.success(function (data) {
			if (data.status === "ok") {
				callback(null, data);
			} else {
				callback(errorDataproviderUrl, null);
			}
		});
		jsonpTestAPI.error(function () {
			callback(errorDataproviderUrl, null);
		});
	};
	twapperlyzerApi.getArchiveList = function (ytkUrl, dataprovider, callback) {

		var jsonpGetArchiveList = $.ajax({
			dataType: 'jsonp',
			data: "ytkUrl=" + ytkUrl,
			jsonp: 'callback',
			url: 'http://' + dataprovider + '/getArchiveList?callback=?',
			timeout: 1000
		});

		jsonpGetArchiveList.success(function (data) {
			if (data.status === "ok") {
				callback(null, data.data);
			} else {
				callback(data, null);
			}
		});
		jsonpGetArchiveList.error(function () {
			callback(errorYtkUrl, null);
		});
	};
	twapperlyzerApi.testConfig = function (dataprovider, ytkUrl, callback) {
		twapperlyzerApi.testAPI(dataprovider, function (err, result) {
			if (err !== null) {
				callback(err, null);
			} else {
				twapperlyzerApi.getArchiveList(ytkUrl, dataprovider, function (err, result) {
					if (err !== null) {
						callback(err, null);
					} else {
						callback(null, result);
					}
				});
			}
		});
	};
	function serializeToURLEncoding(obj, prefix) {
		var str = [];
		for (var p in obj) {
			var k = prefix ? prefix + "[" + p + "]" : p,
			v = obj[p];
			str.push(typeof v === "object" ? serializeToURLEncoding(v, k) : encodeURIComponent(k) + "=" + encodeURIComponent(v));
		}
		return str.join("&");
	}
	function twapperlizerCall(selectedArchive, dbconfig, dataprovider, apiFunction, callback) {
		$.ajax({
			dataType: 'jsonp',
			data: selectedArchive + "&" + serializeToURLEncoding(dbconfig),
			jsonp: 'callback',
			url: 'http://' + dataprovider + '/' + apiFunction + '?callback=?',
			success: function (data) {
				if (data.status === "ok") {
					callback(null, data);
				} else {
					callback(data, null);
				}
			}
		});
	}
	twapperlyzerApi.analyseArchive = function (selectedArchive, dbconfig, dataprovider, callback) {
		twapperlizerCall(selectedArchive, dbconfig, dataprovider, "analyseArchive", callback);
	};
	twapperlyzerApi.updateArchive = function (selectedArchive, dbconfig, dataprovider, callback) {
		twapperlizerCall(selectedArchive, dbconfig, dataprovider, "updateArchive", callback);
	};
	twapperlyzerApi.createOrUpdateArchive = function (selectedArchive, dbconfig, dataprovider, callback) {
		twapperlizerCall(selectedArchive, dbconfig, dataprovider, "createOrUpdateArchive", callback);
	};
	twapperlyzerApi.getMsgs = function (lastID, limit, ytkUrl, id, dataprovider, callback) {
		$.ajax({
			dataType: 'jsonp',
			data: "ytkUrl=" + ytkUrl + "&l=" + limit + "&id=" + id + "&lastID=" + lastID,
			jsonp: 'callback',
			url: 'http://' + dataprovider + '/getMsgs?callback=?',
			success: function (data) {
				if (data.status === "ok") {
					callback(data.data.tweets);
				} else {
					callback(data, null);
				}
			}
		});
	};


}(window.twapperlyzerApi = window.twapperlyzerApi || {}, jQuery));