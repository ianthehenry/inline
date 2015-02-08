$(init);

var dragging = false;

var options = null;

var keys =
{
	'backspace': 8,
	'tab': 9,
	'enter': 13,
	'escape': 27,
	'space': 32,
	'end': 35,
	'home': 36,
	'left': 37,
	'up': 38,
	'right': 39,
	'down': 40,
	'delete': 46,
	'a': 65,
	'c': 67,
	'e': 69,
	'h': 72,
	'j': 74,
	'k': 75,
	'l': 76,
	'n': 78,
	'q': 81,
	's': 83,
	'v': 86,
	'x': 88,
	'z': 90,
	'f2': 113,
	'grave': 192
};

var clipboard = [];

$.fn.nth = function(i)
{
	return $(this[i]);
}

$.fn.reach = function(fun)
{
	return $(this.get().reverse()).each(fun);
}

$.fn.contains = function(element)
{
	for(var i = 0; i < this.length; i++)
		if(this[i] == element)
			return true;
	return false;
}

function genFx(type)
{
	var obj = {};
	$.each(["height", "marginTop", "marginBottom", "paddingTop", "paddingBottom"], function()
	{
		obj[this] = type
	});
	return obj;
}

// Some custom shortcuts for Inline
$.each({
	slideDown2: genFx("show"),
	slideUp2: genFx("hide"),
}, function(name, props) {
	$.fn[name] = function(options) {
		return this.animate(props, options);
	};
});

/* History Stuff */

function getAbsoluteLocation($li)
{
	var position = [];

	var $current = $li;
	while($current.is('li'))
	{
		position.unshift($current.siblings(':not(.ignore)').andSelf().index($current[0]));
		$current = $current.parent().parent();
	}

	return position;
}

function undoCommand(command)
{
	dropSelection();

	for(var i = command.length - 1; i >= 0; i--)
		undoAction(command[i]);
	$('.outline-container:focus').data('currentCommand',  []);
	scrollToFocus();
}

function undoAction(action)
{
	switch(action.type)
	{
		case 'move':
			doAction({'type': 'move', 'oldLocation': action.newLocation, 'newLocation': action.oldLocation });
			break;
		case 'insert':
			doAction({ 'type': 'delete', 'location': action.location });
			break;
		case 'delete':
			doAction({ 'type': 'insert', 'location': action.location, 'line': action.line });
			break;
		case 'open':
			doAction({ 'type': 'close', 'location': action.location });
			break;
		case 'close':
			doAction({ 'type': 'open', 'location': action.location });
			break;
		case 'expand':
			doAction({ 'type': 'collapse', 'location': action.location });
			break;
		case 'collapse':
			doAction({ 'type': 'expand', 'location': action.location });
			break;
		case 'edit':
			doAction({ 'type': 'edit', 'location': action.location, 'oldText': action.newText, 'newText': action.oldText });
			break;
		case 'class':
			doAction({ 'type': 'class', 'location': action.location, 'oldClass': action.newClass, 'newClass': action.oldClass });
			break;
	}
}

function getUlAtPosition(position)
{
	$current = $('.outline-container:focus ul.outline');

	for(var i = 0; i < position.length; i++)
		$current = $current.children(':not(.ignore)').nth(position[i]).children('ul');

	return $current;
}

function getLiAtPosition(position)
{
	if(position.length == 0)
		throw "There is no root li";
	return getUlAtPosition(position).parent();
}

function doCommand(command)
{
	dropSelection();

	for(var i = 0; i < command.length; i++)
		doAction(command[i]);

	$('.outline-container:focus').data('currentCommand',  []);
	scrollToFocus();
}

function doAction(action)
{
	switch(action.type)
	{
		case 'move':
			var $li = getLiAtPosition(action.oldLocation);

			$li.addClass('ignore');
			var $targetUl = getUlAtPosition(action.newLocation.slice(0, action.newLocation.length - 1));
			$li.removeClass('ignore');

			//the moveLine command's index argument expects a "slot", the space between two items. thus the top is 0, the space between the first and second rows is 1, etc.
			//but action.newLocation is the literal index the element should appear. this does not always correspond to the slot index, hence this logic.
			var desiredIndex = action.newLocation[action.newLocation.length - 1];
			if($targetUl.children().nth(desiredIndex).prevAll().contains($li[0]))
				desiredIndex += 1;

			moveLine($li, $targetUl, desiredIndex, true);
			unionSelect($li);
			break;
		case 'insert':
			unionSelect(addLine(getUlAtPosition(action.location.slice(0, action.location.length - 1)), action.location[action.location.length - 1], action.line));
			break;
		case 'delete':
			deleteLine(getLiAtPosition(action.location));
			break;
		case 'open':
			var $li = getLiAtPosition(action.location);
			openLine($li);
			unionSelect($li);
			break;
		case 'close':
			var $li = getLiAtPosition(action.location);
			closeLine($li);
			unionSelect($li);
			break;
		case 'expand':
			var $li = getLiAtPosition(action.location);
			expandLine($li);
			unionSelect($li);
			break;
		case 'collapse':
			var $li = getLiAtPosition(action.location);
			collapseLine($li);
			unionSelect($li);
			break;
		case 'edit':
			var $li = getLiAtPosition(action.location);
			$li.find('> .line > .text').html(action.newText);
			unionSelect($li);
			break;
		case 'class':
			var $li = getLiAtPosition(action.location);
			setBulletClass($li, action.newClass);
			unionSelect($li);
			break;
	}
}

