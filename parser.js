(function() {
	let InputStream = {
		input  : "",
		pos    : 0,
		length : 0,
		new: function(input) {
			this.input = input;
			this.length = this.input.length;
			return this;
		},
		read: function(amount=1, offset=0) {
			if (this.pos+offset >= this.length) return "";
			if (offset > 0) this.skip(offset);
			return Array(amount).keys().map(_ => this.next()).join("");
		},
		top: function() {
			let output = this.input.substr(this.pos++);
			return (output[0] != " ") ? output : this.top();
		},
		next: function() {
			if (this.pos >= this.length) return "";
			return this.input[this.pos++];
		},
		skip: function(amount) {
			this.pos += amount;
			return this;
		},
		peek: function() { return this.input[this.pos]; },
		eof: function() { return this.pos >= this.length; },
	};

	let Tokenizer = {
		input      : undefined,
		tokens     : [],
		tokenTypes : [
			{ "oparen"  : '\\(' },
			{ "cparen"  : '\\)' },
			{ "integer" : '[0-9]+' },
			{ "string"  : '\\".+\\"' },
			{ "symbol"  : '[a-zA-Z0-9+=!^%*-/]+' },
		],
		new: function(input) {
			this.input = input;
			return this;
		},
		tokenize: function() {
			while ( ! this.input.eof()) {
				let code = this.input.top();
				this.tokenTypes.map(type => { return {
					name: Object.keys(type)[0],
					reg: new RegExp(`^(${Object.values(type)[0]})`, 'gi')
				} }).some(type => {
					let matches = code.match(type.reg);
					if (matches === null || matches.length <= 0) return;
					this.input.skip(matches[0].length - 1);
					this.tokens.push({ type: type.name, value: matches[0] });
					return true;
				});
			}
			return this.tokens;
		}
	};

	let Parser = {
		tokens : undefined,
		new: function(tokens) {
			this.tokens = tokens;
			return this;
		},
		parse: function() {
			return this.parse_expr();
		},
		parse_expr: function() {
			this.consume("oparen");
			let rator = this.parse_rator();
			let rand = this.parse_rand();
			this.consume("cparen");
			return { rator, rand };
		},
		parse_rator: function() {
			let peek = this.peek();
			if (peek.type === "oparen") {
				return this.parse_expr();
			}
			if (peek.type === "cparen") {
				return null;
			}
			let token = this.tokens.shift();
			return token.value;
		},
		parse_rand: function() {
			let peek = this.peek();
			let rands = [];
			while (peek.type !== "cparen") {
				let token = (peek.type === "oparen")
						  ? this.parse_expr()
						  : this.tokens.shift();

				let rand = token;

				if (token.type !== undefined) {
					if (token.type === "integer") {
						rand = parseInt(token.value);
					} else if (token.type === "string") {
						rand = String(token.value);
					} else if (token.type === "symbol") {
						rand = token.value;
					}
				}

				rands.push(rand);
				peek = this.peek();
			}
			return rands;
		},
		peek: function(offset=0) {
			let token = this.tokens[offset];
			if (token === undefined) {
				throw("Unmatching parenthesis (missing closing paren).")
			}
			return token;
		},
		consume: function(typename) {
			let token = this.tokens.shift();
			if (token === undefined || token.type !== typename) {
				throw(`Syntax Error: Expected '${typename}' but got '${token.type}'.`);
			}
			return token;
		}
	};

	let Generator = {
		tree : undefined,
		new: function(tree) {
			this.tree = tree;
			return this;
		},
		generate: function() {
			return this._generate(this.tree);
		},
		_generate: function(node) {
			if (node instanceof Array && node.length > 0) {
				let str = [];
				for (let i = 0; i < node.length; i++) {
					if (node[i] instanceof Object) {
						str.push(this._generate(node[i]));
					} else {
						str.push(node[i]);
					}
				}
				return str.map(s => String(s)).join(" ");
			}

			if (node instanceof Object && node.rator !== undefined && node.rand !== undefined) {
				let str = "(" + this._generate(node.rator);
				if (node.rand.length > 0) {
					str += " " + this._generate(node.rand);
				}
				return str + ")";
			}

			return String(node);
		}
	};

	let Evaluator = {
		tree : undefined,
		new: function(tree) {
			this.tree = tree;
			return this;
		},
		run: function() {
			return this.evaluate(this.tree);
		},
		evaluate: function(node) {
			if (node.rator === "lambda") {
				node.rator = this.lambda(node.rand[0], node.rand[1]);
			}

			if (node.rand !== undefined && node.rand.length > 0) {
				let args = [];
				for (let i = 0; i < node.rand.length; i++) {
					let n = node.rand[i];
					if (n instanceof Object) {
						args.push(this.evaluate(n));
					} else {
						args.push(n);
					}
				}
				node.rand = args;
			}
			return this.procedure(this.evaluate(node.rator), this.evaluate(node.rand));
		},
		procedure: function(rator, rand) {
			if (rator instanceof Function) {
				return rator(rand);
			}
			return this[rator](rand);
		},
		lambda: function(argnames, body) {
			console.log('lambda', body);
			return function(args) {
				console.log('inside', body);
				body.rand = args;
				return this.evaluate(body);
			};
		},
		'+': function(args) { return args.reduce((a, b) => a += b); },
		'-': function(args) { return args.reduce((a, b) => a -= b); },
		'*': function(args) { return args.reduce((a, b) => a *= b); },
		'/': function(args) { return args.reduce((a, b) => b /= a); },
		'%': function(args) { return args.reduce((a, b) => a %  b); }
	};

	// const code = "(+ 1 (/ 2 18))";
	const code = "((lambda (x y) (% x y)) 5 35)";
	console.log("Raw:", code);

	const is = InputStream.new(code);
	console.log("Input:", is);

	const tokens = Tokenizer.new(is).tokenize();
	console.log("Tokens:", tokens);

	const tree = Parser.new(tokens).parse();
	console.log("Parser:", tree);

	const gen = Generator.new(tree).generate();
	console.log("Generated:", gen);
	console.log("Starting: ", code);
	console.log("Matching:", gen === code);

	const result = Evaluator.new(tree).run();
	console.log("Eval:", result);
})();
