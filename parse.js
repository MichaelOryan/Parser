var Parser = {}

isFunc = function(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
};

/*
Parser.RegexCombine = function(options)
{
	var regex = "(";
	if(options.length >0)
		regex = regex + "(" + options[0] + ")";
	for(var index = 1; index < options.length; index++)
		regex = regex + "|" + "(" + options [index] + ")";
	regex = regex + ")";
	return regex;
}

// if else elseif end if tag finding
// not implemented
Parser.Operations = {
	//"if": "^\\s*(I|i)(F|f)\\s*\\(.*\\)\\s*$",
	"if": "(\\[\\s*(I|i)(F|f)\\s*\\(.*\\)\\s*\\])",
	//(\[\s*(I|i)(F|f)\s*\(.*\)\s*\])
	"else": "^\\s*(E|e)(L|l)(S|s)(E|e)\\s*$",
	"elseif": "^\\s*(E|e)(L|l)(S|s)(E|e)\\s+(I|i)(F|f)\\s*\\(.*\\)\\s*$",
	"endif": "^\\s*(E|e)(N|n)(D|d)(I|i)(F|f)\\s*$",
	"otag": "\\[",
	"ctag": "\\]"
}

Parser.IsEquation = function(str){

	var eq = eq || (/^[\|\[|\]\d\*\-\+\<\>\/\=\ ]*$/.test(str)==true);
	return eq;
}
*/
Parser.GetNextExpression = function(text, start, open, close, seperator)
{
	// difference between open and close bracket count
	var count = 0;
	// First opening tag, will always start on the first opening char
	var firstOpen = text.indexOf(open);
	// the contents inside the opening and closing tag
	// [hello:[name]:[sadface]] -> hello:[name]:[sadface]
	var exp = "";
	// Consider entire text from left to right until we have an expression/tag
	for(var i = 0; i < text.length && exp == ""; i++)
	{
		// increment difference on open found
		if (text[i] == open)
			count++;
		// decrement difference on closed found
		else if (text[i] == close)
			count--;
		// if we have a difference of 0 then we've found the opening and closing tag
		else if (text[i] == seperator && count == 0)
			exp = text.slice(start, i);
	}

	// return all text if no tags found
	if(exp == "")
		exp = text.slice(start);
	return exp;
}

Parser.EvalExpression = function (exp, dict)
{
	// convert [ ] into brackets for mathjs expressions
	exp = exp.replace(/\[/g, "(");
	exp = exp.replace(/\]/g, ")");
	try{
		// create btree via mathjs
		var btree = math.parse(exp);
		// evaluate btree to a number/true/false
		var answer = btree.eval(dict);
		// return answer
		return answer;
	}
	catch(e)
	{
		// bad exp return it
		return exp;
	}
	
}

// expression:true|false
// Turnary expression
Parser.EvalTurnary = function(text, dict)
{

	// true false expression
	var exp = Parser.GetNextExpression(text, 0, "[", "]", ":");
	// true portion
	var yes = Parser.GetNextExpression(text, exp.length + 1, "[", "]", ":");
	// false portion
	var no = Parser.GetNextExpression(text, exp.length + yes.length + 2, "[", "]", ":");

	// extract all tags and eval all expressions in exp portion
	var exp = Parser.Parse(exp, dict);

	// evaluate expression to find answer
	var answer = Parser.EvalExpression(exp, dict);
	// return parsed yes/true or no/false text
	if(answer)
		return Parser.Parse(yes, dict);
	return Parser.Parse(no, dict);

}

Parser.IsTagEquation = function(str)
{
	var eq = (/(\+|\-|\/|\*|\=|\<|\>)(\ )*\[/.test(str)==true);

	eq = eq || (/\](\ )*(\+|\-|\/|\*|\=|\<|\>)/.test(str)==true);

	eq = eq|| (/(\+|\-|\/|\*|\=|\<|\>)(\ )*\d/.test(str)==true);

	eq = eq || (/\d(\ )*(\+|\-|\/|\*|\=|\<|\>)/.test(str)==true);

	return eq;

}

Parser.FindNextTag = function(reg, text)
{
	
	// default
	var tag = {
		begin:-1,
		end:-1
	};
	// difference in opening tags and closing tags
	var count = 0;

	// current opening or closing char
	var c;

	while( (count !== 0 || tag.begin < 0) && ( (c = reg.exec(text)) != null) )
	{
		if(c[0] == "[")
		{
			count++
			if(tag.begin == -1)
				tag.begin = c.index;
		}
		else if (c[0] == "]")
		{
			count--;
			if(count == 0)
				tag.end = c.index;
		}
	}

	return tag;

}

Parser.Parse = function(text, dict) {
	var reg = new RegExp("(\\[|\\])","g");
	try {
		// Simple parser
		if(dict) {
			// find opening of tag
			var index = Parser.FindNextTag(reg, text);
			// problem with no closing tag.
			while( index.begin != -1 && index.end != -1 ) {
				

				// Put contents into tag
				// if no closing entire contents are tag
				var tag = text.slice(index.begin + 1, (index.end >= 0 ? index.end : text.length)); 

				// Text that will replace tag
				var newText;
				// Check to see if we have an expression or tag not in dict
				// [varname]
				if(!Parser.IsTagEquation(tag) && dict[tag] != null) {
					if(isFunc(dict[tag]))
						newText = dict[tag]();
					else
						newText = dict[tag];
				}
				// Turnary tag [exp:on true: one false]
				else if(tag.includes(":"))
				{
					newText = Parser.EvalTurnary(tag, dict);
				}
				// [expression] eg; [x+3] 
				else if (Parser.IsTagEquation(tag))
				{
					newText = Parser.EvalExpression(tag, dict);
				}
				// nothing found just use tag name

				else {
					newText = tag;
				}
				// Replace tag with newText
				text = text.slice(0, index.begin) + newText + text.slice(index.end+1);//(end <= text.length ? text.slice(end+1) : "");
				reg = new RegExp("(\\[|\\])","g");
				index = Parser.FindNextTag(reg, text);
			}
		}
		// Return our parsed text
		return text;
	}
	catch(e) {
		// it broke return what we have
		return text;
	}
}
