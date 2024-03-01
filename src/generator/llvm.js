// This code generator exports a single function, generate(program), which
// accepts a program representation and returns the LLVM IR translation as
// a string. As this compiler is written totally from scratch, we're not
// using any LLVM libraries and we're just writing out LLVM IR as text.

import { standardLibrary } from "../core.js"

export default function generate(program) {
  const output = []
  let registerFor = new Map()
  let nextRegister = 0

  // LLVM local registers are named %0, $1, %2, ...
  const allocateRegister = () => `%${nextRegister++}`

  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    Program(p) {
      output.push('@format = private constant [3 x i8] c"%g\\0A"')
      output.push("declare i64 @printf(i8*, ...)")
      output.push("declare double @llvm.sqrt.f64(double)")
      output.push("declare double @llvm.sin.f64(double)")
      output.push("declare double @llvm.cos.f64(double)")
      output.push("declare double @llvm.hypot.f64(double, double)")
      output.push("define i64 @main() {")
      output.push("entry:")
      p.statements.forEach(gen)
      output.push("ret i64 0")
      output.push("}")
    },
    Variable(v) {
      if (v === standardLibrary.π) return Math.PI
      return registerFor[v]
    },
    Function(f) {
      // The only functions in Astro are in the standard library.
      if (f === standardLibrary.sqrt) return "call double @llvm.sqrt.f64"
      if (f === standardLibrary.sin) return "call double @llvm.sin.f64"
      if (f === standardLibrary.cos) return "call double @llvm.cos.f64"
      if (f === standardLibrary.hypot) return "call double @llvm.hypot.f64"
    },
    Assignment(s) {
      // Interestingly, nothing has to be outputted here! The output of the
      // assignment has been made already while translating the operands.
      // We only need to record the mapping so we can *use* the proper register
      // for the variable later.
      registerFor[s.target] = gen(s.source)
    },
    Print(s) {
      const arg = `double ${gen(s.arg)}`
      // Print requires an extra argument for the format string
      const format =
        "i8* getelementptr inbounds ([3 x i8], [3 x i8]* @format, i64 0, i64 0)"
      output.push(`call i64 (i8*, ...) @printf(${format}, ${arg});`)
    },
    FunctionCall(c) {
      const args = c.args
        .map(gen)
        .map(a => `double ${a}`)
        .join(", ")
      let source = `${gen(c.callee)}(${args})`
      const target = allocateRegister()
      output.push(`${target} = ${source}`)
      return target
    },
    BinaryExpression(e) {
      const left = gen(e.left)
      const right = gen(e.right)
      const op = { "+": "fadd", "-": "fsub", "*": "fmul", "/": "fdiv", "%": "frem" }[e.op]
      const target = allocateRegister()
      if (e.op === "**") {
        output.push(
          `${target} = call double @llvm.pow.f64(double ${left}, double ${right})`
        )
      } else {
        output.push(`${target} = ${op} double ${left}, ${right}`)
      }
      return target
    },
    UnaryExpression(e) {
      const operand = gen(e.operand)
      // The only unary expression in Astro is negation
      const target = allocateRegister()
      output.push(`${target} = fsub double 0.0, ${operand}`)
      return target
    },
  }

  gen(program)
  return output.join("\n")
}
