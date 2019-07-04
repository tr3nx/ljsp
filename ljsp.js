// ljsp

let InputReader = (input) => {
	let pos = 0;
	return {
		top: function() {
			if (this.eof()) return "";
			return (this.peek() === " ")
				? this.skip().top()
				: input.substr(pos);
		},
		read: function(amount=1) {
			if (this.eof()) return "";
			return Array.from(Array(amount)).map(_ => this.next()).join("");
		},
		next: function() {
			if (this.eof()) return "";
			return input[pos++];
		},
		skip: function(amount=1) {
			pos += amount;
			return this;
		},
		peek: function(offset=0) { return input[pos + offset]; },
		eof: function() { return pos >= input.length || this.peek() === ""; }
	};
};

let Tokenizer = (reader, types) => {
	let tokens = [];
	while ( ! reader.eof()) {
		let code = reader.top();
		types.some(type => {
			let match = code.match(new RegExp(`^(${Object.values(type)[0]})`));
			if (match === null || match.length <= 1) return;
			reader.skip(match[match.length - 1].length);
			type = Object.keys(type)[0];
			let value = match[match.length - 1];
			if (type === "integer") {
				value = Number(parseFloat(value));
			}
			tokens.push({ type, value });
			return true;
		});
	}
	return tokens;
};

let Parser = (tokens) => {
	return {
		parse: function() {
			return this.parse_expr();
		},
		parse_expr: function() {
			if (this.peek() === "oparen") {
				return this.parse_list();
			}
			return this.parse_atomic();
		},
		parse_atomic: function() {
			if (this.peek() === "integer") {
				return this.consume("integer").value;
			}
			if (this.peek() === "string") {
				return this.consume("string").value;
			}
			return this.consume("symbol").value;
		},
		parse_list: function() {
			if (this.peek(1) === "symbol") {
				if (tokens[1].value === "lambda") {
					return this.parse_lambda();
				}
				if (tokens[1].value === "quote") {
					return this.parse_quote();
				}
			}
			return this.parse_procedure();
		},
		parse_lambda: function() {
			this.consume("oparen");
			this.consume("symbol");
			this.consume("oparen");

			let argvars = [];
			while (this.peek() !== "cparen") {
				argvars.push(this.consume("symbol").value);
			}

			this.consume("cparen");
			let body = this.parse_expr();
			this.consume("cparen");

			return { type: "lambda", argvars: argvars, body: body };
		},
		parse_procedure: function() {
			this.consume("oparen");

			let rator;
			if (this.peek() === "oparen") {
				rator = this.parse_list();
			} else {
				rator = this.consume("symbol").value;
			}

			let rand = [];
			while (this.peek() !== "cparen") {
				rand.push(this.parse_expr());
			}

			this.consume("cparen");

			return { type: "procedure", func: rator, args: rand };
		},
		parse_quote: function() {
			this.consume("oparen");
			this.consume("symbol");

			let quoted = [];
			let depth = 0;
			while (true) {
				if (this.peek() === "cparen" && depth === 0) break;
				if (this.peek() === "oparen") depth++;
				if (this.peek() === "cparen") depth--;
				quoted.push(tokens.shift().value);
			}

			this.consume("cparen");

			quoted = quoted.join(" ")
					.replace(new RegExp("\\(\\s"), '(')
					.replace(new RegExp("\\s\\)"), ')');

			return { type: "quote", quoted: quoted };
		},
		peek: function(offset=0) {
			if (tokens[offset] === undefined) { throw(`Syntax Error: Closing paren missing?`); }
			return tokens[offset].type;
		},
		consume: function(expected) {
			let token = tokens.shift();
			if (token === undefined || token.type !== expected) {
				throw(`Syntax Error: [${tokens.length}] Expected '${expected}' but got '${token.type}'.`);
			}
			return token;
		}
	};
};