function debug_updateHistory($container)
{
	return;
	if(typeof($container) == 'undefined')
		$container = getCurrentOutline();

	$('#undo-history').children().remove();
	$('#undo-history').append(
		$.map($container.data('undoHistory'), function(command)
		{
			var $li = $('<li class="command"><ul></ul></li>');

			$li.children('ul').append(
				$.map(command, function(action)
				{
					return $('<li class="action">' + stringifyAction(action) + '</li>')[0];
				})
			);

			return $li[0];
		})
	);

	$('#redo-history').children().remove();
	$('#redo-history').append(
		$.map($container.data('redoHistory'), function(command)
		{
			var $li = $('<li class="command"><ul></ul></li>');

			$li.children('ul').append(
				$.map(command, function(action)
				{
					return $('<li class="action">' + stringifyAction(action) + '</li>')[0];
				})
			);

			return $li[0];
		})
	);
}

function stringifyAction(action)
{
	switch(action.type)
	{
		case 'move':
			return "Move from " + JSON.stringify(action.oldLocation) + " to " + JSON.stringify(action.newLocation);
		case 'insert':
			return "Insert at " + JSON.stringify(action.location);
		case 'delete':
			return "Delete at " + JSON.stringify(action.location);
		case 'open':
			return "Open at " + JSON.stringify(action.location);
		case 'close':
			return "Close at " + JSON.stringify(action.location);
		case 'expand':
			return "Expand at " + JSON.stringify(action.location);
		case 'collapse':
			return "Collapse at " + JSON.stringify(action.location);
		case 'edit':
			return "Edit at " + JSON.stringify(action.location);
		case 'class':
			return "Bullet class change at " + JSON.stringify(action.location);
	}
}

function undo()
{
	var $container = getCurrentOutline();

	if($container.data('undoHistory').length == 0)
		return;

	var command = $container.data('undoHistory').pop();
	$container.data('redoHistory').push(command);
	undoCommand(command);
	debug_updateHistory();
}

function redo()
{
	var $container = $('.outline-container:focus');

	if($container.data('redoHistory').length == 0)
		return;
	var command = $container.data('redoHistory').pop();
	$container.data('undoHistory').push(command);
	doCommand(command);
	debug_updateHistory();
}

function endCommand()
{
	$('.outline-container').each(function(index, element)
	{
		var $container = $(element);

		if($container.data('currentCommand').length == 0)
			return;

		$container.data('isDirty', true);
		$container.data('undoHistory').push($container.data('currentCommand'));
		$container.data('currentCommand',  []);
		$container.data('redoHistory',  []);

		debug_updateHistory($container);
	});
}

function pushAction(action, $container)
{
	if(typeof($container) == 'undefined')
		$container = getCurrentOutline();
	$container.data('currentCommand').push(action);
}

/* End History */

/* Clipboard */

function copySelectedLines()
{
	clipboard = getSelectedLines().map(function(index, element) { return serializeLine($(element)); }).get();
}

function cutSelectedLines()
{
	copySelectedLines();
	deleteSelection();
}

function pasteAfter()
{
	var $focus = getCurrentOutline().find('.focus');
	if($focus.length == 0)
		return;

	var startIndex = $focus.index() + 1;
	var $targetUl = $focus.parent();

	dropSelection();

	$.each(clipboard, function(index, line)
	{
		unionSelect(addLine($targetUl, startIndex + index, line));
	});

	endCommand();
}

function pasteBefore()
{
	var $focus = getCurrentOutline().find('.focus');
	if($focus.length == 0)
		return;

	var startIndex = $focus.index();
	var $targetUl = $focus.parent();

	dropSelection();

	clipboard.reverse();
	$.each(clipboard, function(index, line)
	{
		unionSelect(addLine($targetUl, startIndex, line));
	});

	clipboard.reverse();

	endCommand();
}

/* End Clipboard */

/* Mouse Behaviors */

function initInsert()
{
	$('.outline-container li > span.line > span.bullet').live('click', function(e)
	{
		select($(this).closest('li'));
		bulletAction($(this).closest('li'));

		$potentialDragLine = null;
		e.stopPropagation();
	});

	$('.outline-container ul').live('click', function(e)
	{
		if(e.target !== this && !$(e.target).hasClass('line-number'))
			return;

		insertLine($(this), indexOf($(this), $(e.target).offset().top, e.offsetY));

		$potentialDragLine = null;
		e.stopPropagation();
	});

	$('.outline-container ul').live('mousemove', function(e)
	{
		var $this = $(this);
		if(( (e.target !== this && !$(e.target).hasClass('line-number') ) && !dragging) || $this.parents('li.dragging').length > 0)
		{
			$this.removeClass('moving').removeClass('inserting');
			return;
		}
		e.stopPropagation();

		var i = indexOf($this, $(e.target).offset().top, e.offsetY);

		var pos = 0;
		if($this.children().length == 0)
		{
			;
		}
		else if(i == $this.children().length)
		{
			$item = $this.children().nth(i - 1);
			pos = $item.offset().top - $item.parent().offset().top + $item.outerHeight(true) - 20;
		}
		else
		{
			if(i == 0)
				pos = 0;
			else
			{
				$item = $this.children().nth(i);
				pos = $item.offset().top - $item.parent().offset().top - 10;
			}
		}

		//this will happen right after a top insert, while the new item is still animating
		if(pos < 0)
			pos = i = 0;

		$this.css('background-position', '0px ' + pos + 'px');

		$this.addClass(dragging ? 'moving' : 'inserting');

		if($this.children().length == 0)
			$this.removeClass('top').removeClass('bottom');
		else if(i == 0)
			$this.removeClass('bottom').addClass('top');
		else if(i == $this.children().length)
			$this.removeClass('top').addClass('bottom');
		else
			$this.removeClass('top').removeClass('bottom');

	});

	$('.outline-container ul').live('mouseleave', function(e)
	{
		$(this).removeClass('moving').removeClass('inserting');
	});
}

