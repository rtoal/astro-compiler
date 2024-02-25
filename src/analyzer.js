import * as core from "./core.js"

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

class Context {
  constructor() {
    // Astro is so simple the only context is the map of declared
    // entities. The map maps names to entities. There is no current
    // function, current loop, or any such thing. There is also no
    // nesting of scopes.
    this.locals = new Map()
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(id) {
    return this.locals.get(id.sourceString)
  }
}

export default function analyze(match) {
  // Astro is so trivial that the only required contextual information is
  // to keep track of the identifiers that have been declared.
  const context = new Context()

  function mustHaveBeenFound(entity, name, at) {
    must(entity, `Identifier ${name} not defined`, at)
  }

  function mustBeAVariable(entity, at) {
    must(entity?.kind === "Variable", `Variable expected`, at)
  }

  function mustBeAProcedure(entity, at) {
    must(entity?.kind === "Procedure", `Procedure expected`, at)
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
      let target = context.lookup(id)
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
    Statement_call(id, exps, _semicolon) {
      const callee = context.lookup(id)
      mustBeAProcedure(callee, { at: id })
      const args = exps.rep()
      mustHaveCorrectArgumentCount(callee, args, { at: exps })
      return core.procedureCall(callee, args)
    },
    Args(_leftParen, exps, _rightParen) {
      return exps.asIteration().rep()
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
      // In Astro, functions and procedures never stand alone, so must be a var
      const entity = context.lookup(id)
      mustHaveBeenFound(entity, id.sourceString, { at: id })
      mustBeAVariable(entity, { at: id })
      return entity
    },
    Primary_call(id, exps) {
      const callee = context.lookup(id)
      mustBeAFunction(callee, { at: id })
      const args = exps.rep()
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

  for (const [name, entity] of Object.entries(core.standardLibrary)) {
    context.add(name, entity)
  }
  return analyzer(match).rep()
}
