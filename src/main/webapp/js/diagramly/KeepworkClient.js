/**
 * author:big
 * place:foshan
 * date:2018.7.17
 */

KeepworkClient = function(editorUi)
{
	DrawioClient.call(this, editorUi, 'ghauth');

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

// Extends DrawioClient
mxUtils.extend(KeepworkClient, DrawioClient);

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

	this.get(
		url + '?&ref=master',
		{},
		function(response) {
      update(callback)
		},
		function() {
			upload(function() { update(callback)} )
		}
	)
}

KeepworkClient.prototype.get = function(url, params, success, error) {
	var self = this

	$.ajax({
		type: 'GET',
		timeout: self.requestTimeout,
		data: params || {},
		url: url,
		success: function(response) {
			if(typeof success === 'function') {
				success(response)
			}
		},
		error: function() {
			if(typeof error === 'function') {
				error()
			}
		}
	})
}

KeepworkClient.prototype.getXmlUrl = function() {
	var url = '';

	if (window.urlParams && window.urlParams['initxml']) {
		url = urlParams['initxml'];
		urlParams['initxml'] = null;
		window.keepworkSaveUrl.xmlUrl = url;

		return url;
	}

	if(window.keepworkSaveUrl && window.keepworkSaveUrl.xmlUrl) {
		url = window.keepworkSaveUrl.xmlUrl;

		return url;
	}
}

KeepworkClient.prototype.getFilenameByUrl = function(url) {
	var url = url || this.getXmlUrl();

	var lastDotIndex = url.lastIndexOf('.');
	var lastSlashIndex = url.lastIndexOf('/');

	var filename = url.substring(lastSlashIndex + 1, lastDotIndex);

	filename = filename ? decodeURIComponent(filename) : '';

	return filename;
}

KeepworkClient.prototype.getFile = function(id, callback) {
	var self = this;
	var url = self.getXmlUrl();

	this.get(url + '?bust' + Date.now(), null, function(data){
		if (typeof callback === 'function') {
			callback(new KeepworkFile(self.ui, data, self.getFilenameByUrl()))
		}
	})
}

KeepworkClient.prototype.pickFile = function()
{
	var self = this

	if (this.getXmlUrl()) {
		self.ui.loadFile('K')
	} else {
		setTimeout(function() {
			self.ui.setCurrentFile(null);
			self.create();
		}, 0)
	}
};

KeepworkClient.prototype.create = function() {
	var self = this;

	self.ui.mode = App.MODE_KEEPWORK;

	var compact = self.ui.isOffline();
	var dlg = new NewDialog(self.ui, compact);

	self.ui.showDialog(dlg.container, (compact) ? 350 : 620, (compact) ? 70 : 440, true, true, function(cancel)
	{
		if (cancel && self.ui.getCurrentFile() == null)
		{
			// self.ui.showSplash();
			self.ui.openLocalFile(self.ui.emptyDiagramXml, self.ui.defaultFilename, 'keepwork');
		}
	});
	
	dlg.init();
}

KeepworkClient.prototype.save = function(title, data, callback) {
	var xmlContent = data;
	var svgRoot = this.ui.editor.graph.getSvg();
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

KeepworkClient.prototype.insertFile = function(title, data, success) {
	this.save(title, data, mxUtils.bind(this, function()
	{
		success(new KeepworkFile(this.ui, data, title));
	}));
};