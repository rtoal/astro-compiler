import fs from "fs"
import ohm from "ohm-js"
import * as core from "./core.js"

const astroGrammar = ohm.grammar(fs.readFileSync("src/astro.ohm"))

// Throw an error message that takes advantage of Ohm's messaging.
// If you supply an Ohm tree node as the second parameter, this will
// use Ohm's cool reporting mechanism.
function error(message, node) {
  if (node) {
    throw new Error(`${node.source.getLineAndColumnMessage()}${message}`)
  }
  throw new Error(message)
}

function check(condition, message, node) {
  if (!condition) error(message, node)
}

function checkArguments(callee, args, node) {
  check(
    args.length === callee.paramCount,
    `Expected ${callee.paramCount} arg(s), found ${args.length}`,
    node
  )
}

export default function analyze(sourceCode) {
  // Astro is so trivial that the only required contextual information is
  // to keep track of the identifiers that have been declared.
  const context = new Map()

  // The compiler front end analyzes the source code and produces a graph of
  // entities (defined in the core module) "rooted" at the Program entity.
  const analyzer = astroGrammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.rep())
    },
    Statement_assignment(id, _eq, e, _semicolon) {
      const initializer = e.rep()
      let target = context.get(id.sourceString)
      if (!target) {
        target = new core.Variable(id.sourceString, true)
        context.set(id.sourceString, target)
      } else {
        check(target instanceof core.Variable, "Cannot assign to functions", id)
        check(target?.writable, `${id.sourceString} is not writable`, id)
      }
      return new core.Assignment(target, initializer)
    },
    Statement_call(id, args, _semicolon) {
      const [callee, argsRep] = [context.get(id.sourceString), args.rep()]
      check(callee !== undefined, `${id.sourceString} not defined`, id)
      check(callee?.constructor === core.Procedure, "Procedure expected", id)
      checkArguments(callee, argsRep, args)
      return new core.ProcedureCall(callee, argsRep)
    },
    Args(_leftParen, expressions, _rightParen) {
      return expressions.asIteration().rep()
    },
    Exp_binary(left, op, right) {
      return new core.BinaryExpression(op.rep(), left.rep(), right.rep())
    },
    Term_binary(left, op, right) {
      return new core.BinaryExpression(op.rep(), left.rep(), right.rep())
    },
    Factor_binary(left, op, right) {
      return new core.BinaryExpression(op.rep(), left.rep(), right.rep())
    },
    Factor_negation(op, operand) {
      return new core.UnaryExpression(op.rep(), operand.rep())
    },
    Primary_parens(_leftParen, e, _rightParen) {
      return e.rep()
    },
    Primary_num(num) {
      return Number(num.sourceString)
    },
    Primary_id(id) {
      // In Astro, functions and procedures never stand alone
      const entity = context.get(id.sourceString)
      check(entity !== undefined, `${id.sourceString} not defined`, id)
      check(entity instanceof core.Variable, "Variable expected", id)
      return entity
    },
    Primary_call(id, args) {
      const [callee, argsRep] = [context.get(id.sourceString), args.rep()]
      check(callee !== undefined, `${id.sourceString} not defined`, id)
      check(callee instanceof core.Function, "Function expected", id)
      checkArguments(callee, argsRep, args)
      return new core.FunctionCall(callee, argsRep)
    },
    _terminal() {
      return this.sourceString
    },
    _iter(...nodes) {
      return nodes.map(node => node.rep())
    },
  })

  for (const [name, entity] of Object.entries(core.standardLibrary)) {
    context.set(name, entity)
  }
  const match = astroGrammar.match(sourceCode)
  if (!match.succeeded()) error(match.message)
  return analyzer(match).rep()
}