function indexOf($ul, targetOffset, eventOffset)
{
	for(var i = 0; i < $ul.children().length; i++)
	{
		var $item = $ul.children().nth(i);
		var itemCenter = $item.offset().top - $item.parent().offset().top + ($item.outerHeight() / 2);

		if(itemCenter > targetOffset - $ul.offset().top + eventOffset)
			break;
	}

	return i;
}

function initDrag()
{
	var dragStart = null;
	var $potentialDragLine = null;

	$('.outline-container span.bullet').live('mouseup', function(e)
	{
		var $this = $(this);

		if(!dragging || $this.closest('li.dragging').length > 0)
			return;

		clearTimeout($this.data('timer'));

		$this.removeClass('droppable');
		$this.closest('ul').removeClass('child-dropping');

		var $destUl = $this.parent().siblings('ul');
		moveSelection($destUl, $destUl.children().length); //important not to use -1, in case multiple items are being dropped

		getSelectedLines().removeClass('dragging');
		dragging = false;
		e.stopPropagation();
	});

	$('.outline-container span.bullet').live('mouseenter', function(e)
	{
		var $this = $(this);

		if(!dragging || $this.closest('li.dragging').length > 0)
			return;

		var $targetLi = $this.closest('li');
		$this.data('timer', setTimeout(function()
		{
			openLine($targetLi);
			endCommand();
		}, 500));

		$this.addClass('droppable');
		$this.closest('ul').addClass('child-dropping');
	});

	$('.outline-container span.bullet').live('mouseleave', function(e)
	{
		var $this = $(this);
		if(!$this.hasClass('droppable'))
			return;

		clearTimeout($this.data('timer'));

		$this.removeClass('droppable');
		$this.closest('ul').removeClass('child-dropping');
	});

	$('.outline-container ul').live('mouseup', function(e)
	{
		$potentialDragLine = null;
		if(!dragging)
			return;

		var $this = $(this);

		$this.removeClass('moving');
		var offset = $(e.target).offset().top - $this.offset().top + e.offsetY;
		if($this.closest('li.dragging').length == 0)
			moveSelection($this, indexOf($this, $(e.target).offset().top, e.offsetY));

		getSelectedLines().removeClass('dragging');
		dragging = false;
		e.stopPropagation();
	});

	$('.outline-container span.line').live('mousedown', function(e)
	{
		if(e.button != 0 || e.metaKey || e.shiftKey)
			return;

		dragStart = { 'x': e.pageX, 'y': e.pageY };
		$potentialDragLine = $(this).closest('li');
	});

	$('.outline-container').live('mousemove', function(e)
	{
		if($potentialDragLine != null && (Math.abs(e.pageX - dragStart.x) > 3 || Math.abs(e.pageY - dragStart.y) > 3))
		{
			if(!$potentialDragLine.hasClass('selected'))
				select($potentialDragLine);
			else if(!$potentialDragLine.hasClass('focus'))
				setFocus($potentialDragLine);

			getSelectedLines().addClass('dragging');
			dragging = true;
			$potentialDragLine = null;
		}
	});
}

function initSelect()
{
	$('.outline-container span.line').live('click', function(e)
	{
		if(e.shiftKey && e.metaKey)
			deselectTo($(this).closest('li'));
		else if(e.shiftKey)
			unionSelectTo($(this).closest('li'));
		else if(e.metaKey)
			unionSelect($(this).closest('li'), 'toggle');
		else
			select($(this).closest('li'));
	});
}

function dropSelection($container)
{
	if(typeof($container) == 'undefined')
		$container = getCurrentOutline();
	$container.find('li.selected, li.focus').removeClass('selected').removeClass('focus');
}

/* Selection Commands */

function select($li)
{
	//if($li.hasClass('focus'))
	//	return;

	$previousSelection = getSelectedLines();
	$previousSelection.removeClass('selected').removeClass('focus').find('> span.line > span.text').attr('contenteditable', 'false');

	if($li == null)
		return;

	$li.addClass('selected').last().addClass('focus');
	scrollToFocus();
	var $text = $li.find('> span.line > span.text');
	$text.attr('contenteditable', 'true');
}

function setFocus($li)
{
	getCurrentOutline().find('li.focus').removeClass('focus');
	$li.addClass('focus');
}

function unionSelectTo($li)
{
	if($li.hasClass('focus'))
		return;

	var $current = $('.outline-container:focus li.focus');
	$current.removeClass('focus').find('> .line > .text').attr('contenteditable', 'false');

	if($current.add($li).first()[0] == $current[0])
		while($current[0] != $li[0])
		{
			$current = getVisuallyBelow($current);
			$current.addClass('selected');
		}
	else
		while($current[0] != $li[0])
		{
			$current = getVisuallyAbove($current);
			$current.addClass('selected');
		}

	$li.addClass('focus').find('> .line > .text').attr('contenteditable', 'true');
}

function deselectTo($li)
{
	if($li.hasClass('focus'))
		return;

	var $current = $('.outline-container:focus li.focus');
	$current.removeClass('focus').find('> .line > .text').attr('contenteditable', 'false');

	if($current.add($li).first()[0] == $current[0])
		while($current[0] != $li[0])
		{
			$current.removeClass('selected');
			$current = getVisuallyBelow($current);
		}
	else
		while($current[0] != $li[0])
		{
			$current.removeClass('selected');
			$current = getVisuallyAbove($current);
		}

	$li.addClass('selected').addClass('focus').find('> .line > .text').attr('contenteditable', 'true');
	scrollToFocus();
}

