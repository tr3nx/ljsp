// Lisp expression model
// expr
// - atomic
// -- self-evalulating
// -- symbols (variables)
// - list
// -- procedure calls
// -- special forms

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
			if (type === "integer") value = Number(value);

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
			// self-evaluating
			if (this.peek() === "integer") {
				return this.consume("integer").value;
			}

			if (this.peek() === "string") {
				return this.consume("string").value;
			}

			// symbols/variables
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

			return quoted.join(" ")
					  .replace(new RegExp("\\(\\s"), '(')
					  .replace(new RegExp("\\s\\)"), ')');
		},
		peek: function(offset=0) {
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

// const code = "(+ 12 18)";
// const code = '(* 3 (+ 5 6))';
// const code = "(list (quote +) (quote (1 2 3)))";
// const code = '(loop 5 (print "testing"))';
const code = "(abs ((lambda (x) (- 2 (+ 3 x))) (+ 1 (* 4 (* 2 (- (* 5 2) 5))))))";
console.log("Raw:", code);

const reader = InputReader(code);
console.log("Input:", reader);

const tokens = Tokenizer(reader, [
	{ "oparen"  : '\\(' },
	{ "cparen"  : '\\)' },
	{ "integer" : '[0-9]+' },
	{ "string"  : '\\"[^\"]*\\"' },
	{ "symbol"  : '[a-zA-Z0-9+=!^%*-/]+' }
]);
console.log("Tokens:", tokens);

const tree = Parser(tokens).parse();
console.log("Parser:", tree);
