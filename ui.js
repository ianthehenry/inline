var bulletClasses = {
	'todo': {
		'bold': false,
		'italic': false,
		'color': '',
		'decoration': '',
		'icon': '',
		'shape': 'square',
		'character': ':'
	},
	'done': {
		'bold': false,
		'italic': false,
		'color': 'rgba(0, 0, 0, .5)',
		'decoration': 'line-through',
		'icon': 'done',
		'shape': 'square',
		'character': '='
	},
	'note': {
		'bold': false,
		'italic': true,
		'color': 'rgba(0, 0, 0, .5)',
		'decoration': 'none',
		'icon': 'note',
		'shape': 'round',
		'character': '~'
	},
	'important': {
		'bold': true,
		'italic': false,
		'color': '',
		'decoration': 'none',
		'icon': 'bullet/bullet_star',
		'shape': 'round',
		'character': '*'
	}
};

function saveAll()	
{
	$('.outline-container').each(function(index, element) { saveOutline($(element)); });
	saveDocuments();
	saveWorkspace();
	
}

function saveOutline($outlineContainer)
{
	if($outlineContainer.data('isDirty') !== true || $outlineContainer.attr('id') == 'readonly')
		return;
	localStorage.setItem($outlineContainer.attr('id'), serialize($outlineContainer));
}

function saveWorkspace()
{
	var workspace = $('.outline-container').map(function(index, element)
	{
		if(element.id == 'readonly')
			return [];
		return {
			'id': element.id,
			'width': $(element).width()
		};
	}).get();
	
	localStorage.setItem('workspace', JSON.stringify(workspace));
}

function saveDocuments()
{
	localStorage.setItem('outlines', serializeOutlines($('#document-list > li.root > ul')));
	localStorage.setItem('trash', serializeOutlines($('#document-list > li.trash > ul')));
}

function buildItem(item)
{
	if(item.children != undefined) //it's a folder
	{
		var $li = $('<li class="folder"><span class="line"><span class="buttons"><span class="rename" title="Rename"></span><span class="new-folder" title="New Folder"></span><span class="new-outline" title="New Outline"></span></span><span class="title">Another Folder</span></span><ul></ul></li>');
		if(item.open)
			$li.addClass('open');
		else
			$li.children('ul').hide();
		$li.find('.title').text(item.title);
		
		for(var i = 0; i < item.children.length; i++)
			$li.children('ul').append(buildItem(item.children[i]));
		return $li;
	}
	else
	{
		var $li = $('<li class="outline"><span class="line"><span class="buttons"><span class="rename" title="Rename"></span></span><input class="outline-id" type="hidden" /><span class="title"></span></span></li>')
		$li.find('.outline-id').val(item.id);
		$li.find('.title').text(item.title);
		return $li;
	}
}

function loadDocuments()
{
	buildDocumentList(JSON.parse(localStorage.getItem('outlines')), $('#document-list > li.root > ul'));
	buildDocumentList(JSON.parse(localStorage.getItem('trash')), $('#document-list > li.trash > ul'));
}

function buildDocumentList(documents, $ul)
{
	for(var i = 0; i < documents.length; i++)
		$ul.append(buildItem(documents[i]));
}

function serializeOutlines($ul)
{
	return JSON.stringify($ul.children('li').map(function(index, element) { return serializeItem($(element)); }).get());
}

function serializeItem($li)
{
	if($li.hasClass('outline'))
		return {
			'title': $li.find('> .line > .title').text(),
			'id': $li.find('> .line > .outline-id').val()
		};
	
	return {
		'title': $li.find('> .line > .title').text(),
		'open': $li.hasClass('open'), 
		'children': $li.find('> ul > li').map(function(index, element) { return serializeItem($(element)); }).get()
	};
}

function restoreWorkspace()
{
	var outlines = JSON.parse(localStorage.getItem('workspace'));
	for(var i = 0; i < outlines.length; i++)
		openOutline(JSON.parse(localStorage.getItem(outlines[i].id)), true).width(outlines[i].width);
}

function loadOptions()
{
	options = JSON.parse(localStorage.getItem('options'));
	
	if(options.animationSpeed == 0)
		$.fx.off = true;
}

function buildOutline(outline)
{
	var $outline = $('<ul class="outline"></ul>');
	
	$outline.append($.map(outline.lines, function(element, index) { return buildLine(element)[0]; }));
	
	return $outline;
}

function buildLine(line)
{	
	var $newLine = $('<li><span class="line-number"></span><span class="line"><span class="bullet"><span></span></span><span class="collapsed-fadeout"><span class="ellipsis"></span></span><span class="text"></span></span><ul></ul></li>');
	if(line.collapsed)
		$newLine.addClass('collapsed');
		
	if(line.open)
		$newLine.addClass('open');
	else if (line.children.length > 0)
	{
		$newLine.addClass('closed');
		$newLine.children('ul').hide();
	}
	
	$newLine.addClass(line.class);
		
	$newLine.find('span.text').text(line.text + '\n');
	
	if(line.text == '')
		$newLine.find('span.text').addClass('empty');
	
	$newLine.children('ul').append($.map(line.children, function(element, index) { return buildLine(element)[0]; }));
	
	return $newLine;
}

