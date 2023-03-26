import assert from "assert/strict"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import * as core from "../src/core.js"

// Make some test cases easier to read
const x = new core.Variable("x", true)
const neg = x => new core.UnaryExpression("-", x)
const power = (x, y) => new core.BinaryExpression("**", x, y)
const sqrt = core.standardLibrary.sqrt
const print = core.standardLibrary.print
const assign = (target, source) => new core.Assignment(target, source)
const procedureCall = (f, args) => new core.ProcedureCall(f, args)
const functionCall = (f, args) => new core.FunctionCall(f, args)
const negate = x => new core.UnaryExpression("-", x)
const program = (...statements) => new core.Program(statements)

function expression(e) {
  return analyze(`x=1; print(${e});`).statements[1].args[0]
}

const tests = [
  ["folds +", expression("5 + 8"), 13],
  ["folds -", expression("5 - 8"), -3],
  ["folds *", expression("5 * 8"), 40],
  ["folds /", expression("5 / 8"), 0.625],
  ["folds %", expression("17 % 5"), 2],
  ["folds **", expression("5 ** 8"), 390625],
  ["optimizes +0", expression("x + 0"), x],
  ["optimizes -0", expression("x - 0"), x],
  ["optimizes *1", expression("x * 1"), x],
  ["optimizes /1", expression("x / 1"), x],
  ["optimizes *0", expression("x * 0"), 0],
  ["optimizes 0*", expression("0 * x"), 0],
  ["optimizes 0/", expression("0 / x"), 0],
  ["optimizes 0+", expression("0 + x"), x],
  ["optimizes 0-", expression("0 - x"), neg(x)],
  ["optimizes 1*", expression("1 * x"), x],
  ["folds negation", expression("- 8"), -8],
  ["optimizes 1**", expression("1 ** x"), 1],
  ["optimizes **0", expression("x ** 0"), 1],
  ["optimizes sqrt", expression("sqrt(16)"), 4],
  ["optimizes sin", expression("sin(0)"), 0],
  ["optimizes cos", expression("cos(0)"), 1],
  ["optimizes deeply", expression("8 * (-5) + 2 ** 3"), -32],
  ["optimizes arguments", expression("sqrt(20 + 61)"), 9],
  ["leaves nonoptimizable binaries alone", expression("x ** 5"), power(x, 5)],
  ["leaves nonoptimizable negations alone", expression("-x"), negate(x)],
  ["leaves 0**0 alone", expression("0 ** 0"), power(0, 0)],
  ["leaves nonoptimizable calls alone", expression("sqrt(x)"), functionCall(sqrt, [x])],
  [
    "removes x=x",
    analyze("x=1; x=x; print(x);"),
    program(assign(x, 1), procedureCall(print, [x], true)),
  ],
]

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(optimize(before), after)
    })
  }
})
