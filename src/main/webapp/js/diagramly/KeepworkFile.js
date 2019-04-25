/**
 * author:big
 * place:foshan
 * date:2018.8.2
 */

KeepworkFile = function(ui, data, title) {
  DrawioFile.call(this, ui, data)

  this.title = title
  this.data = data

  this.saveInterval = 30000
}

//Extends mxEventSource
mxUtils.extend(KeepworkFile, DrawioFile)

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.getMode = function() {
  return App.MODE_KEEPWORK
}

KeepworkFile.prototype.getData = function() {
  return this.data
}

KeepworkFile.prototype.isAutosave = function() {
  return false
}

/**
 * Overridden to enable the autosave option in the document properties dialog.
 */
KeepworkFile.prototype.isAutosaveOptional = function() {
  return false
}

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.getTitle = function() {
  return this.title
}

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.isRenamable = function() {
  return true
}

/**
 * Returns the location as a new object.
 * @type mx.Point
 */
KeepworkFile.prototype.open = function()
{
	this.ui.setFileData(this.getData());
	
	this.changeListener = mxUtils.bind(this, function(sender, eventObject)
	{
    var edit = (eventObject != null) ? eventObject.getProperty('edit') : null;
    
		if (this.changeListenerEnabled && this.isEditable() &&
			(edit == null || !edit.ignoreEdit))
		{
			this.setModified(true);

			if (this.isAutosave())
			{
				this.ui.editor.setStatus(mxUtils.htmlEntities(mxResources.get('saving')) + '...');
				
				this.autosave(this.autosaveDelay, this.maxAutosaveDelay, mxUtils.bind(this, function(resp)
				{
					// Does not update status if another autosave was scheduled
					if (this.autosaveThread == null && this.ui.getCurrentFile() == this && !this.isModified())
					{
						this.ui.editor.setStatus(mxUtils.htmlEntities(mxResources.get('allChangesSaved')));
					}
				}), mxUtils.bind(this, function(resp)
				{
					if (this.ui.getCurrentFile() == this)
					{
						this.addUnsavedStatus(resp);
					}
				}));
			}
			else
			{
				this.addUnsavedStatus();
			}
		}
  });
	
  this.ui.editor.graph.model.addListener(mxEvent.CHANGE, this.changeListener);
  window.addEventListener('keypress', this.changeListener);

	// Some options trigger autosave
	this.ui.editor.graph.addListener('gridSizeChanged', this.changeListener);
	this.ui.editor.graph.addListener('shadowVisibleChanged', this.changeListener);
	this.ui.addListener('pageFormatChanged', this.changeListener);
	this.ui.addListener('pageScaleChanged', this.changeListener);
	this.ui.addListener('backgroundColorChanged', this.changeListener);
	this.ui.addListener('backgroundImageChanged', this.changeListener);
	this.ui.addListener('foldingEnabledChanged', this.changeListener);
	this.ui.addListener('mathEnabledChanged', this.changeListener);
	this.ui.addListener('gridEnabledChanged', this.changeListener);
	this.ui.addListener('guidesEnabledChanged', this.changeListener);
	this.ui.addListener('pageViewChanged', this.changeListener);
};

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.save = function(revision, success, error) {
  this.doSave(this.getTitle(), success, error)
}

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.doSave = function(title, success, error) {
  // Forces update of data for new extensions
  var prev = this.name
  this.name = title
  DrawioFile.prototype.save.apply(this, arguments)
  this.name = prev

  this.saveFile(title, false, success, error)
}

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.saveAs = function(title, success, error) {
  this.doSave(title, success, error)
}

/**
 * Translates this point by the given vector.
 *
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.saveFile = function(title, revision, success, error) {
  if (!this.isEditable()) {
    if (success != null) {
      success()
    }
  } else if (!this.savingFile) {
    this.savingFile = true

    // Makes sure no changes get lost while the file is saved
    var prevModified = this.isModified
    var modified = this.isModified()

    var prepare = mxUtils.bind(this, function() {
      this.setModified(false)

      this.isModified = function() {
        return modified
      }
    })

    prepare()

    this.ui.keepwork.save(
      this.getTitle(),
      this.getData(),
      mxUtils.bind(this, function() {
        this.savingFile = false
        this.isModified = prevModified
        this.contentChanged()

        if (success != null) {
          success()
        }

        // if(result) {
        // 	this.savingFile = false;
        // 	this.isModified = prevModified;
        // 	this.setModified(modified || this.isModified());

        // 	if (error != null)
        // 	{
        // 		// Handles modified state for retries
        // 		if (err != null && err.retry != null)
        // 		{
        // 			var retry = err.retry;

        // 			err.retry = function()
        // 			{
        // 				prepare();
        // 				retry();
        // 			};
        // 		}

        // 		error(err);
        // 	}
        // }
      })
    )
  } else if (error != null) {
    error({ code: App.ERROR_BUSY })
  }
}

KeepworkFile.prototype.inactiveSave = function() {
  var self = this

  function inactiveSave() {
    let currentFile = self.ui.getCurrentFile()

    if (!currentFile.changeListener) {
      return false
    }
    if (self.modified && !currentFile.savingFile) {
      self.ui.actions.get(self.ui.mode == null ? 'saveAs' : 'save').funct()
    }
  }

  if (self.saveTimeout) {
    clearTimeout(self.saveTimeout);
  }

  self.saveTimeout = setTimeout(inactiveSave, self.saveInterval)
}

KeepworkFile.prototype.isRenamable = function() {
  return true
}

KeepworkFile.prototype.rename = function(title, success, error) {
  this.ui.keepwork.save(
    title,
    this.getData(),
    mxUtils.bind(this, function() {
      this.title = title
      this.contentChanged()

      if (success != null) {
        success()
      }
    })
  )
}