function serialize($container)
{	
	var outline = {
		'version': 1,
		'id': $container.attr('id'),
		'title': $container.find('.toolbar > .title').text(),
		'options': { 'lineNumbers': $container.hasClass('line-numbers'), 'guidelines': $container.hasClass('guidelines') },
		'lines': $container.find('ul.outline > li').map(function(index, element) { return serializeLine($(element)); }).get()
	};

	return JSON.stringify(outline);
}

function getBulletClass($li)
{
	for(var className in bulletClasses)
		if($li.hasClass(className))
			return className;
	return '';
}

//returns a line object
function serializeLine($li)
{
	var text = $li.find('> span.line > span.text').text();
	text = text.substr(0, text.length - 1);

	return {
		'text': text,
		'collapsed': $li.hasClass('collapsed'),
		'open': $li.hasClass('open'),
		'class': getBulletClass($li),
		'children': $li.find('> ul > li').map(function(index, element) { return serializeLine($(element)); }).get()
	};
}

function initResizing()
{
	$('#drawer > .resize-handle').dblclick(function(e)
	{
		if($('#drawer').width() < 10)
			$('#drawer').animate({'width': '200px'}, options.animationSpeed);
		else
			$('#drawer').animate({'width': '0px'}, options.animationSpeed);
	});

	var $resizeTarget = null;
	$('.resize-handle').live('mousedown', function(e)
	{
		if(e.button != 0)
			return;
			
		$resizeTarget = $(this).closest('.outline-container, #drawer');
		//$('body').add($resizeTarget).css('cursor', 'e-resize !important');
	});
	
	$(window).mouseup(function(e)
	{
		//$('body').add($resizeTarget).css('cursor', '');
		$resizeTarget = null;
	});
	
	$(window).mousemove(function(e)
	{
		if($resizeTarget == null)
			return;
		
		var rightEdge = $resizeTarget.offset().left + $resizeTarget.outerWidth();
		var difference = e.clientX - rightEdge;
		$resizeTarget.width($resizeTarget.width() + difference);
	});
}

/*function initReordering()
{
	var dragStart = null;
	var potentialDragOutline = null;
	var $dragOutline = null;
	
	$('.outline-container > .toolbar').live('mousedown', function(e)
	{
		if(e.target != this)
			return;
			
		dragStart = { x: e.pageX, y: e.pageY };
		potentialDragOutline = this;
	});
	
	$('body').live('mousemove', function(e)
	{
		//if(e.target != this)
		//	return;
		
		if($dragOutline == null && potentialDragOutline != null && (Math.abs(e.pageX - dragStart.x) > 3 || Math.abs(e.pageY - dragStart.y) > 3))
		{
			$dragOutline = $(potentialDragOutline);
			potentialDragLine = null;

			$dragOutline.addClass('dragging');
		}
		
		$(this).closest('.outline-container').addClass('dragging');
	});

}*/

function moveRight($container)
{
	$container.insertAfter($container.next('.outline-container'));
	$container.focus();
}

function moveLeft($container)
{
	$container.insertBefore($container.prev('.outline-container'));
	$container.focus();
}

function closeOutline($container)
{
	if($container.length == 0)
		return;
		
	saveOutline($container);
	$('#document-list .outline-id[value=' + $container.attr('id') + ']').closest('li').removeClass('open');
	$container.addClass('loading').hide(options.animationSpeed * 2, function() { $(this).remove(); $('.scroll-wrapper').css('max-height', getScrollHeight()); });
}

function initToolbar()
{
	$('.outline-container > .toolbar > .guidelines').live('click', function()
	{
		$(this).toggleClass('off').closest('.outline-container').toggleClass('guidelines');
	});
	
	$('.outline-container > .toolbar > .line-numbers').live('click', function()
	{
		$(this).toggleClass('off').closest('.outline-container').toggleClass('line-numbers');
	});
	
	$('.outline-container > .toolbar > .icon.close').live('click', function(e)
	{
		closeOutline($(this).closest('.outline-container'));
	});
	
	$('.outline-container > .toolbar > .icon.move-right').live('click', function(e)
	{
		moveRight($(this).closest('.outline-container'));
	});
	
	$('.outline-container > .toolbar > .icon.move-left').live('click', function(e)
	{
		moveLeft($(this).closest('.outline-container'));		
	});
}

