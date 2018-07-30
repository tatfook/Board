/**
 * author:big
 * place:foshan
 * date:2018.7.17
 */

KeepworkClient = function(editorUi)
{
	this.editorUi = editorUi
	// DrawioClient.call(this, editorUi, 'ghauth');

	var cookie = document.cookie.split(";")

	for (var item in cookie) {
		var currentItem = mxUtils.trim(cookie[item])

		if(currentItem.substring(0, 6) == "token=") {
			this.token = currentItem.substring(6)
		}
	}

	this.requestTimeout = 10000;
	this.branch = 'master';

	this.getUserInfo()
};

KeepworkClient.prototype.getKeepworkBaseUrl = function () {
	let hostname = window.location.hostname;
	let url = '';

	if (hostname === 'localhost') {
		url = 'https://stage.keepwork.com';
	}

	if (hostname === 'keepwork.com') {
		url = 'https://keepwork.com';
	}

	if (hostname === 'stage.keepwork.com') {
		url = 'https://stage.keepwork.com';
	}

	if (hostname === 'release.keepwork.com') {
		url = 'https://release.keepwork.com';
	}

	return url + '/api/wiki/models/'
}

KeepworkClient.prototype.getUserInfo = function () {
	var url = this.getKeepworkBaseUrl() + 'user/getProfile'
	var self = this

	$.ajax({
		type: 'GET',
		timeout: this.requestTimeout, // 超时时间 10 秒
		headers: {
				'Authorization': 'Bearer ' + this.token
		},
		url: url,
		success: function(response) {
			if (response && response.data) {
				self.userinfo = response.data;
				self.datasourceInfo = response.data.defaultSiteDataSource;
			}
		}
	})
};

KeepworkClient.prototype.getGitlabBaseUrl = function() {
	return this.datasourceInfo && this.datasourceInfo.apiBaseUrl.replace('http://', 'https://') || '';
}

KeepworkClient.prototype.getGitlabRawUrl = function() {
	return this.datasourceInfo && this.datasourceInfo.rawBaseUrl.replace('http://', 'https://') || '';
}

KeepworkClient.prototype.getDataProjectId = function() {
	return this.datasourceInfo && this.datasourceInfo.projectId || '';
}

KeepworkClient.prototype.getDataSourceUsername = function() {
	return this.datasourceInfo && this.datasourceInfo.dataSourceUsername || '';
}

KeepworkClient.prototype.getProjectName = function() {
	return this.datasourceInfo && this.datasourceInfo.projectName || '';
}

KeepworkClient.prototype.getDataSourceToken = function() {
	return this.datasourceInfo && this.datasourceInfo.dataSourceToken || '';
}

KeepworkClient.prototype.write = function(path, content, callback) {
	var url = this.getGitlabBaseUrl() + '/projects/' + this.getDataProjectId() + '/repository/files/' + path;
	var self = this;

	function upload(callback) {
		$.ajax({
			type: 'POST',
			timeout: self.requestTimeout,
			headers: {
				'PRIVATE-TOKEN': self.getDataSourceToken()
			},
			url: url,
			data: {
				branch: self.branch,
				commit_message: 'sync',
				content: content
			},
			success: function(response) {
				if(typeof callback === 'function') {
					callback(response);
				}
			},
			error: function() {
				if(typeof callback === 'function') {
					callback();
				}
			}
		})
	}

	function update(callback) {
		$.ajax({
			type: 'PUT',
			timeout: self.requestTimeout,
			headers: {
				'PRIVATE-TOKEN': self.getDataSourceToken()
			},
			url: url,
			data: {
				branch: self.branch,
				commit_message: 'sync',
				content: content
			},
			success: function(response) {
				if(typeof callback === 'function') {
					callback(response);
				}
			}
		})
	}

	upload(function() { update(callback) })
}

KeepworkClient.prototype.get = function(url, params, callback) {
	var self = this

	$.ajax({
		type: 'GET',
		timeout: self.requestTimeout,
		data: params || {},
		url: url,
		success: function(response) {
			if(typeof callback === 'function') {
				callback(response)
			}
		}
	})
}

KeepworkClient.prototype.read = function() {
	var self = this;
	var url = '';

	if (urlParams && urlParams['initxml']) {
		url = urlParams['initxml'];
		urlParams['initxml'] = null;
	}

	if(window.keepworkSaveUrl && window.keepworkSaveUrl.xmlUrl) {
		url = window.keepworkSaveUrl.xmlUrl;
	}

	if (url) {
		var lastDotIndex = url.lastIndexOf('.');
		var lastSlashIndex = url.lastIndexOf('/');

		var filename = url.substring(lastSlashIndex + 1, lastDotIndex);

		filename = filename ? decodeURIComponent(filename) : '';

		this.get(url + '?bust' + Date.now(), null, function(data){
			self.editorUi.setCurrentFile(null);
			self.editorUi.openLocalFile(data, filename, 'keepwork');
		})
	} else {
		setTimeout(function() {
			self.editorUi.setCurrentFile(null);
			self.create();
		}, 0)
	}
}

KeepworkClient.prototype.create = function() {
	var self = this;

	self.editorUi.mode = App.MODE_KEEPWORK;

	var compact = self.editorUi.isOffline();
	var dlg = new NewDialog(self.editorUi, compact);

	self.editorUi.showDialog(dlg.container, (compact) ? 350 : 620, (compact) ? 70 : 440, true, true, function(cancel)
	{
		if (cancel && self.editorUi.getCurrentFile() == null)
		{
			// self.editorUi.showSplash();
			self.editorUi.openLocalFile(self.editorUi.emptyDiagramXml, self.editorUi.defaultFilename, 'keepwork');
		}
	});
	
	dlg.init();
}

KeepworkClient.prototype.save = function(title, data, callback) {
	var xmlContent = data;
	var svgRoot = this.editorUi.editor.graph.getSvg();
	var svgContent = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + mxUtils.getXml(svgRoot);

	var self = this;

	var xmlUrl = self.userinfo.username + '/' + 'board/' + title + '/' + title + '.xml';
	var svgUrl = self.userinfo.username + '/' + 'board/' + title + '/' + title + '.svg';

	function updateXml(callback) {
		self.write(xmlUrl, xmlContent, callback);
	}

	function updateSvg(callback) {
		self.write(svgUrl, svgContent, callback);
	}

	updateXml(function(){
		updateSvg(function(){
			let url = self.getGitlabRawUrl() + '/' + self.getDataSourceUsername() + '/' + self.getProjectName() + '/raw/master/';

			window.keepworkSaveUrl = {};
			window.keepworkSaveUrl.xmlUrl = url + xmlUrl;
			window.keepworkSaveUrl.svgUrl = url + svgUrl;
			
			if(typeof callback === 'function'){
				callback();
			}
		})
	});
};