let Generator = (tree) => {
	return {
		generate: function() {
			return this._generate(tree);
		},
		_generate: function(tree) {
			let code = "";
			if (tree.type !== undefined) {
				if (tree.type === "procedure") {
					code += this.generate_procedure(tree.func, tree.args);
				} else if (tree.type === "quote") {
					code += this.generate_quote(tree.quoted);
				} else {
					code += this.generate_lambda(tree.argvars, tree.body);
				}
			} else if (tree instanceof Array) {
				code += tree.map(String);
			} else {
				code += tree;
			}
			return code;
		},
		generate_procedure: function(rator, args) {
			let rand = [];
			for (let i = 0; i < args.length; i++) {
				let arg = args[i];
				if (arg.type !== undefined) {
					rand.push(this._generate(args[i]));
				} else {
					rand.push(args[i]);
				}
			}

			if (rator instanceof Object) {
				rator = this._generate(rator);
			}
 
			return "(" + rator + " " + rand.map(String).join(" ") + ")";
		},
		generate_lambda: function(argvars, body) {
			return "(lambda (" + argvars.map(String) + ") " + this._generate(body) + ")";
		},
		generate_quote: function(quoted) {
			return "(quote " + quoted + ")";
		}
	};
};

let Evaluator = (tree) => {
	return {
		evaluate: function() {
			return this._evaluate(tree);
		},
		_evaluate: function(node) {
			if (node.type !== undefined) {
				if (node.type === "procedure") {
					return this.evaluate_procedure(node);
				}
				if (node.type === "lambda") {
					return this.evaluate_lambda(node);
				}
				if (node.type === "quote") {
					return this.evaluate_quote(node);
				}
			}
			return node;
		},
		evaluate_procedure: function(node) {
			let args = [];
			for (let i = 0; i  < node.args.length; i++) {
				let arg = node.args[i];
				if (arg instanceof Object) {
					args.push(this._evaluate(arg));
				} else {
					args.push(arg);
				}
			}
			return this[this._evaluate(node.func)](args);
		},
		evaluate_quote: function(node) {
			return node.quoted;
		},
		// builtins
		loop: function(args) {
			let times = args.shift();
			let body = args.shift();
			let ret = "";
			for (let i = 0; i < times; i++) {
				ret += this._evaluate(body);
			}
			return ret;
		},
		print : (str)  => str.join(),
		abs   : (num)  => Math.abs(num),
		expt  : (args) => args.reduce((a, b) => Math.pow(a, b)),
		'+'   : (args) => args.reduce((a, b) => a += b),
		'-'   : (args) => args.reduce((a, b) => a -= b),
		'*'   : (args) => args.reduce((a, b) => a *= b),
		'/'   : (args) => args.reduce((a, b) => a /= b),
		'%'   : (args) => args.reduce((a, b) => a %  b),
	};
};

// const code = "42";
// const code = '"testing"';
// const code = "(quote +)";
// const code = "(+ 1.1 5.1)";
const code = "(abs (- 61 (+ 12 (* 2 18) (+ 50 5))))";
// const code = '(loop (+ (/ 12 4) (* 2 (- (% 5 3) 1))) (print "testing"))';
// const code = "(abs ((lambda (x) (- 2 (+ 3 x))) (+ 1 (* 4 (* 2 (- (* 5 2) 5))))))";
// const code = '(loop (abs ((lambda (x) (+ x 10)) (quote 32))) (print "hello ljsp"))';
console.log("Raw:", code);

const reader = InputReader(code);
console.log("Input:", reader);

const tokens = Tokenizer(reader, [
	{ "oparen"  : '\\(' },
	{ "cparen"  : '\\)' },
	{ "integer" : '[\-]?[0-9]+(?:[\.]?[0-9]+)?' },
	{ "string"  : '\\"[^\"]*\\"' },
	{ "symbol"  : '[a-zA-Z0-9+=!^%*-/]+' }
]);
console.log("Tokens:", tokens);
tokens.forEach(t => console.log(t));

const tree = Parser(tokens).parse();
console.log("Parser:", tree);

const generated = Generator(tree).generate();
console.log("Generated:", generated);
console.log("Original :", code);
console.log("Matching:", code === generated);

const evaluated = Evaluator(tree).evaluate();
console.log("Evaluated:", evaluated);