function hexToRgb(hex)
{
	hex = hex.toUpperCase();
	
	var vals = '0123456789ABCDEF';
	
	return (vals.indexOf(hex[0]) * 16 + vals.indexOf(hex[1])).toString() + ',' + (vals.indexOf(hex[2]) * 16 + vals.indexOf(hex[3])).toString() + ',' + (vals.indexOf(hex[4]) * 16 + vals.indexOf(hex[5])).toString();
}

function loadStyles()
{

	var round = {
		'colorProperties': { 
			'backgroundColor': 'EEEEEE',
			'textColor': '000000',
			'foregroundColor': 'FFFFFF',
			'hoverColor':'F0F0F0',
			'hoverTextColor':'000000',
			'selectedColor':'DBE7FF',
			'selectedTextColor':'000000',
			'selectedHoverColor':'CCDDFF',
			'focusBorderColor':'99BBFF',
			'focusChildrenBorderColor':'99BBFF',
			'guidelineColor':'CCCCCC',
			'outlineBorderColor':'CCCCCC',
			'selectedOutlineBorderColor':'99BBFF'
		},
		'shapeProperties': {
			'font': 'Helvetica',
			'fontSize': '12px',
			'lineTopLeftX': '10px',
			'lineTopLeftY': '10px',
			'lineBottomLeftX': '10px',
			'lineBottomLeftY': '10px',
			'focusChildrenTopLeftX': '10px',
			'focusChildrenTopLeftY': '10px',
			'focusChildrenBottomLeftX': '10px',
			'focusChildrenBottomLeftY': '10px',
			'guidelinesTopLeftX': '10px',
			'guidelinesTopLeftY': '10px',
			'guidelinesBottomLeftX': '10px',
			'guidelinesBottomLeftY': '10px'
		}
	};
	
	var professional = {
		'colorProperties': { 
			'backgroundColor': 'EEEEEE',
			'textColor': '000000',
			'foregroundColor': 'FFFFFF',
			'hoverColor':'F0F0F0',
			'hoverTextColor':'000000',
			'selectedColor':'DBE7FF',
			'selectedTextColor':'000000',
			'selectedHoverColor':'CCDDFF',
			'focusBorderColor':'99BBFF',
			'focusChildrenBorderColor':'99BBFF',
			'guidelineColor':'CCCCCC',
			'outlineBorderColor':'CCCCCC',
			'selectedOutlineBorderColor':'99BBFF'
		},
		'shapeProperties': {
			'font': 'Helvetica',
			'fontSize': '12px',
			'lineTopLeftX': '5px',
			'lineTopLeftY': '5px',
			'lineBottomLeftX': '5px',
			'lineBottomLeftY': '5px',
			'focusChildrenTopLeftX': '5px',
			'focusChildrenTopLeftY': '5px',
			'focusChildrenBottomLeftX': '5px',
			'focusChildrenBottomLeftY': '5px',
			'guidelinesTopLeftX': '5px',
			'guidelinesTopLeftY': '5px',
			'guidelinesBottomLeftX': '5px',
			'guidelinesBottomLeftY': '5px'
		}
	};
	
	var professionalGray = {
		'colorProperties': { 
			'backgroundColor': 'EEEEEE',
			'textColor': '000000',
			'foregroundColor': 'FFFFFF',
			'hoverColor':'F0F0F0',
			'hoverTextColor':'000000',
			'selectedColor':'E6E6E6',
			'selectedTextColor':'000000',
			'selectedHoverColor':'DBDBDB',
			'focusBorderColor':'B8B8B8',
			'focusChildrenBorderColor':'B8B8B8',
			'guidelineColor':'CCCCCC',
			'outlineBorderColor':'CCCCCC',
			'selectedOutlineBorderColor':'B8B8B8'
		},
		'shapeProperties': {
			'font': 'Helvetica',
			'fontSize': '12px',
			'lineTopLeftX': '5px',
			'lineTopLeftY': '5px',
			'lineBottomLeftX': '5px',
			'lineBottomLeftY': '5px',
			'focusChildrenTopLeftX': '5px',
			'focusChildrenTopLeftY': '5px',
			'focusChildrenBottomLeftX': '5px',
			'focusChildrenBottomLeftY': '5px',
			'guidelinesTopLeftX': '0px',
			'guidelinesTopLeftY': '0px',
			'guidelinesBottomLeftX': '5px',
			'guidelinesBottomLeftY': '5px'
		}
	};

	var LCARS = {
		'colorProperties': {
			'backgroundColor': '000000',
			'textColor': 'FF9B00',
			'foregroundColor': '000000',
			'hoverColor':'CE97CE',
			'hoverTextColor':'000000',
			'selectedColor':'FEFF99',
			'selectedTextColor':'000000',
			'selectedHoverColor':'DDDE78',
			'focusBorderColor':'FEFF99',
			'focusChildrenBorderColor':'FEFF99',
			'guidelineColor':'99CDFF',
			'outlineBorderColor':'CE97CE',
			'selectedOutlineBorderColor':'CE97CE'
		},
		'shapeProperties': {
			'font': 'Swiss911 UCm BT',
			'fontSize': '25px',
			'lineTopLeftX': '10px',
			'lineTopLeftY': '10px',
			'lineBottomLeftX': '10px',
			'lineBottomLeftY': '10px',
			'focusChildrenTopLeftX': '10px',
			'focusChildrenTopLeftY': '10px',
			'focusChildrenBottomLeftX': '10px',
			'focusChildrenBottomLeftY': '10px',
			'guidelinesTopLeftX': '5px',
			'guidelinesTopLeftY': '5px',
			'guidelinesBottomLeftX': '5px',
			'guidelinesBottomLeftY': '5px'
		}
	};
	
	var console = {
		'colorProperties': {
			'backgroundColor': '000000',
			'textColor': 'FFFFFF',
			'foregroundColor': '000000',
			'hoverColor':'000000',
			'hoverTextColor':'00A800',
			'selectedColor':'00B800',
			'selectedTextColor':'000000',
			'selectedHoverColor':'00CF00',
			'focusBorderColor':'00FF00',
			'focusChildrenBorderColor':'00FF00',
			'guidelineColor':'00F900',
			'outlineBorderColor':'00F900',
			'selectedOutlineBorderColor':'00F900'
		},
		'shapeProperties': {
			'font': 'Lucida Console',
			'fontSize': '12px',
			'lineTopLeftX': '2px',
			'lineTopLeftY': '2px',
			'lineBottomLeftX': '2px',
			'lineBottomLeftY': '2px',
			'focusChildrenTopLeftX': '2px',
			'focusChildrenTopLeftY': '2px',
			'focusChildrenBottomLeftX': '2px',
			'focusChildrenBottomLeftY': '2px',
			'guidelinesTopLeftX': '0px',
			'guidelinesTopLeftY': '0px',
			'guidelinesBottomLeftX': '5px',
			'guidelinesBottomLeftY': '5px'
		}
	};
	
	var style = professional;
	
	var colorStyles = '\
body { background-color:rgb($backgroundColor$); color:rgb($textColor$); }\
.outline-container li.selected > span.line:not(.editing) { color:rgb($selectedTextColor$); }\
.outline-container li.selected > span.line:not(.editing), .outline-container li.dragging.selected > span.line:hover { background-color:rgb($selectedColor$); }\
.outline-container li.selected > span.line:not(.editing):hover { background-color:rgb($selectedHoverColor$); }\
.outline-container li.focus { border-color:rgb($focusChildrenBorderColor$); }\
.outline-container li.focus > span.line, .outline-container li.selected > span.line.editing { border-color:rgb($focusBorderColor$); }\
.outline-container span.line:not(.editing):hover { background-color:rgb($hoverColor$); color:rgb($hoverTextColor$) }\
.outline-container span.line:hover > span.collapsed-fadeout { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($hoverColor$, 0)), color-stop(0.7, rgba($hoverColor$, 1))); }\
.outline-container span.collapsed-fadeout { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($foregroundColor$, 0)), color-stop(0.7, rgba($foregroundColor$, 1))); }\
.outline-container li.selected > span.line > span.collapsed-fadeout, .outline-container li.dragging.selected > span.line:hover > span.collapsed-fadeout { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($selectedColor$, 0)), color-stop(0.7, rgba($selectedColor$, 1))); }\
.outline-container li.selected > span.line:hover > span.collapsed-fadeout { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($selectedHoverColor$, 0)), color-stop(0.7, rgba($selectedHoverColor$, 1))); }\
.outline-container.guidelines li > ul { border-left-color:rgb($guidelineColor$); }\
\
.outline-container > .toolbar > .title-clipper { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($foregroundColor$, 0)), color-stop(1, rgba($foregroundColor$, 1))); }\
.outline-container > .toolbar > .icon.move-left, .outline-container > .toolbar > .icon.move-right { background-color:rgb($foregroundColor$); }\
.outline-container > .toolbar { border-bottom-color:rgb($outlineBorderColor$); }\
.outline-container, #drawer { background-color:rgb($foregroundColor$); border-color:rgb($outlineBorderColor$); }\
.outline-container:focus, .outline-container.editing, .outline-container.clipboarding { border-color:rgb($selectedOutlineBorderColor$); }\
\
#document-list li:not(.editing):not(.dragging) > .line:hover, #document-list li > .line.hover { background-color:rgb($selectedColor$); border-color:rgb($focusBorderColor$); }\
#document-list .folder > .line > .buttons { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($selectedColor$, 0)), color-stop(0.25, rgba($selectedColor$, 1))); }\
#document-list .folder.root > .line > .buttons { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($selectedColor$, 0)), color-stop(0.33, rgba($selectedColor$, 1))); }\
#document-list .outline > .line > .buttons, #document-list .trash > .line > .buttons { background-image: -webkit-gradient(linear, left bottom, right bottom, color-stop(0, rgba($selectedColor$, 0)), color-stop(0.5, rgba($selectedColor$, 1))); }\
';
	
	var shapeStyles = '\
body { font-family:\'$font$\'; font-size:$fontSize$; }\
.outline-container span.line { border-top-left-radius:$lineTopLeftX$ $lineTopLeftY$; border-bottom-left-radius:$lineBottomLeftX$ $lineBottomLeftY$; }\
.outline-container li { border-top-left-radius:$focusChildrenTopLeftX$ $focusChildrenTopLeftY$; border-bottom-left-radius:$focusChildrenBottomLeftX$ $focusChildrenBottomLeftY$; }\
.outline-container ul { border-top-left-radius:$guidelinesTopLeftX$ $guidelinesTopLeftY$; border-bottom-left-radius:$guidelinesBottomLeftX$ $guidelinesBottomLeftY$; }\
';

	for(var prop in style.colorProperties)
		colorStyles = colorStyles.replace(RegExp('\\$' + prop + '\\$', 'g'), hexToRgb(style.colorProperties[prop]));

	for(var prop in style.shapeProperties)
		shapeStyles = shapeStyles.replace(RegExp('\\$' + prop + '\\$', 'g'), style.shapeProperties[prop]);
	
	var masterString = colorStyles + shapeStyles;
	
	for(var className in bulletClasses)
	{
		var style = bulletClasses[className];
		
		var styleString = '';
		if(style.bold)
			styleString += 'font-weight:bold;';
		if(style.italic)
			styleString += 'font-style:italic;';
		
		if(style.color != '')
			styleString += 'color:' + style.color + ';';

		if(style.decoration != 'none')
			styleString += 'text-decoration:' + style.decoration + ';';
		
		//span.text:not(:focus)
		styleString = '.outline-container li.' + className + ' > span.line > span.text {' + styleString + '}\n';
		
		if(style.icon != '')
			styleString += '.outline-container li.' + className + ' > span.line > span.bullet > span { background-image:url(\'styles/icons/' + style.icon + '.png\'); }\n';

		styleString += '.outline-container li.' + className + ' > span.line > span.bullet { background-image:url(\'styles/icons/' + style.shape + ' empty.png\'); }\n';
		styleString += '.outline-container li.' + className + '.open > span.line > span.bullet { background-image:url(\'styles/icons/' + style.shape + ' open.png\'); }\n';
		styleString += '.outline-container li.' + className + '.closed > span.line > span.bullet { background-image:url(\'styles/icons/' + style.shape + ' closed.png\'); }\n';

		masterString += styleString;
	}
	
	$('#custom-styles').text(masterString);
}

