/**
 * author:big
 * place:foshan
 * date:2018.7.17
 */

KeepworkClient = function(editorUi) {
  DrawioClient.call(this, editorUi, "ghauth")

  this.requestTimeout = 10000
  this.userinfo = {}
  this.token = ""

  var cookie = document.cookie.split(";")

  for (var item in cookie) {
    var currentItem = mxUtils.trim(cookie[item])

    if (currentItem.substring(0, 6) == "token=") {
      this.token = currentItem.substring(6)
    }
  }

  this.getUserInfo()
}

// Extends DrawioClient
mxUtils.extend(KeepworkClient, DrawioClient)

KeepworkClient.prototype.getKeepworkApiBaseUrl = function() {
  var hostname = window.location.hostname
  var url = ""

  if (hostname === "localhost" || hostname.match(/\d+.\d+.\d+.\d+/)) {
    url = "http://api-dev.kp-para.cn"
  }

  if (hostname === "keepwork.com") {
    url = "https://api.keepwork.com"
  }

  if (hostname === "dev.kp-para.cn") {
    url = "http://api-dev.kp-para.cn"
  }

  if (hostname === "rls.kp-para.cn") {
    url = "http://api-rls.kp-para.cn"
  }

  return url
}

KeepworkClient.prototype.getCoreserviceBaseUrl = function() {
  return this.getKeepworkApiBaseUrl() + "/core/v0"
}

KeepworkClient.prototype.getGitlabBaseUrl = function() {
  return this.getKeepworkApiBaseUrl() + "/git/v0"
}

KeepworkClient.prototype.getProjectPath = function() {
  var url = (this.userinfo.username || "") + "/" + "__keepwork__"

  return encodeURIComponent(url)
}

KeepworkClient.prototype.getHeader = function() {
  return {
    Authorization: "Bearer " + this.token || ""
  }
}

KeepworkClient.prototype.getUserInfo = function() {
  var url = this.getCoreserviceBaseUrl() + "/users/profile"
  var self = this

  $.ajax({
    type: "GET",
    timeout: self.requestTimeout, // 超时时间 10 秒
    headers: self.getHeader(),
    url: url,
    success: function(response) {
      if (typeof response === "object") {
        self.userinfo = response
      }
    }
  })
}

KeepworkClient.prototype.getUrlByTitle = function(title, suffix) {
  if (!window.pagePath || !title || !suffix) {
    return false
  }

  var url =
    this.userinfo.username + "/board/" + window.pagePath + "/" + title + suffix

  return encodeURIComponent(url)
}

KeepworkClient.prototype.write = function(path, content, callback) {
  var url =
    this.getGitlabBaseUrl() +
    "/projects/" +
    this.getProjectPath() +
    "/files/" +
    path
  var self = this

  function upload(callback) {
    $.ajax({
      type: "POST",
      timeout: self.requestTimeout,
      headers: self.getHeader(),
      url: url,
      data: {
        content: content
      },
      success: function(response) {
        if (typeof callback === "function") {
          callback(response, url)
        }
      },
      error: function() {
        if (typeof callback === "function") {
          callback()
        }
      }
    })
  }

  function update(callback) {
    $.ajax({
      type: "PUT",
      timeout: self.requestTimeout,
      headers: self.getHeader(),
      url: url,
      data: {
        content: content
      },
      success: function(response) {
        if (typeof callback === "function") {
          callback(response, url)
        }
      }
    })
  }

  this.get(
    url,
    {},
    function(response) {
      update(callback)
    },
    function() {
      upload(function() {
        update(callback)
      })
    }
  )
}

KeepworkClient.prototype.get = function(url, params, success, error) {
  var self = this

  $.ajax({
    type: "GET",
    timeout: self.requestTimeout,
    data: params || {},
    url: url,
    success: function(response) {
      if (typeof success === "function") {
        success(response)
      }
    },
    error: function() {
      if (typeof error === "function") {
        error()
      }
    }
  })
}

KeepworkClient.prototype.getXmlUrl = function() {
  var url = ""

  if (keepworkSaveUrl && keepworkSaveUrl.xmlUrl) {
    url = keepworkSaveUrl.xmlUrl

    return url
  }
}

