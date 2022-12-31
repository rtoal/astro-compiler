import util from "util"
import assert from "assert/strict"
import analyze from "../src/analyzer.js"

const semanticChecks = [
  ["variables can be printed", "x = 1; print(x);"],
  ["variables can be reassigned", "x = 1; x = x ** 5 / ((-3) + x);"],
  ["predefined identifiers", "print(sqrt(sin(cos(hypot(π,1) + cos(5.5E2)))));"],
]

const semanticErrors = [
  ["using undeclared identifiers", "print(x);", /x not defined/],
  ["a variable used as function", "x = 1; x(2);", /Procedure expected/],
  ["a function used as variable", "print(sin + 1);", /expected/],
  ["an attempt to write a read-only var", "π = 3;", /π is not writable/],
  ["too few arguments", "print(sin());", /Expected 1 arg\(s\), found 0/],
  ["too many arguments", "print(sin(5, 10));", /Expected 1 arg\(s\), found 2/],
]

const sample = `x2=sqrt(sin(89));print(x2+hypot(5,-1.2e+1)/cos(π));`

const expected = `   1 | Program statements=[undefined,#2]
   2 | ProcedureCall callee=#3 args=[#4]
   3 | Procedure name='print' paramCount=1
   4 | BinaryExpression op='+' left=#5 right=#6
   5 | Variable name='x2' writable=true
   6 | BinaryExpression op='/' left=#7 right=#10
   7 | FunctionCall callee=#8 args=[5,#9]
   8 | Function name='hypot' paramCount=2
   9 | UnaryExpression op='-' operand=12
  10 | FunctionCall callee=#11 args=[#12]
  11 | Function name='cos' paramCount=1
  12 | Variable name='π' writable=false`

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(source))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(source), errorMessagePattern)
    })
  }
  it(`produces the expected graph for the simple sample program`, () => {
    assert.deepEqual(util.format(analyze(sample)), expected)
  })
})