function unionSelect($li, option)
{
	if($li == null)
		return;

	if(option === 'toggle' && $li.hasClass('selected'))
	{
		if(!$li.hasClass('focus')) //todo
			$li.removeClass('selected');
	}
	else
	{
		var $previousFocus = $('.outline-container:focus li.focus');
		$previousFocus.removeClass('focus').find('> .line > .text').attr('contenteditable', 'false');

		if($li.hasClass('selected') || option === 'deselect current')
			$previousFocus.removeClass('selected');

		$li.addClass('selected').addClass('focus').find('> .line > .text').attr('contenteditable', 'true');
	}
	scrollToFocus();
}

/* End Selection Commands */

/* Misc */

function scrollToFocus(scrollToBottom)
{
	var buffer = 20;
	var $wrapper = $('.outline-container:focus > .scroll-wrapper');
	var scrollHeight = $wrapper.height() - 1; //for the margin
	var $target = $('.outline-container:focus li.focus');

	if($target.length == 0)
		return;

	var bottom = $target.offset().top + 1 + Math.max(19, $target.height()) - $wrapper.offset().top; //plus 1 is for the margin of -1. Math.max(19, height) is for newly created animating rows

	if(bottom > scrollHeight - buffer)
		$wrapper.scrollTop($wrapper.scrollTop() + (bottom - scrollHeight) + buffer);

	if(scrollToBottom)
		return;

	var top = $target.offset().top + 1 - $wrapper.offset().top; //plus 1 is for the margin of -1
	if(top < buffer)
		$wrapper.scrollTop($wrapper.scrollTop() + top - buffer);
}

function getVisuallyAbove($li)
{
	var $current = $li.prev();

	if($current.length == 0)
		return $li.closest('ul').hasClass('outline') ? $li : $li.closest('ul').closest('li');

	while($current.hasClass('open'))
		$current = $current.children('ul').children().last();

	return $current;
}

function getVisuallyBelow($li)
{
	if($li.hasClass('open'))
		return $li.children('ul').children().first();

	var $current = $li;

	while($current.length != 0 && $current.next().length == 0)
		$current = $current.closest('ul').closest('li');

	return $current.length == 0 ? $li : $current.next();
}

function getSelectedLines()
{
	return $('.outline-container:focus li.selected');
}

/* End Misc*/

/* Actions */

function deleteLine($li)
{
	if($li.length == 0)
		return false;

	if($li.length > 1)
		throw "deleteLine cannot operate on multiple lines";

	if($li.siblings(':not(.ignore)').length == 0)
		$li.parent().closest('li').removeClass('closed').removeClass('open');

	pushAction({ 'type': 'delete', 'location': getAbsoluteLocation($li), 'line': serializeLine($li) });
	$li.addClass('ignore').slideUp(options.animationSpeed, function() { $(this).remove(); });

	return true;
}

function addLine($ul, index, line)
{
	if($ul.length == 0)
		return false;

	if($ul.length > 1)
		throw "addLine cannot operate on multiple lines";

	var $newLine = buildLine(line);

	if(index == -1 || index == $ul.children().length)
		$ul.append($newLine);
	else
		$ul.children().nth(index).before($newLine);

	pushAction({ 'type': 'insert', 'location': getAbsoluteLocation($newLine), 'line': serializeLine($newLine) });
	$newLine.hide().slideDown(options.animationSpeed);
	if(!$ul.parent().hasClass('closed'))
		$ul.parent().addClass('open');
	return $newLine;
}

function moveLine($li, $targetUl, index, customAnimation)
{
	if($li.length == 0 || $targetUl.length == 0)
		return;

	if($li.length > 1 || $targetUl.length > 1)
		throw "moveLine cannot operate on multiple lines";

	if($targetUl.children().length == 0)
		$targetUl.closest('li').addClass('open');

	var $oldParent = $li.parent();
	var $oldOutline = $li.closest('.outline-container');
	var oldLocation = getAbsoluteLocation($li);

	//suppresses the default animation. used for indenty operations, which animate uniquely
	if(customAnimation === true)
	{
		if(index == -1 || index == $targetUl.children().length)
			$li.appendTo($targetUl);
		else if($targetUl.children(':not(.ignore)')[index] != $li[0]) //trying to insert an element before itself just deletes the element.
			$li.insertBefore($targetUl.children(':not(.ignore)').nth(index));
	}
	else
	{
		if(index == -1 || index == $targetUl.children().length)
			$li.appendTo($targetUl);
		else if($targetUl.children(':not(.ignore)')[index] != $li[0]) //trying to insert an element before itself just deletes the element.
			$li.insertBefore($targetUl.children(':not(.ignore)').nth(index));
	}

	if($oldParent.children().length == 0)
		$oldParent.show().parent().removeClass('open').removeClass('closed');

	var newLocation = getAbsoluteLocation($li);
	var $newOutline = $li.closest('.outline-container');

	if($oldOutline[0] != $newOutline[0])
	{
		pushAction({ 'type': 'delete', 'location': oldLocation, 'line': serializeLine($li) }, $oldOutline);
		pushAction({ 'type': 'insert', 'location': newLocation, 'line': serializeLine($li) }, $newOutline);
	}
	else if(!areAbsoluteLocationsTheSame(oldLocation, newLocation))
		pushAction({ 'type': 'move', 'oldLocation': oldLocation, 'newLocation': newLocation }, $oldOutline);

}