KeepworkClient.prototype.getFilenameByUrl = function(url) {
  var url = url || decodeURIComponent(this.getXmlUrl())

  var lastDotIndex = url.lastIndexOf(".")
  var lastSlashIndex = url.lastIndexOf("/")

  var filename = url.substring(lastSlashIndex + 1, lastDotIndex)

  filename = filename ? decodeURIComponent(filename) : ""

  return filename
}

KeepworkClient.prototype.getFile = function(id, callback) {
  var self = this
  var url = self.getXmlUrl()

  if (url) {
    this.get(url + "?bust" + Date.now(), null, function(data) {
      if (url.match('git/v')) {
        if (data && data.content && typeof callback === 'function') {
          callback(new KeepworkFile(self.ui, data.content, self.getFilenameByUrl()))
        }
      } else {
        if (data && typeof callback === 'function') {
          callback(new KeepworkFile(self.ui, data, self.getFilenameByUrl()))
        }
      }
    })
  } else {
    var olddata = self.getOldData()

    if (typeof callback === "function") {
      setTimeout(() => {
        callback(new KeepworkFile(self.ui, olddata, "old-" + Date.now()))
      }, 0)
    }
  }
}

KeepworkClient.prototype.getOldData = function() {
  var data = boardOldData || ""
  data = data.replace('<diagram version="0.0.1">', "")
  data = data.replace("</diagram>", "")
  data = this.ui.editor.graph.decompress(data)

  return data
}

KeepworkClient.prototype.pickFile = function() {
  var self = this

  var file = self.ui.getCurrentFile()

  if (file) {
    file.close(true)
  }

  if (self.getXmlUrl() || self.getOldData()) {
    self.ui.loadFile("K")
  } else {
    self.ui.fileLoaded(null)
    self.ui.hideDialog()
    self.create()
  }
}

KeepworkClient.prototype.create = function() {
  var self = this

  self.ui.mode = App.MODE_KEEPWORK

  var compact = self.ui.isOffline()
  var dlg = new NewDialog(self.ui, compact)

  self.ui.showDialog(
    dlg.container,
    compact ? 350 : 620,
    compact ? 70 : 440,
    true,
    true,
    function(cancel) {
      if (cancel) {
        // && self.ui.getCurrentFile() == null
        boardType.close()
        // self.ui.showSplash();
        // self.ui.openLocalFile(self.ui.emptyDiagramXml, self.ui.defaultFilename);

        var currentFile = self.ui.getCurrentFile()

        if (currentFile) {
          currentFile.close(true)
        }
      }
    }
  )

  dlg.init()
}

KeepworkClient.prototype.save = function(title, data, callback) {
  var xmlContent = data
  var svgRoot = this.ui.editor.graph.getSvg()
  var svgContent =
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
    mxUtils.getXml(svgRoot)

  var self = this

  var xmlUrl = self.getUrlByTitle(title, ".xml")
  var svgUrl = self.getUrlByTitle(title, ".svg")

  function updateXml(callback) {
    self.write(xmlUrl, xmlContent, callback)
  }

  function updateSvg(callback) {
    self.write(svgUrl, svgContent, callback)
  }

  window.keepworkSaveUrl = {}

  updateXml(function(response, url) {
    window.keepworkSaveUrl.xmlUrl = url

    updateSvg(function(response, url) {
      window.keepworkSaveUrl.svgUrl = url

      if (typeof callback === "function") {
        callback()
      }
    })
  })
}

KeepworkClient.prototype.insertFile = function(title, data, success, error) {
  var self = this
  var url =
    this.getGitlabBaseUrl() +
    "/projects/" +
    this.getProjectPath() +
    "/files/" +
    self.getUrlByTitle(title, ".xml")

  function save() {
    self.save(
      title,
      data,
      mxUtils.bind(self, function() {
        if (typeof success === "function") {
          success(new KeepworkFile(this.ui, data, title))
        }
      })
    )
  }

  self.get(
    url,
    {},
    function() {
      self.ui.confirm(
        mxResources.get("fileExistSave"),
        function() {
          save()
        },
        function() {
          if (typeof error === "function") {
            error()
          }
        }
      )
    },
    function() {
      save()
    }
  )
}
