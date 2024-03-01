import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import generate from "../src/generator/index.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const fixtures = [
  {
    name: "hello",
    source: "print(1);",
    js: "\nconsole.log(1);",
    llvm: dedent`
      @format = private constant [3 x i8] c"%g\\0A"
      declare i64 @printf(i8*, ...)
      declare double @llvm.sqrt.f64(double)
      declare double @llvm.sin.f64(double)
      declare double @llvm.cos.f64(double)
      declare double @llvm.hypot.f64(double, double)
      define i64 @main() {
      entry:
      call i64 (i8*, ...) @printf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* @format, i64 0, i64 0), double 1);
      ret i64 0
      }
    `,
    c: dedent`
      #include <stdio.h>
      #include <stdlib.h>
      #include <math.h>
      int main() {
      printf("%g\\n", 1);
      return 0;
      }`,
  },
  {
    name: "a simple program",
    source: dedent`
      y = 8;
      x = sin(hypot(π, y) ** 3.1);
      x = 5 * sqrt(x) / -x + x - cos(π);
      print(x);
    `,
    js: dedent`
      let y_1, x_2;
      y_1 = 8;
      x_2 = Math.sin((Math.hypot(Math.PI,y_1) ** 3.1));
      x_2 = ((((5 * Math.sqrt(x_2)) / -(x_2)) + x_2) - Math.cos(Math.PI));
      console.log(x_2);
    `,
    llvm: dedent`
      @format = private constant [3 x i8] c"%g\\0A"
      declare i64 @printf(i8*, ...)
      declare double @llvm.sqrt.f64(double)
      declare double @llvm.sin.f64(double)
      declare double @llvm.cos.f64(double)
      declare double @llvm.hypot.f64(double, double)
      define i64 @main() {
      entry:
      %0 = call double @llvm.hypot.f64(double 3.141592653589793, double 8)
      %1 = call double @llvm.pow.f64(double %0, double 3.1)
      %2 = call double @llvm.sin.f64(double %1)
      %3 = call double @llvm.sqrt.f64(double %2)
      %4 = fmul double 5, %3
      %5 = fsub double 0.0, %2
      %6 = fdiv double %4, %5
      %7 = fadd double %6, %2
      %8 = call double @llvm.cos.f64(double 3.141592653589793)
      %9 = fsub double %7, %8
      call i64 (i8*, ...) @printf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* @format, i64 0, i64 0), double %9);
      ret i64 0
      }
    `,
    c: dedent`
      #include <stdio.h>
      #include <stdlib.h>
      #include <math.h>
      int main() {
      double y_1, x_2;
      y_1 = 8;
      x_2 = sin((hypot(M_PI,y_1) ** 3.1));
      x_2 = ((((5 * sqrt(x_2)) / -(x_2)) + x_2) - cos(M_PI));
      printf("%g\\n", x_2);
      return 0;
      }
    `,
  },
]

describe("The code generator", () => {
  for (const fixture of fixtures) {
    for (const type of ["js", "llvm", "c"]) {
      it(`produces the expected output for ${fixture.name} in ${type}`, done => {
        const actual = generate(optimize(analyze(parse(fixture.source))), type)
        assert.deepEqual(actual, fixture[type])
        done()
      })
    }
  }
})
