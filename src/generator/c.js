// This code generator exports a single function, generate(program), which
// accepts a program representation and returns the C translation as a
// string.

import { standardLibrary } from "../core.js"

export default function generate(program) {
  const output = []

  // Collect all assigned variables here so we can output declarations
  const assigned = new Set()

  // Variable names in JS will be suffixed with _1, _2, _3, etc. This is
  // because "while", for example, is a legal variable name in Astro, but
  // not in JS. So we want to generate something like "while_1". We handle
  // this by mapping each variable declaration to its suffix.
  const targetName = (mapping => {
    return entity => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1)
      }
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    Program(p) {
      output.push("#include <stdio.h>")
      output.push("#include <stdlib.h>")
      output.push("#include <math.h>")
      output.push("int main() {")
      output.push("")
      p.statements.forEach(gen)
      output.push("return 0;")
      output.push("}")
    },
    Variable(v) {
      if (v === standardLibrary.π) return "M_PI"
      return targetName(v)
    },
    Function(f) {
      // The only functions in Astro are in the standard library.
      return new Map([
        [standardLibrary.sqrt, "sqrt"],
        [standardLibrary.sin, "sin"],
        [standardLibrary.cos, "cos"],
        [standardLibrary.hypot, "hypot"],
      ]).get(f)
    },
    Assignment(s) {
      const source = gen(s.source)
      const target = gen(s.target)
      assigned.add(target)
      output.push(`${target} = ${source};`)
    },
    Print(s) {
      const format = `"${Array(c.args.length).fill("%g").join(" ")}\\n"`
      const allArgs = [format, ...args].join(", ")
      output.push(`printf(${allArgs});`)
    },
    FunctionCall(c) {
      const args = c.args.map(gen)
      const callee = gen(c.callee)
      return `${callee}(${args.join(",")})`
    },
    BinaryExpression(e) {
      return `(${gen(e.left)} ${e.op} ${gen(e.right)})`
    },
    UnaryExpression(e) {
      return `${e.op}(${gen(e.operand)})`
    },
  }

  gen(program)
  // Fifth line declares all the variables (required in C, not in Astro)
  output[4] = assigned.size > 0 ? `double ${[...assigned].join(", ")};` : ""
  return output.join("\n")
}
