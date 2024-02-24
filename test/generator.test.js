import assert from "assert/strict"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const sample = dedent`
  y = 8;
  x = sin(hypot(π, y) ** 3.1);
  x = 5 * sqrt(x) / -x + x - cos(π);
  print(x);
`

const expected = dedent`
  let y_1, x_2;
  y_1 = 8;
  x_2 = Math.sin((Math.hypot(Math.PI,y_1) ** 3.1));
  x_2 = ((((5 * Math.sqrt(x_2)) / -(x_2)) + x_2) - Math.cos(Math.PI));
  console.log(x_2);
`

describe("The code generator", () => {
  it(`produces the expected output for the small program`, done => {
    const actual = generate(optimize(analyze(sample)))
    assert.deepEqual(actual, expected)
    done()
  })
})