function areAbsoluteLocationsTheSame(a, b)
{
	if(a.length != b.length)
		return false;

	for(var i = 0; i < a.length; i++)
		if(a[i] != b[i])
			return false;

	return true;
}

function openLine($li)
{
	if($li.length > 1)
		throw "openLine cannot operate on multiple lines";

	if($li.hasClass('open') || $li.find('> ul > li:not(.ignore)').length == 0)
		return;

	$li.removeClass('closed').addClass('open').children('ul').slideDown2({'duration': options.animationSpeed, 'step': scrollToFocus, 'complete': scrollToFocus });
	pushAction({ 'type': 'open', 'location': getAbsoluteLocation($li) });
}

function closeLine($li)
{
	if($li.length > 1)
		throw "closeLine cannot operate on multiple lines";

	if($li.hasClass('closed') || $li.find('> ul > li:not(.ignore)').length == 0)
		return;

	if($li.find('li.focus').length > 0)
		$li.addClass('focus').find('li.focus').removeClass('focus');

	$li.find('.selected').removeClass('selected');

	$li.removeClass('open').addClass('closed').children('ul').slideUp(options.animationSpeed);
	pushAction({ 'type': 'close', 'location': getAbsoluteLocation($li) });
}

function collapseLine($li, suppressActionLog)
{
	if($li.length > 1)
		throw "collapseLine cannot operate on multiple lines";

	if($li.hasClass('collapsed'))
		return;

	$li.children('span.line').animate({'height': '20px'}, $li.children('span.line').height() == 20 ? 0 : options.animationSpeed, function() { $li.addClass('collapsed'); scrollToFocus(); });

	if(suppressActionLog !== true)
		pushAction({ 'type': 'collapse', 'location': getAbsoluteLocation($li) });
}

function expandLine($li, suppressActionLog)
{
	if($li.length > 1)
		throw "expandLine cannot operate on multiple lines";

	if(!$li.hasClass('collapsed'))
		return;

	$li.removeClass('collapsed');
	var naturalHeight = $li.children('span.line').css('height', 'auto').height();
	$li.children('span.line').height(20).animate({'height': naturalHeight}, {'duration': options.animationSpeed, 'step':scrollToFocus, 'complete': function() { $(this).css('height', 'auto'); scrollToFocus(); }});
	if(suppressActionLog !== true)
		pushAction({ 'type': 'expand', 'location': getAbsoluteLocation($li) });
}

function setBulletClass($li, newClass)
{
	if($li.length > 1)
		throw "setBulletClass cannot operate on multiple lines";

	var oldClass = getBulletClass($li);

	if(oldClass == newClass)
		return;

	$li.removeClass(oldClass);
	$li.addClass(newClass);

	pushAction({'type': 'class', 'location': getAbsoluteLocation($li), 'oldClass': oldClass, 'newClass': newClass});
}

/* End Actions */

/* Commands */

function cycleSelectionBulletClass(classes)
{
	var $selection = getSelectedLines();

	$selection.each(function(index, element)
	{
		var $li = $(element);

		var classIndex = classes.indexOf(getBulletClass($li));

		if(classIndex == -1)
			setBulletClass($li, classes[0]);
		else if(classIndex == classes.length - 1)
			setBulletClass($li, '');
		else
			setBulletClass($li, classes[classIndex + 1]);
	});

	endCommand();
}

function toggleSelectionBulletClass(newClass)
{
	var $selection = getSelectedLines();

	$selection.each(function(index, element)
	{
		var $li = $(element);

		if($li.hasClass(newClass))
			setBulletClass($li, '');
		else
			setBulletClass($li, newClass);
	});

	endCommand();
}

function insertLine($ul, index)
{
	var $newLine = addLine($ul, index, { 'text': '', 'class': '', 'children': [], 'collapsed': false, 'open': false });
	if(!$ul.hasClass('outline'))
		openLine($ul.parent());
	endCommand();
	select($newLine);
	enterEditMode($newLine);
}

function deselectSelectedChildren()
{
	$('.outline-container:focus li.selected li.focus').removeClass('focus').parents('li.selected').first().addClass('focus');
	$('.outline-container:focus li.selected li.selected').removeClass('selected');
}

function deleteSelection()
{
	deselectSelectedChildren();

	var $focus = $('.outline-container:focus li.focus');

	var $newFocus = $focus.nextAll(':not(.selected)').first();
	if($newFocus.length == 0)
		$newFocus = $focus.prevAll(':not(.selected)').first();
	if($newFocus.length == 0)
		$newFocus = $focus.closest('li:not(.selected)');

	getSelectedLines().each(function(index, element) { deleteLine($(element)) } );
	select($newFocus);
	endCommand();
}

function moveSelection($targetUl, index)
{
	var $newOutline = $targetUl.closest('.outline-container');
	if($newOutline[0] != getCurrentOutline()[0])
		dropSelection($newOutline);

	var $selection = getSelectedLines();

	var increment = 0;
	$selection.reach(function(i, element)
	{
		var $li = $(element);
		var sameParent = $li.parent()[0] == $targetUl[0];
		var oldIndex = $li.index();

		moveLine($li, $targetUl, index + increment);
		if(sameParent && oldIndex <= index)
			increment--;
	});


	//should drop the new outline's current selection
	$newOutline.focus();

	scrollToFocus();
	endCommand();
}

function moveSelectionUp()
{
	getSelectedLines().each(function(index, element)
	{
		var $li = $(element);
		var $prev = $li.prev(':not(.ignore)');
		if($prev.length == 0 || $prev.hasClass('selected'))
			return;

		moveLine($li, $li.parent(), $li.index() - 1);
	});

	scrollToFocus();
	endCommand();
}