function openOutline(outline, instant)
{
	var $container = $('<div class="outline-container" tabindex="0"><div class="toolbar">\
<span class="icon close" title="Close"></span>\
<span class="spacer"></span>\
<span class="icon line-numbers off" title="Toggle Line Numbers"></span>\
<span class="icon guidelines off" title="Toggle Guidelines"></span>\
<span class="spacer"></span>\
<span class="icon export-ion" title="Export as ION"></span>\
<span class="icon export-html" title="Printer Friendly"></span>\
<span class="spacer"></span>\
<span class="icon move-right" title="Move Right"></span>\
<span class="icon move-left" title="Move Left"></span>\
<span class="icon title-clipper"></span>\
<span class="title"></span>\
</div><span class="resize-handle"></span><div class="scroll-wrapper"></div></div>');

	//.live() does not support the scroll event as of 1.4.4
	$container.children('.scroll-wrapper').scroll(function() { this.scrollLeft = 0; }).append(buildOutline(outline));
	
	$container.data('currentCommand', []);
	$container.data('undoHistory', []);
	$container.data('redoHistory', []);
	$container.data('isDirty', false);
	
	$container.attr('id', outline.id);
	$container.find('> .toolbar > .title').text(outline.title);
	
	if(outline.options.guidelines)
		$container.addClass('guidelines').find('> .toolbar > .icon.guidelines').removeClass('off');
		
	if(outline.options.lineNumbers)
		$container.addClass('line-numbers').find('> .toolbar > .icon.line-numbers').removeClass('off');
	
	$('#document-list .outline-id[value=' + outline.id + ']').closest('li').addClass('open');
	
	if(instant)
		$container.appendTo('body');
	else
		$container.addClass("loading").hide().appendTo('body').show(options.animationSpeed * 2, function() { $(this).removeClass('loading'); });
			
	$container.focus();
	
	$('.scroll-wrapper').css('max-height', getScrollHeight());
	
	return $container;
}

