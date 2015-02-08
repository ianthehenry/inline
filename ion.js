function Ion() { }

Ion.init = function()
{
	Ion.defaultClassCharacter = '-';
	Ion.bulletClassesByCharacter = { };
	Ion.bulletClassesByCharacter[Ion.defaultClassCharacter] = '';
	Ion.escapeCharacter = '\\';
	Ion.openCharacter = '+';
	Ion.collapsedCharacter = '-';
	
	Ion.lineStartCharacters = [Ion.defaultClassCharacter, Ion.openCharacter];
	for(var className in bulletClasses)
	{
		Ion.bulletClassesByCharacter[bulletClasses[className].character] = className;
		Ion.lineStartCharacters.push(bulletClasses[className].character);
	}
	
	Ion.reservedCharacters = Ion.lineStartCharacters.concat([Ion.escapeCharacter, ' ', '\t']);
}


Ion.tryParse = function(str)
{
	try
	{
		return Ion.parse(str);
	}
	catch(e)
	{
		return false;
	}
}

Ion.parse = function(str)
{
	var lines = str.split('\n');
	var indentStack = [0];
	var rootRow = { 'children': [] };
	var targetRow = rootRow;
	
	for(var i = 0; i < lines.length; i++)
	{
		var line = lines[i];
		var changedLevels = false;
		var indentLevel = Ion.getIndentLevel(line);
		
		line = line.replace(/^[ \t]*/, '');
		
		if(indentLevel > indentStack[indentStack.length - 1])
		{
			indentStack.push(indentLevel);
			changedLevels = true;
			if(targetRow.children.length == 0)
				throw "Indentation must start at 0";
			targetRow = targetRow.children[targetRow.children.length - 1];
		}
		else if(indentLevel < indentStack[indentStack.length - 1])
		{
			var indentIndex = $.inArray(indentLevel, indentStack);
			changedLevels = true;
			if(indentIndex == -1)
			{
				debugger;
				throw "Invalid indentation pop";
			}
			
			for(var j = 0; j < indentStack.length - indentIndex; j++)
			{
				indentStack.pop();
				targetRow = targetRow.parent;
			}
		}
		
		if($.inArray(line[0], Ion.lineStartCharacters) != -1)
		{
			targetRow.children.push(Ion.parseLine(line, targetRow));
		}
		else
		{
			//add to the last line
			var text = line[0] == Ion.escapeCharacter ? line.substr(1) : line;
			if(changedLevels)
				throw "Cannot continue line in this context";
			targetRow.children[targetRow.children.length - 1].text += '\n' + text;
		}
	}
	
	return rootRow.children;
}

Ion.parseLine = function(str, parent)
{
	var line = { 'collapsed': false, 'open': false, 'text': '', 'children': [], 'parent': parent, 'class': '' };
				
	var index = 0;
	
	if(str[index] in Ion.bulletClassesByCharacter)
	{
		line.class = Ion.bulletClassesByCharacter[str[index]];
		index++;
	}
	
	if(str[index] == Ion.openCharacter)
	{
		line.open = true;
		index++;
	}
	
	if(str[index] == Ion.collapsedCharacter)
	{
		line.collapsed = true;
		index++;
	}
	
	if(str[index] == Ion.escapeCharacter)
		index++;
	
	line.text = str.substr(index);

	return line;
}

Ion.getIndentLevel = function(line)
{
	var tabWidth = 4;
	var match = /^[ \t]*/.exec(line)[0];
	if(match == null)
		return 0;
	
	var tabCount = 0;
	var tabMatch = /\t/g.exec(match);
	if(tabMatch != null)
		tabCount = tabMatch.length - 1;
	return match.length + tabCount * (tabWidth - 1);
}

Ion.stringify = function($lis)
{
	var result = '';
	
	$lis.each(function(index, element)
	{
		var $li = $(element);
		result += Ion.getTextForLine($li, 0);
	});
	
	return result.substr(0, result.length - 1); //trim the final newline character
}

Ion.getLinePrefix = function($li)
{
	var result = '';
	
	var isOpen = $li.hasClass('open');
	var isCollapsed = $li.hasClass('collapsed');
	
	var bulletClass = getBulletClass($li);
	
	if(bulletClass == '')
	{
		if(!isOpen)
			result += Ion.defaultClassCharacter;
	}
	else
		result += bulletClasses[bulletClass].character;
		
	if(isOpen)
		result += Ion.openCharacter;
		
	if(isCollapsed)
		result += Ion.collapsedCharacter;
	
	return result;
}

Ion.escapeText = function(text, indentLevel)
{	
	var result = '';
	
	var lines = text.substr(0, text.length - 1).split('\n'); //this is because all span texts end with a dummy newline character, required for proper display for some reason.
	for(var i = 0; i < lines.length; i++)
	{
		var line = lines[i];
		
		if(i != 0)
			for(var ii = 0; ii < indentLevel; ii++)
				result += '\t';
		
		if($.inArray(line.substr(0, 1), Ion.reservedCharacters) != -1)
			result += Ion.escapeCharacter;
		result += line;
		result += '\n';
	}
	
	return result;
}

Ion.getTextForLine = function($li, indentLevel)
{
	var result = '';
	
	for(var ii = 0; ii < indentLevel; ii++)
		result += '\t';
	result += Ion.getLinePrefix($li);
	
	var text = $li.find('> .line > .text').text();
	result += Ion.escapeText(text, indentLevel);
	
	$li.find('> ul > li').each(function(index, element)
	{
		result += Ion.getTextForLine($(element), indentLevel + 1);
	});
	
	return result;
}

Ion.init();