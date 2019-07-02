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
			tokens.push({ type: Object.keys(type)[0], value: match[match.length - 1] });
			return true;
		});
	}
	return tokens;
};

let Parser = (tokens) => {
	return {
		parse: function() {
			return this.expr();
		},
		expr: function() {
			if (this.peek("oparen")) {
				this.consume("oparen");
				return this.expr();
			}
			
			// return { proc : this.consume("symbol"), args : this.expr() };
		},
		peek: function(expected, offset=0) {
			return tokens[offset].type === expected;
		},
		consume: function(expected) {
			let token = tokens.shift();
			if (token === undefined || token.type !== expected) {
				throw(`Syntax Error: Expected '${expected}' but got '${token.type}'.`);
			}
			return token;
		}
	};
};

const code = "(+ 12 18)";
// const code = "((lambda (x y) (% x y)) 5 35)";
console.log("Raw:", code);

const reader = InputReader(code);
console.log("Input:", reader);

const tokens = Tokenizer(reader, [
	{ "oparen"  : '\\(' },
	{ "cparen"  : '\\)' },
	{ "integer" : '[0-9]+' },
	// { "string"  : '\\".+\\"' },
	{ "symbol"  : '[a-zA-Z0-9+=!^%*-/]+' }
]);
console.log("Tokens:", tokens);
tokens.forEach(t => console.log(t));

const tree = Parser(tokens).parse();
console.log("Parser:", tree);

// const gen = Generator.new(tree).generate();
// console.log("Generated:", gen);
// console.log("Starting: ", code);
// console.log("Matching:", gen === code);

// const result = Evaluator.new(tree).run();
// console.log("Eval:", result);
