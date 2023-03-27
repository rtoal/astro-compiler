import assert from "assert/strict"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const sample = dedent`
  x = sin(hypot(2, 0) ** 3.1);
  x = 5 * sqrt(x) / -x + x - cos(π);
  print(x);
`

const expected = dedent`
  let x_1;
  x_1 = Math.sin((Math.hypot(2,0) ** 3.1));
  x_1 = ((((5 * Math.sqrt(x_1)) / -(x_1)) + x_1) - Math.cos(Math.PI));
  console.log(x_1);
`

describe("The code generator", () => {
  it(`produces the expected output for the small program`, done => {
    const actual = generate(optimize(analyze(sample)))
    assert.deepEqual(actual, expected)
    done()
  })
})
