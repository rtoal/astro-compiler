import fs from "fs"
import * as ohm from "ohm-js"
import * as core from "./core.js"

const astroGrammar = ohm.grammar(fs.readFileSync("src/astro.ohm"))

// Throw an error message that takes advantage of Ohm's messaging.
// If you supply an Ohm tree node as the second parameter, this will
// use Ohm's cool reporting mechanism.
function error(message, node) {
  const prefix = `${node?.source.getLineAndColumnMessage() ?? ""}`
  throw new Error(`${prefix}${message}`)
}

class Context {
  constructor() {
    // Astro is so simple the only context is the map of declared
    // entities. The map maps names to entities. There is no current
    // function, current loop, or any such thing. There is also no
    // nesting of scopes.
    this.locals = new Map()
  }
  check(condition, message, { at }) {
    if (!condition) error(message, at)
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(id, { expecting } = {}) {
    // Adds an entity to the context. If no expected kind is not passed in,
    // then this method will return whatever it finds without further checking,
    // or it will return undefined if no entity with the id's name is found.
    // Otherwise the method will error if nothing was found or if the entity
    // was not of the expected kind (Variable, Function, Procedure).
    const entity = this.locals.get(id.sourceString)
    if (!expecting) return entity
    this.check(entity, `${id.sourceString} not defined`, { at: id })
    this.checkKind(entity, expecting, { at: id })
    return entity
  }
  checkKind(entity, kind, { at }) {
    this.check(entity?.constructor === kind, `${kind.name} expected`, { at })
  }
  checkIsWritable(variable, { at }) {
    this.check(variable.writable, `${variable.name} is not writable`, { at })
  }
  checkArguments(callee, args, { at }) {
    this.check(
      args.length === callee.paramCount,
      `Expected ${callee.paramCount} arg(s), found ${args.length}`,
      { at }
    )
  }
}

export default function analyze(sourceCode) {
  // Astro is so trivial that the only required contextual information is
  // to keep track of the identifiers that have been declared.
  const context = new Context()

  // The compiler front end analyzes the source code and produces a graph of
  // entities (defined in the core module) "rooted" at the Program entity.
  const analyzer = astroGrammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.rep())
    },
    Statement_assignment(id, _eq, exp, _semicolon) {
      const initializer = exp.rep()
      let target = context.lookup(id)
      if (!target) {
        // Not there already, make a new variable and add it
        target = new core.Variable(id.sourceString, true)
        context.add(id.sourceString, target)
      } else {
        // Something was found, whatever it was must be a writable variable
        context.checkKind(target, core.Variable, { at: id })
        context.checkIsWritable(target, { at: id })
      }
      return new core.Assignment(target, initializer)
    },
    Statement_call(id, exps, _semicolon) {
      const callee = context.lookup(id, { expecting: core.Procedure })
      const args = exps.rep()
      context.checkArguments(callee, args, { at: exps })
      return new core.ProcedureCall(callee, args)
    },
    Args(_leftParen, exps, _rightParen) {
      return exps.asIteration().rep()
    },
    Exp_binary(exp, op, term) {
      return new core.BinaryExpression(op.rep(), exp.rep(), term.rep())
    },
    Term_binary(term, op, factor) {
      return new core.BinaryExpression(op.rep(), term.rep(), factor.rep())
    },
    Factor_binary(primary, op, factor) {
      return new core.BinaryExpression(op.rep(), primary.rep(), factor.rep())
    },
    Factor_negation(op, primary) {
      return new core.UnaryExpression(op.rep(), primary.rep())
    },
    Primary_parens(_open, exp, _close) {
      return exp.rep()
    },
    Primary_num(num) {
      return Number(num.sourceString)
    },
    Primary_id(id) {
      // In Astro, functions and procedures never stand alone, so must be a var
      return context.lookup(id, { expecting: core.Variable })
    },
    Primary_call(id, exps) {
      const callee = context.lookup(id, { expecting: core.Function })
      const args = exps.rep()
      context.checkArguments(callee, args, { at: exps })
      return new core.FunctionCall(callee, args)
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
  const match = astroGrammar.match(sourceCode)
  if (!match.succeeded()) error(match.message)
  return analyzer(match).rep()
}
