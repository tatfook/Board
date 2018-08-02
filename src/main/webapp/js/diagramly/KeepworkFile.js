/**
 * author:big
 * place:foshan
 * date:2018.8.2
 */

KeepworkFile = function(ui, data, title)
{
	DrawioFile.call(this, ui, data);

	this.title = title;
	this.data = data;
};

//Extends mxEventSource
mxUtils.extend(KeepworkFile, DrawioFile);

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.getMode = function()
{
	return App.MODE_KEEPWORK;
};

KeepworkFile.prototype.getData = function()
{
	return this.data;
};

KeepworkFile.prototype.isAutosave = function()
{
	return true;
};

/**
 * Overridden to enable the autosave option in the document properties dialog.
 */
KeepworkFile.prototype.isAutosaveOptional = function()
{
	return true;
};

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.getTitle = function()
{
	return this.title;
};


/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.isRenamable = function()
{
	return true;
};

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.save = function(revision, success, error)
{
	this.doSave(this.getTitle(), success, error);
};

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.doSave = function(title, success, error)
{
	// Forces update of data for new extensions
	var prev = this.name;
	this.name = title;
	DrawioFile.prototype.save.apply(this, arguments);
	this.name = prev;
	
	this.saveFile(title, false, success, error);
};

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.saveAs = function(title, success, error)
{
	this.doSave(title, success, error);
};

/**
 * Translates this point by the given vector.
 * 
 * @param {number} dx X-coordinate of the translation.
 * @param {number} dy Y-coordinate of the translation.
 */
KeepworkFile.prototype.saveFile = function(title, revision, success, error)
{
	if (!this.isEditable())
	{
		if (success != null)
		{
			success();
		}
	}
	else if (!this.savingFile)
	{
		this.savingFile = true;
		
		// Makes sure no changes get lost while the file is saved
		var prevModified = this.isModified;
		var modified = this.isModified();

		var prepare = mxUtils.bind(this, function()
		{
			this.setModified(false);
			
			this.isModified = function()
			{
				return modified;
			};
		});
		
		prepare();
		
		this.ui.keepwork.save(this.getTitle(), this.getData(), mxUtils.bind(this, function()
		{
			this.savingFile = false;
			this.isModified = prevModified;
			this.contentChanged();
			
			if (success != null)
			{
				success();
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
		}));
	}
	else if (error != null)
	{
		error({code: App.ERROR_BUSY});
	}
};