// The semantic analyzer exports a single function, analyze(match), that
// accepts a grammar match object (the CST) from Ohm and produces the
// internal representation of the program (pretty close to what is usually
// called the AST). This representation also includes entities from the
// standard library, as needed.

import * as core from "./core.js"

class Context {
  constructor({ locals = {} }) {
    this.locals = new Map(Object.entries(locals))
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(name) {
    return this.locals.get(name)
  }
}

export default function analyze(match) {
  // Track the context manually via a simple variable. The initial context
  // contains the mappings from the standard library. Add to this context
  // as necessary. When needing to descent into a new scope, create a new
  // context with the current context as its parent. When leaving a scope,
  // reset this variable to the parent context.
  let context = new Context({ locals: core.standardLibrary })

  // The single gate for error checking. Pass in a condition that must be true.
  // Use errorLocation to give contextual information about the error that will
  // appear: this should be an object whose "at" property is a parse tree node.
  // Ohm's getLineAndColumnMessage will be used to prefix the error message.
  function must(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage()
      throw new Error(`${prefix}${message}`)
    }
  }

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not defined`, at)
  }

  function mustBeAVariable(entity, at) {
    must(entity?.kind === "Variable", `Variable expected`, at)
  }

  function mustBeAFunction(entity, at) {
    must(entity?.kind === "Function", `Function expected`, at)
  }

  function mustBeWritable(variable, at) {
    must(variable.writable, `${variable.name} is not writable`, at)
  }

  function mustHaveCorrectArgumentCount(callee, args, at) {
    must(
      args.length === callee.paramCount,
      `Expected ${callee.paramCount} arg(s), found ${args.length}`,
      at
    )
  }

  // The compiler front end analyzes the source code and produces a graph of
  // entities (defined in the core module) "rooted" at the Program entity.
  const analyzer = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.rep())
    },
    Statement_assignment(id, _eq, exp, _semicolon) {
      const initializer = exp.rep()
      let target = context.lookup(id.sourceString)
      if (!target) {
        // Not there already, make a new variable and add it
        target = core.variable(id.sourceString, true)
        context.add(id.sourceString, target)
      } else {
        // Something was found, whatever it was must be a writable variable
        mustBeAVariable(target, { at: id })
        mustBeWritable(target, { at: id })
      }
      return core.assignment(target, initializer)
    },
    Statement_print(_print, exp, _semicolon) {
      return core.print(exp.rep())
    },
    Exp_binary(exp, op, term) {
      return core.binary(op.rep(), exp.rep(), term.rep())
    },
    Term_binary(term, op, factor) {
      return core.binary(op.rep(), term.rep(), factor.rep())
    },
    Factor_binary(primary, op, factor) {
      return core.binary(op.rep(), primary.rep(), factor.rep())
    },
    Factor_negation(op, primary) {
      return core.unary(op.rep(), primary.rep())
    },
    Primary_parens(_open, exp, _close) {
      return exp.rep()
    },
    Primary_num(num) {
      return Number(num.sourceString)
    },
    Primary_id(id) {
      // In Astro, functions never stand alone, so must be a var
      const entity = context.lookup(id.sourceString)
      mustHaveBeenFound(entity, id.sourceString, { at: id })
      mustBeAVariable(entity, { at: id })
      return entity
    },
    Primary_call(id, _open, exps, _close) {
      const callee = context.lookup(id.sourceString)
      mustBeAFunction(callee, { at: id })
      const args = exps.asIteration().rep()
      mustHaveCorrectArgumentCount(callee, args, { at: exps })
      return core.functionCall(callee, args)
    },
    _terminal() {
      return this.sourceString
    },
    _iter(...nodes) {
      return nodes.map(node => node.rep())
    },
  })

  return analyzer(match).rep()
}
