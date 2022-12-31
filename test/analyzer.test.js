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
  ["a variable used as procedure", "x = 1; x(2);", /Procedure expected/],
  ["a variable used as function", "x = 1; print(x(5));", /Function expected/],
  ["a procedure used as variable", "print(sin + 1);", /Variable expected/],
  ["an attempt to write a read-only var", "π = 3;", /π is not writable/],
  ["too few arguments", "print(sin());", /Expected 1 arg\(s\), found 0/],
  ["too many arguments", "print(sin(5, 10));", /Expected 1 arg\(s\), found 2/],
]

const sample = `x2=sqrt(sin(89));print(x2+hypot(5,-1.2e+1)/cos(π));`

const expected = `   1 | Program statements=[#2,#8]
   2 | Assignment target=#3 source=#4
   3 | Variable name='x2' writable=true
   4 | FunctionCall callee=#5 args=[#6]
   5 | Function name='sqrt' paramCount=1
   6 | FunctionCall callee=#7 args=[89]
   7 | Function name='sin' paramCount=1
   8 | ProcedureCall callee=#9 args=[#10]
   9 | Procedure name='print' paramCount=1
  10 | BinaryExpression op='+' left=#3 right=#11
  11 | BinaryExpression op='/' left=#12 right=#15
  12 | FunctionCall callee=#13 args=[5,#14]
  13 | Function name='hypot' paramCount=2
  14 | UnaryExpression op='-' operand=12
  15 | FunctionCall callee=#16 args=[#17]
  16 | Function name='cos' paramCount=1
  17 | Variable name='π' writable=false`

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
