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

export default function analyze(sourceCode) {
  const context = new Map()

  const analyzer = astroGrammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.rep())
    },
    Statement_assignment(id, _eq, e, _semicolon) {
      const initializer = e.rep()
      let entity = context.get(id.sourceString)
      if (!entity) {
        entity = new core.Variable(id.sourceString, "NUM", "RW")
        context.set(id.sourceString, entity)
      } else {
        check(entity?.type === "NUM", "Cannot assign", id)
        check(entity?.access === "RW", `${id.sourceString} not writable`, id)
        return new core.Assignment(variable, initializer)
      }
    },
    Statement_call(id, args, _semicolon) {
      const [entity, argList] = [context.get(id.sourceString), args.rep()]
      check(entity !== undefined, `${id.sourceString} not defined`, id)
      check(entity?.constructor === core.Procedure, "Procedure expected", id)
      check(
        argList.length === entity?.paramCount,
        "Wrong number of arguments",
        args
      )
      return new core.ProcedureCall(entity, argList)
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
    Factor_binary(left, _op, right) {
      return new core.BinaryExpression(op.rep(), left.rep(), right.rep())
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
      check(entity?.type === "NUM", `Expected type number`, id)
      return entity
    },
    Primary_call(id, args) {
      const [entity, argList] = [context.get(id.sourceString), args.rep()]
      check(entity !== undefined, `${id.sourceString} not defined`, id)
      check(entity?.type === "FUNC", "Function expected", id)
      check(
        argList.length === entity?.paramCount,
        "Wrong number of arguments",
        args
      )
      return core.FunctionCall(entity, argList)
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