function getNewId()
{
	for(var i = 1; localStorage[i.toString()] != undefined; i++);
	return i.toString();
}

function newOutline($folder)
{
	var newOutline = {
		'version': 1,
		'id': getNewId(),
		'title': 'New Outline',
		'options': { 'lineNumbers': false, 'guidelines': true },
		'lines': []
	};
	
	localStorage.setItem(newOutline.id, JSON.stringify(newOutline));
	
	var $li = $('<li class="outline"><span class="line"><span class="buttons"><span class="rename" title="Rename"></span></span><input class="outline-id" type="hidden" /><span class="title"></span></span>');
	$li.find('.outline-id').val(newOutline.id);
	$li.find('.title').text(newOutline.title);
	
	if($folder.hasClass('open'))
		$li.hide().appendTo($folder.children('ul')).slideDown(options.animationSpeed);
	else
		$folder.addClass('open').children('ul').append($li).slideDown(options.animationSpeed);
		
	rename($li);
}

function newFolder($folder)
{
	var $newFolder = $('\
<li class="folder open">\
<span class="line">\
<span class="buttons">\
<span class="rename" title="Rename"></span>\
<span class="new-folder" title="New Folder"></span>\
<span class="new-outline" title="New Outline"></span>\
</span>\
<span class="title">New Folder</span>\
</span>\
<ul></ul>\
</li>');

	if($folder.hasClass('open'))
		$newFolder.hide().appendTo($folder.children('ul')).slideDown(options.animationSpeed);
	else
		$folder.addClass('open').children('ul').append($newFolder).slideDown(options.animationSpeed);
		
	rename($newFolder);
}