function moveSelectionDown()
{
	getSelectedLines().reach(function(index, element)
	{
		var $li = $(element);
		var $next = $li.next(':not(.ignore)');
		if($next.length == 0 || $next.hasClass('selected'))
			return;
		moveLine($li, $li.parent(), $li.index() + 2);
	});

	scrollToFocus();
	endCommand();
}

function bulletAction($li)
{
	if($li.length == 0)
		return;
	if($li.length > 1)
		throw "Cannot invoke bulletAction for multiple lines";

	if($li.hasClass('closed'))
	{
		openLine($li);
		endCommand();
	}
	else if($li.hasClass('open'))
	{
		closeLine($li)
		endCommand();
	}
	else
		insertLine($li.children('ul'), 0);
}

function indentSelectionWithoutChildren()
{
	getSelectedLines().each(function(index, element)
	{
		var $li = $(element);

		if($li.prev(':not(.ignore)').length == 0)
			return;

		var $newParent = $li.prev(':not(.ignore)');

		moveLine($li, $newParent.children('ul'), -1, true);

		$li.find('> ul > li').reach(function(jndex, child)
		{
			moveLine($(child), $li.parent(), $li.index() + 1, true);
		});

		if($newParent.hasClass('closed'))
			openLine($newParent);
		else
			$li.children('span.line').css('margin-left', '-20px').animate({ 'margin-left': 0 }, { 'duration': options.animationSpeed, 'queue': false,  'complete': function() { $(this).css('margin-left', '') } });
	});

	endCommand();
}

function outdentSelection()
{
	getSelectedLines().each(function(index, element)
	{
		var $li = $(element);

		if($li.parent().hasClass('outline'))
			return;

		$li.nextAll(':not(.ignore)').css('margin-left', '-20px').animate({ 'margin-left': 0 }, { 'duration': options.animationSpeed, 'queue': false,  'complete': function() { $(this).css('margin-left', '') } });
		$li.nextAll(':not(.ignore)').each(function(jindex, next)
		{
			moveLine($(next), $li.children('ul'), -1, true);
		});

		moveLine($li, $li.parent().parent().parent(), $li.parent().parent().index() + 1, true);

		$li.css('margin-left', '20px').animate({ 'margin-left': 0 }, { 'duration': options.animationSpeed, 'queue': false,  'complete': function() { $(this).css('margin-left', '') } });
	});

	endCommand();
}

function indentSelection()
{
	getSelectedLines().each(function(index, element)
	{
		var $li = $(element);

		if($li.prev(':not(.ignore)').length == 0)
			return;

		var $newParent = $li.prev();

		moveLine($li, $newParent.children('ul'), -1, true);

		if($newParent.hasClass('closed'))
			openLine($newParent);
		else
			$li.css('margin-left', '-20px').animate({ 'margin-left': 0 }, { 'duration': options.animationSpeed, 'queue': false,  'complete': function() { $(this).css('margin-left', '') } });
	});

	endCommand();
}

function outdentSelectionChildren()
{

	getSelectedLines().each(function(index, element)
	{
		var $li = $(element);

		if($li.find('> ul > li').length == 0)
			return;

		$li.find('> ul > li').css('margin-left', '20px').animate({ 'margin-left': 0 }, { 'duration': options.animationSpeed, 'queue': false,  'complete': function() { $(this).css('margin-left', '') } });
		$li.find('> ul > li').reach(function(jndex, child)
		{
			moveLine($(child), $li.parent(), $li.index() + 1, true);
		});
	});

	endCommand();
}

function openSelection()
{
	getSelectedLines().each(function(index, element)
	{
		openLine($(element));
	});

	endCommand();
}

function closeSelection()
{
	getSelectedLines().each(function(index, element)
	{
		closeLine($(element));
	});

	endCommand();
}

function expandSelection()
{
	getSelectedLines().each(function(index, element)
	{
		expandLine($(element));
	});

	endCommand();
}

function collapseSelection()
{
	getSelectedLines().each(function(index, element)
	{
		collapseLine($(element));
	});

	endCommand();
}

/* End Commands */

/* Editing Mode */

function enterEditMode($li, caretAtBeginning)
{
	scrollToFocus(true);
	window.getSelection().selectAllChildren($li.find('> span.line > span.text')[0]);
	if(caretAtBeginning === true)
		window.getSelection().collapseToStart();
	else
		window.getSelection().collapseToEnd();
}

function exitEditMode()
{
	var $text = $('span.text:focus');
	if($text.length == 0)
		return;

	$text.blur();
	$text.closest('.outline-container').focus();
}

function getCurrentOutline()
{
	return $(':focus').closest('.outline-container');
}

