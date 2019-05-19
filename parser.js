(function() {
	let InputStream = {
		input: "",
		pos: 0,
		length: 0,
		new: function(input) {
			this.input = input;
			this.length = this.input.length;
			return this;
		},
		read: function(amount=1, offset=0) {
			if (this.pos+offset >= this.length) return "";
			if (offset > 0) this.skip(offset);
			return [...Array(amount).keys()].map(_ => this.next()).join("");
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

	let Token = function(type, value) {
		this.type = type;
		this.value = value;
	};

	let Tokenizer = {
		input: undefined,
		tokens: [],
		tokenTypes: [
			{ "oparen"  : '\\(' },
			{ "cparen"  : '\\)' },
			{ "integer" : '[0-9]+' },
			{ "symbol"  : '[a-zA-Z0-9+=!^*]+' },
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
					this.tokens.push(new Token(type.name, matches[0]));
					return true;
				});
			}
			return this.tokens;
		}
	};

	let ExprNode = function(car, cdr) {
		this.car = car;
		this.cdr = cdr;
	};

	let Parser = {
		new: function(tokens) {
			this.tokens = tokens;
			return this;
		},
		parse: function() {
			return this.parse_expr();
		},
		parse_expr: function() {
			this.consume("oparen");
			let car = this.parse_car();
			let cdr = this.parse_cdrs();
			this.consume("cparen");
			return new ExprNode(car, cdr);
		},
		parse_car: function() {
			let peek = this.peek();
			if (peek.type === "oparen") {
				return this.parse_expr();
			}
			if (peek.type === "cparen") {
				return 'nil';
			}
			return this.tokens.shift();
		},
		parse_cdrs: function() {
			let peek = this.peek();
			let cdr = [];
			while (peek.type !== "cparen") {
				let token = (peek.type === "oparen")
						  ? this.parse_expr()
						  : this.tokens.shift();
				cdr.push(token);
				peek = this.peek();
			}
			return cdr;
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
			if (token === undefined) {
				throw(`Syntax Error: Expected '${typename}' but got undefined.`);
			}
			if (token.type !== typename) {
				throw(`Syntax Error: Expected '${typename}' but got '${token.type}'.`);
			}
			return token;
		},
		skip: function(amount) {
			this.tokens = this.tokens.slice(amount);
		}
	};

	const code = "(+ 1 2)";

	const is = InputStream.new(code);
	// console.log(is);

	const tokenizer = Tokenizer.new(is);
	// console.log(tokenizer);

	const tokens = tokenizer.tokenize();
	// console.log(tokens);

	const parser = Parser.new(tokens);

	const tree = parser.parse();

	console.log(tree);
})();
