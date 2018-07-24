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
	return this.datasourceInfo && this.datasourceInfo.apiBaseUrl.replace('http://', 'https://');
}

KeepworkClient.prototype.getDataProjectId = function() {
	return this.datasourceInfo && this.datasourceInfo.projectId;
}

KeepworkClient.prototype.getDataSourceToken = function() {
	return this.datasourceInfo && this.datasourceInfo.dataSourceToken;
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
					callback();
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
				console.log(response);
	
				if(typeof callback === 'function') {
					callback();
				}
			}
		})
	}

	upload(function() { update(callback) })
}

KeepworkClient.prototype.read = function() {
	var url = this.getGitlabBaseUrl() + ''
}

KeepworkClient.prototype.delete = function() {
	var url = this.getGitlabBaseUrl() + ''
}

KeepworkClient.prototype.save = function(title, callback) {
	var xmlContent = this.editorUi.getCurrentFile().data;
	var svgRoot = this.editorUi.editor.graph.getSvg();
	var svgContent = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + mxUtils.getXml(svgRoot);

	var self = this;

	function updateXml(callback) {
		self.write(self.userinfo.username + '/' + 'board/' + title + '/' + title + '.xml', xmlContent, callback);
	}

	function updateSvg(callback) {
		self.write(self.userinfo.username + '/' + 'board/' + title + '/' + title + '.svg', svgContent, callback);
	}

	updateXml(function(){ updateSvg(callback)});
};