function initEditing()
{
	$('.outline-container span.text').live('paste', function(e)
	{
		var selection = window.getSelection();
		if(!selection.isCollapsed)
			selection.deleteFromDocument();
		var anchorOffset = selection.anchorOffset;
		var anchorNode = selection.anchorNode;

		$('#clipboard').val('').focus();
		var $this = $(this);
		setTimeout(function()
		{
			$this.focus();
			var newSelection = window.getSelection();
			var newRange = document.createRange();
			newRange.setEnd(newSelection.anchorNode, anchorOffset);
			newRange.setStart(newSelection.anchorNode, anchorOffset);
			newSelection.removeAllRanges();
			newSelection.addRange(newRange);
			document.execCommand('InsertHTML', true, $('#clipboard').val());
			$('#clipboard').val(''); //this sort of fixes an annoying bug where undo causes the caret to move to the #clipboard. this breaks undo altogether, but it is better. i don't know why this does that.
		});
	});

	$('.outline-container span.text').live('DOMNodeInserted', function(e)
	{
		alert("Illegal DOM Node Insertion -- attempting to sanitize");
		if(e.target != this)
		$(e.target).remove();
		return false;
	});

	$('.outline-container li.selected > span.line > span.text').live('mousedown', function(e) { e.stopPropagation(); }); //allows drag-selection of text

	$('.outline-container li.focus > span.line:not(.editing)').live('mousedown', function(e) { return false; }); //enables you to drag the focus -- otherwise mousedown enters edit mode

	$('.outline-container li.selected > span.line > span.text').live('keydown', function(e)
	{
		var selection = window.getSelection();
		var $selected = $(this).closest('li');

		if(e.which == keys.enter)
		{
			if(e.shiftKey || e.metaKey || e.altKey || !options.enterKeyExitsEditMode)
				document.execCommand('InsertHTML', true, '\n');
			else
				exitEditMode();
		}
		else if (e.which == keys.tab)
		{
			//indent($('.text:focus').closest('li'));
			//document.execCommand('InsertHTML', true, '&#09;');
		}
		else if(e.which == keys.escape || e.which == keys.f2)
		{
			exitEditMode();
		}
		else if(e.which == keys.backspace && this.firstChild.data.length == 1) //this prevents you from deleting the last newline character of a node, which must exist.
			;
		else if(e.which == keys.down && selection.isCollapsed && selection.focusOffset == this.lastChild.data.length - 1) //the '-1' is because all lines must always end with a newline character.
		{
			exitEditMode();
			select(getVisuallyBelow($selected));
		}
		else if(e.which == keys.up && selection.isCollapsed && selection.focusOffset == 0)
		{
			exitEditMode();
			select(getVisuallyAbove($selected));
		}
		else
			return;

		return false;
	});

	$('.outline-container li.selected > span.line > span.text').live('focus', function()
	{
		var $this = $(this);
		$this.removeClass('empty');

		if($this.closest('li').hasClass('collapsed'))
		{
			expandLine($this.closest('li'), true);
			$this.data('collapseOnBlur', true);
		}

		$this.data('oldText', $this.text());
		$this.parent().closest('.outline-container').andSelf().addClass('editing');
	});

	$('.outline-container li.selected > span.line > span.text').live('blur', function()
	{
		var $this = $(this);

		if($this.data('collapseOnBlur') === true)
		{
			$this.removeData('collapseOnBlur');
			collapseLine($this.closest('li'), true);
		}

		if($this.text() != $this.data('oldText'))
		{
			var $container = $(this).closest('.outline-container');
			pushAction({ 'type': 'edit', 'location': getAbsoluteLocation($this.closest('li')), 'oldText': $this.data('oldText'), 'newText': $this.text() }, $container);
			endCommand();
		}

		$this.removeData('oldText');

		$this.parent().closest('.outline-container').andSelf().removeClass('editing');
		if($this.text() == '\n')
			$this.addClass('empty');
		window.getSelection().empty();
	});
}

/* End Editing Mode*/