function rename($li)
{
	$li.addClass('editing');

	$('<input type="text" class="edit-title" />').val($li.find('> .line > .title').text()).insertAfter($li.find('> .line > .title').hide()).focus()[0].select();
}

function initDrawer()
{
	$('#document-list .folder > .line').live('click', function(e)
	{
		if($(e.target).hasClass('edit-title'))
			return;
			
		var $folder = $(this).closest('li');
		
		if($folder.find('> ul > li').length == 0)
			return;
		
		$folder.toggleClass('open');
		
		if($folder.hasClass('open'))
			$folder.children('ul').slideDown(options.animationSpeed);
		else
			$folder.children('ul').slideUp(options.animationSpeed);
	});
	
	$('#document-list .folder > .line > .buttons > .new-folder').live('click', function(e)
	{
		newFolder($(this).closest('.folder'));
		e.stopPropagation();
	});
	
	$('#document-list .folder > .line > .buttons > .new-outline').live('click', function(e)
	{
		newOutline($(this).closest('.folder'));
		e.stopPropagation();
	});
	
	$('#document-list * > .line > .buttons > .rename').live('click', function(e)
	{
		rename($(this).closest('li'));
		e.stopPropagation();
	});
	
	$('#document-list * > .line > .buttons > .empty').live('click', function(e)
	{
		if($(this).closest('.trash').find('> ul > li').length > 0 && confirm("Are you sure you want to empty the trash?\nThere is no way to undo this."))
			emptyTrash();
		e.stopPropagation();
	});
	
	$('#document-list * > .line > .edit-title').live('keydown', function(e)
	{
		if(e.which == keys.enter || e.which == keys.escape)
			this.blur();
	});
	
	$('#document-list .outline > .line > .edit-title').live('blur', function(e)
	{
		var id = $(this).siblings('.outline-id').val();
		if($('#' + id + '.outline-container').find('.title').text($(this).val()).length == 0)
		{
			var outline = JSON.parse(localStorage.getItem(id));
			outline.title = $(this).val();
			localStorage.setItem(id, JSON.stringify(outline));
		}
	});
	
	$('#document-list * > .line > .edit-title').live('blur', function(e)
	{
		$(this).siblings('.title').text($(this).val()).show();
		$(this).closest('li').removeClass('editing');
		$(this).remove();
	});
	
	$('#document-list .outline > .line').live('click', function(e)
	{
		var id = $(this).children('.outline-id').val();
		if($('#' + id + '.outline-container').focus().length == 0)
			openOutline(JSON.parse(localStorage.getItem(id)));
	});

	$('#document-list > .help').live('click', function(e)
	{
		if($('#readonly.outline-container').focus().length > 0)
			return;
	
		openOutline({
			'version': 1,
			'id': 'readonly',
			'title': 'Help',
			'options': { 'lineNumbers': false, 'guidelines': true },
			'lines': [{"text":"This is a fully interactive help document. Feel free to make any changes you want; they won't be saved so you can always get back to the original if you screw stuff up.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Notes","collapsed":false,"open":false,"class":"","children":[{"text":"Google Chrome does not allow interaction with the system clipboard yet. Instead, I've simulated a simple clipboard, but it will not persist if you refresh or close the Inline window.","collapsed":false,"open":false,"class":"","children":[]},{"text":"If you drag a line from one outline to another, this is recorded by the undo history as a distinct operation on each outline, so undoing one operation will not undo the other.","collapsed":false,"open":false,"class":"","children":[]},{"text":"You don't need to worry about saving.","collapsed":false,"open":false,"class":"","children":[{"text":"Outlines are automatically saved when you close them.","collapsed":false,"open":false,"class":"","children":[]},{"text":"All open outlines are automatically saved when you close Chrome, close the Inline tab, or navigate to a different page.","collapsed":false,"open":false,"class":"","children":[]},{"text":"All open outlines are automatically saved every 30 seconds.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Outlines are artificially limited to 600 pixels high. This will change to fit the height of the window soon.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Keyboard Shortcuts","collapsed":false,"open":false,"class":"","children":[{"text":"Standard Operations","collapsed":false,"open":false,"class":"","children":[{"text":"Ctrl+z: Undo.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+shift+z: Redo.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+c: Copy the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+x: Cut the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+v: Paste the selected lines after the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+shift+v: Paste the selected lines before the focus.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Navigation","collapsed":false,"open":false,"class":"","children":[{"text":"Up/down: Select line above/below the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Right/left: Open/close the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+right/left: Expand/collapse the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+up/down: Union select the line above/below the focus.","collapsed":false,"open":true,"class":"","children":[{"text":"If the line above/below is already selected, this deselects the current line. This isn't a great solution when you have discontiguous selections, but it works fine otherwise.","collapsed":false,"open":false,"class":"note","children":[]}]},{"text":"Ctrl+shift+up/down: Move the focus up/down without deselecting any other lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Home: Select the focused line's parent.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+home: Select the first line of the outline.","collapsed":false,"open":false,"class":"","children":[]},{"text":"You can use shift+home and shift+ctrl+home as well.","collapsed":false,"open":false,"class":"note","children":[]},{"text":"I haven't added the end key yet; sue me.","collapsed":false,"open":false,"class":"note","children":[]}]},{"text":"Managing Multiple Outlines","collapsed":false,"open":false,"class":"","children":[{"text":"`: Select the next outline.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+`: Select the previous outline.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+shift+left: Move the current outline to the left.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+shift+right: Move the current outline to the right.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Insertion/deletion","collapsed":false,"open":false,"class":"","children":[{"text":"Enter: Insert a line after the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+enter: Insert a line before the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+enter: Append a child line to the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+shift+enter: Prepend a child line to the focus.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Backspace/delete: Delete the selected lines.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Organization","collapsed":false,"open":false,"class":"","children":[{"text":"Ctrl+up: Move the selected lines up.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Ctrl+down: Move the selected lines down.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Tab: indent the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+tab: outdent the selected lines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Q: Indent the selected lines without their children.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Shift+q: Outdent the selected lines' children.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Editing","collapsed":false,"open":false,"class":"","children":[{"text":"F2: toggle edit mode.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Escape: exit edit mode.","collapsed":false,"open":false,"class":"","children":[]},{"text":"E: enter edit mode.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Up: (when caret is at the start of the line): Exit edit mode and select the line above.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Down: (when caret is at the end of the line): Exit edit mode and select the line below.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"Bullet Classes","collapsed":false,"open":false,"class":"","children":[{"text":"Z: Toggle Important class.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Space: Toggle Done class.","collapsed":false,"open":false,"class":"","children":[]},{"text":"C: Cycle color classes.","collapsed":false,"open":false,"class":"","children":[]},{"text":"N: Toggle Note class.","collapsed":false,"open":false,"class":"","children":[]}]},{"text":"HJKL keys can be used instead of arrow keys for all operations.","collapsed":false,"open":false,"class":"note","children":[]}]},{"text":"Known Bugs","collapsed":false,"open":false,"class":"","children":[{"text":"Dragging text while editing a line causes a few problems. Don't do it.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Pressing backspace/delete really fast can cause no selection when animations are enabled.","collapsed":false,"open":false,"class":"","children":[]},{"text":"Insert/move icons render underneath (z-index-wise) line numbers","collapsed":false,"open":false,"class":"","children":[]},{"text":"Pasting text while editing does not work very well.","collapsed":false,"open":false,"class":"","children":[]},{"text":"You can't deselect the line with focus using ctrl+click.","collapsed":false,"open":false,"class":"","children":[]},{"text":"If you start dragging a folder, but end the drag operation on the folder itself, the click event is fired. Same for outlines.","collapsed":false,"open":false,"class":"","children":[]},{"text":"When dragging to resize, if your mouse stops over the margin on the outline to the right, the resizing breaks until your cursor leaves it.","collapsed":false,"open":false,"class":"","children":[]}]}]
		});
	});
	
	$('#document-list > .options').live('click', function(e)
	{
		window.open('options.html', 'options');
	});
}

function move($li, $targetUl, index)
{
	if($li.length == 0)
		return;

	var $oldParent = $li.parent();
	
	if(index == -1 || index == $targetUl.children().length)
		$li.appendTo($targetUl);
	else if($targetUl.children()[index] != $li[0]) //trying to insert an element before itself just deletes the element.
		$li.insertBefore($targetUl.children().nth(index));
	
	if($oldParent.children().length == 0)
		$oldParent.parent().addClass('open');
}

function initDrawerSorting()
{
	var dragStart = null;
	var $dragItem = null;
	var $potentialDragItem = null;

	$('#document-list ul').live('mousemove', function(e)
	{
		if($dragItem == null || $(this).parents('li.dragging').length != 0)
		{
			$(this).removeClass('moving');
			return;
		}
		e.stopPropagation();

		var i = indexOf($(this), $(e.target).offset().top, e.offsetY);

		var pos = 0;
		if(i == $(this).children().length)
		{
			$item = $(this).children().nth(i - 1);
			pos = $item.offset().top - $item.parent().offset().top + $item.outerHeight(true) - 20;
		}
		else
		{
			if(i == 0)
				pos = 0;
			else
			{
				$item = $(this).children().nth(i);
				pos = $item.offset().top - $item.parent().offset().top - 10;
			}
		}

		//this will happen right after a top insert, while the new item is still animating
		if(pos < 0)
			pos = i = 0;

		$(this).css('background-position', '2px ' + pos + 'px');

		if($dragItem == null)
			$(this).addClass('inserting');
		else
			$(this).addClass('moving');

		if(i == 0)
			$(this).removeClass('bottom').addClass('top');
		else if(i == $(this).children().length)
			$(this).removeClass('top').addClass('bottom');
		else
			$(this).removeClass('top').removeClass('bottom');

	});

	$('#document-list ul').live('mouseleave', function(e)
	{
		$(this).removeClass('moving');
	});
	
	$('#document-list ul').live('mouseup', function(e)
	{
		if($dragItem == null)
			return;

		var offset = $(e.target).offset().top - $(this).offset().top + e.offsetY;
		if($dragItem.has(this).length == 0)
			move($dragItem, $(this), indexOf($(this), $(e.target).offset().top, e.offsetY));

		$dragItem.removeClass('dragging');
		$dragItem = null;
	});

	$('#document-list > li li .line').live('mousedown', function(e)
	{
		if(e.button != 0 || e.metaKey || e.shiftKey)
			return;

		dragStart = { 'x': e.pageX, 'y': e.pageY };
		$potentialDragItem = $(this).closest('li');
	});

	$('#document-list .line.hover').live('mouseup', function(e)
	{
		if($dragItem == null)
			return;
		
		move($dragItem, $(this).closest('li').children('ul'), -1);
		$dragItem.removeClass('dragging');
		$dragItem = null;
	});
	
	$('#document-list .folder:not(.trash):not(.root) > .line').live('mouseleave', function(e)
	{
		$(this).removeClass('hover');
	});
	
	$('#document-list .folder:not(.trash):not(.root) > .line').live('mousemove', function(e)
	{
		if(e.offsetX > 20)
			$(this).removeClass('hover');
		else if($dragItem != null && $dragItem.has(this).length == 0)
		{
			$(this).closest('ul').removeClass('moving');
			$(this).addClass('hover');
			e.stopPropagation();
		}
	});
	
	$('#document-list > li.trash > .line, #document-list > li.root > .line').live('mouseenter', function(e)
	{
		if($dragItem != null)
			$(this).addClass('hover');
	});
	
	$('#document-list > li.trash > .line, #document-list > li.root > .line').live('mouseleave', function(e)
	{
		$(this).removeClass('hover');
	});
	
	$('#document-list').mouseup(function(e)
	{
		$potentialDragItem = null;
	});
	
	$('#document-list').mousemove(function(e)
	{
		if($dragItem == null && $potentialDragItem != null && (Math.abs(e.pageX - dragStart.x) > 3 || Math.abs(e.pageY - dragStart.y) > 3))
		{
			$dragItem = $potentialDragItem;
			$potentialDragItem = null;

			$dragItem.addClass('dragging');
		}
	});
}

function emptyTrash()
{
	$('#document-list > li.trash .outline-id').each(function(index, element)
	{
		closeOutline($('#' + element.value + '.outline-container'));
		localStorage.removeItem(element.value);
	});
	
	$('#document-list > li.trash > ul > li').remove();
	
	$('#document-list > li.trash').removeClass('open');
	saveDocuments();
}

function initUi()
{
	loadOptions();
	loadDocuments();
	restoreWorkspace();
	initResizing();
	initToolbar();
	loadStyles();
	initDrawer();
	initDrawerSorting();
	//initReordering();
	
	setInterval(saveAll, 30000);
	
	window.onunload = function()
	{
		saveAll();
	};
}