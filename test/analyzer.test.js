import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

const semanticChecks = [
  ["variables can be printed", "x = 1; print(x);"],
  ["variables can be reassigned", "x = 1; x = x ** 5 / ((-3) + x);"],
  ["predefined identifiers", "print(sqrt(sin(cos(hypot(π,1) + cos(5.5E2)))));"],
]

const semanticErrors = [
  ["using undeclared identifiers", "print(x);", /x not defined/],
  ["a variable used as function", "x = 1; print(x(5));", /Function expected/],
  ["an attempt to write a read-only var", "π = 3;", /π is not writable/],
  ["too few arguments", "print(sin());", /Expected 1 arg\(s\), found 0/],
  ["too many arguments", "print(sin(5, 10));", /Expected 1 arg\(s\), found 2/],
]

const sample = `x2=sqrt(sin(89));print(x2+hypot(5,-1.2e+1)/cos(π));`

const expected = core.program([
  core.assignment(
    core.variable("x2", true),
    core.functionCall(core.standardLibrary.sqrt, [
      core.functionCall(core.standardLibrary.sin, [89]),
    ])
  ),
  core.print(
    core.binary(
      "+",
      core.variable("x2", true),
      core.binary(
        "/",
        core.functionCall(core.standardLibrary.hypot, [5, core.unary("-", 12)]),
        core.functionCall(core.standardLibrary.cos, [core.standardLibrary.π])
      )
    )
  ),
])

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  it(`produces the expected graph for the simple sample program`, () => {
    assert.deepEqual(analyze(parse(sample)), expected)
  })
})