function initKeyboard()
{
	$(window).keydown(function(e)
	{
		if(isInputElement(e.target))
			return;

		if(dragging)
			return false;

		var $focus = $('.outline-container:focus li.focus');
		if($focus.length > 1)
			throw "Multiple focii detected";

		if(e.shiftKey && e.metaKey)
		{
			switch(e.which)
			{
				case keys.enter:
					insertLine($focus.children('ul'), 0);
					break;
				case keys.left:
				case keys.h:
					moveLeft($('.outline-container:focus'));
					break;
				case keys.right:
				case keys.l:
					moveRight($('.outline-container:focus'));
					break;
				case keys.up:
				case keys.k:
					unionSelect(getVisuallyAbove($focus), 'deselect current');
					break;
				case keys.down:
				case keys.j:
					unionSelect(getVisuallyBelow($focus), 'deselect current');
					break;
				case keys.home:
					unionSelectTo($focus.closest('.outline').children(':first'));
					break;
				case keys.z:
					redo();
					break;
				default: return;
			}
		}
		else if(e.shiftKey)
		{
			switch(e.which)
			{
				case keys.enter:
					if($focus.length == 0)
						insertLine($('.outline-container:focus ul.outline'), 0);
					else
						insertLine($focus.parent(), $focus.index());
					break;
				case keys.left:
				case keys.h:
					collapseSelection();
					break;
				case keys.right:
				case keys.l:
					expandSelection();
					break;
				case keys.up:
				case keys.k:
					unionSelect(getVisuallyAbove($focus));
					break;
				case keys.down:
				case keys.j:
					unionSelect(getVisuallyBelow($focus));
					break;
				case keys.tab:
					outdentSelection();
					break;
				case keys.q:
					outdentSelectionChildren();
					break;
				case keys.e:
				case keys.f2:
					enterEditMode($focus, true);
					break;
				case keys.home:
					if($focus.parent().hasClass('outline'))
						unionSelectTo($focus.siblings().andSelf().filter(':first'));
					else
						unionSelectTo($focus.parent().parent());
					break;
				case keys.grave:
					if($('.outline-container:focus').prev('.outline-container').focus().length == 0)
						$('.outline-container:last').focus();
					break;
				default: return;
			}
		}
		else if(e.metaKey)
		{
			switch(e.which)
			{
				case keys.enter:
					insertLine($focus.children('ul'), -1);
					break;
				case keys.down:
					moveSelectionDown();
					break;
				case keys.j:
					if(e.altKey)
						return;
					else
						moveSelectionDown();
					break;
				case keys.up:
				case keys.k:
					moveSelectionUp();
					break;
				case keys.home:
					select($focus.closest('.outline').children(':first'));
					break;
				case keys.z:
					undo();
					break;
				case keys.y:
					redo();
					break;
				case keys.a:
					select($('.outline-container:focus li').not('li.closed li'));
				break;
				default: return;
			}
		}
		else
		{
			switch(e.which)
			{
				case keys.delete:
				case keys.backspace:
					deleteSelection();
					break;
				case keys.down:
				case keys.j:
					if($focus.length == 0)
						select($('.outline-container:focus ul.outline > li:first'));
					else
						select(getVisuallyBelow($focus));
					break;
				case keys.up:
				case keys.k:
					select(getVisuallyAbove($focus));
					break;
				case keys.left:
				case keys.h:
					if($focus.hasClass('open'))
						closeSelection();
					else if (!$focus.parent().hasClass('outline'))
						select($focus.parent().parent());
					break;
				case keys.right:
				case keys.l:
					if($focus.hasClass('open'))
					{
						if($focus.next().length == 0)
							select($focus.find('> ul > li:last'));
						else
							select($focus.next());
					}
					else
						openSelection();
					break;
				case keys.e:
				case keys.f2:
					enterEditMode($focus);
					break;
				case keys.tab:
					indentSelection();
					break;
				case keys.q:
					indentSelectionWithoutChildren();
					break;
				case keys.enter:
					if($focus.length == 0)
						insertLine($('.outline-container:focus ul.outline'), -1);
					else
						insertLine($focus.parent(), $focus.index() + 1);
					break;
				case keys.home:
					select($focus.siblings().andSelf().filter(':first'));
					break;
				case keys.end:
					select($focus.siblings().andSelf().filter(':last'));
					break;
				case keys.grave:
					if($('.outline-container:focus').next('.outline-container').focus().length == 0)
						$('.outline-container:first').focus();
					break;
				case keys.n:
					cycleSelectionBulletClass(['note']);
					break;
				case keys.z:
					cycleSelectionBulletClass(['important']);
					break;
				case keys.x:
					cycleSelectionBulletClass(['todo', 'done']);
					break;
				case keys.c:
					cycleSelectionBulletClass(['red', 'yellow', 'green']);
					break;
				default:
					console.log(e.which)
					return;
			}
		}

		return false;
	});
}

function initFirstStart()
{
	if(localStorage.getItem('trash') == undefined)
		localStorage.setItem('trash', '[]');

	if(localStorage.getItem('workspace') == undefined)
		localStorage.setItem('workspace', '[]');

	if(localStorage.getItem('options') == undefined)
		localStorage.setItem('options', '{"animationSpeed":100,"enterKeyExitsEditMode":true}');

	if(localStorage.getItem('outlines') == undefined)
		localStorage.setItem('outlines', '[]');
}

function getScrollHeight()
{
	return $('body').height() - (10 + 20 + 1 + 1 + 10);
}

function isInputElement(element)
{
	var $element = $(element);
	return $element.attr('contenteditable') === 'true' || $element.is('input:text') || $element.is('textarea');
}

function overrideCopy(e)
{
	if(isInputElement(e.target))
		return;

	var $prevFocus = $('.outline-container:focus');
	$prevFocus.addClass('clipboarding');

	$('#clipboard').val(Ion.stringify(getSelectedLines().not('.selected .selected'))).select();

	setTimeout(function()
	{
		$prevFocus.focus().removeClass('clipboarding');
	});
}

function overrideCut(e)
{
	if(isInputElement(e.target))
		return;

	var $prevFocus = $('.outline-container:focus');
	$prevFocus.addClass('clipboarding');

	$('#clipboard').val(Ion.stringify(getSelectedLines().not('.selected .selected'))).select();

	setTimeout(function()
	{
		$prevFocus.focus().removeClass('clipboarding');
		deleteSelection();
	});
}

function overridePaste(e)
{
	if(isInputElement(e.target))
		return;

	var $prevFocus = $('.outline-container:focus');
	$prevFocus.addClass('clipboarding');

	$('#clipboard').val('').focus();

	setTimeout(function()
	{
		$prevFocus.focus().removeClass('clipboarding');
		var $focus = getCurrentOutline().find('.focus');
		if($focus.length == 0)
			return;

		var text = $('#clipboard').val();
		var lines = Ion.tryParse(text);

		var startIndex = $focus.index() + 1;
		var $targetUl = $focus.parent();

		if(lines === false)
		{
			select(addLine($targetUl, startIndex, { 'open': false, 'collapsed': false, 'text': text, 'children': [], 'class': '' }));
		}
		else
		{
			dropSelection();

			$.each(lines, function(index, line)
			{
				unionSelect(addLine($targetUl, startIndex + index, line));
			});
		}

		endCommand();

	});
}

function init()
{
	initFirstStart();
	initInsert();
	initDrag();
	initSelect();
	initKeyboard();
	initEditing();
	initUi();

	// This actually works perfectly:
	$(window).bind('copy', overrideCopy);
	$(window).bind('paste', overridePaste);
	$(window).bind('cut', overrideCut);

	$(window).bind('resize', function()
	{
		$('.scroll-wrapper').css('max-height', getScrollHeight());
	});

	//can't fix this...
	$('.outline-container span.text').live('dragover drop', function(event)
	{
		event.preventDefault();
		return false;
	});

	$('.outline-container:first').focus();
}
