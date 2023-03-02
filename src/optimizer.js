// Optimizer
//
// This module exports a single function to perform machine-independent
// optimizations on the analyzed semantic graph.
//
// The only optimizations supported here are:
//
//   - assignments to self (x = x) turn into no-ops
//   - constant folding
//   - some strength reductions (+0, -0, *0, *1, etc.)

import { UnaryExpression } from "./core.js"

export default function optimize(node) {
  return optimizers[node.constructor.name](node)
}

const optimizers = {
  Program(p) {
    p.statements = optimize(p.statements)
    return p
  },
  Assignment(s) {
    s.source = optimize(s.source)
    if (s.source === s.target) {
      return null
    }
    return s
  },
  ProcedureCall(c) {
    c.args = optimize(c.args)
    return c
  },
  FunctionCall(c) {
    c.callee = optimize(c.callee)
    c.args = optimize(c.args)
    if (c.args.length === 1 && typeof c.args[0] == "number") {
      if (c.callee.name === "sqrt") return Math.sqrt(c.args[0])
      if (c.callee.name === "sin") return Math.sin(c.args[0])
      if (c.callee.name === "cos") return Math.cos(c.args[0])
    }
    // TODO optimize hypot
    return c
  },
  BinaryExpression(e) {
    e.left = optimize(e.left)
    e.right = optimize(e.right)
    if (e.left.constructor === Number) {
      if (e.right.constructor === Number) {
        if (e.op === "+") {
          return e.left + e.right
        } else if (e.op === "-") {
          return e.left - e.right
        } else if (e.op === "*") {
          return e.left * e.right
        } else if (e.op === "/") {
          return e.left / e.right
        } else if (e.op === "**" && !(e.left === 0 && e.right == 0)) {
          return e.left ** e.right
        }
      } else if (e.left === 0 && e.op === "+") {
        return e.right
      } else if (e.left === 1 && e.op === "*") {
        return e.right
      } else if (e.left === 0 && e.op === "-") {
        return new UnaryExpression("-", e.right)
      } else if (e.left === 0 && ["*", "/"].includes(e.op)) {
        return 0
      } else if (e.op === "**" && e.left === 1) {
        return 1
      }
    } else if (e.right.constructor === Number) {
      if (["+", "-"].includes(e.op) && e.right === 0) {
        return e.left
      } else if (["*", "/"].includes(e.op) && e.right === 1) {
        return e.left
      } else if (e.op === "*" && e.right === 0) {
        return 0
      } else if (e.op === "**" && e.left !== 0 && e.right === 0) {
        return 1
      }
    }
    return e
  },
  UnaryExpression(e) {
    e.operand = optimize(e.operand)
    if (e.operand.constructor === Number) {
      if (e.op === "-") {
        return -e.operand
      }
    }
    return e
  },
  Variable(v) {
    return v
  },
  Function(f) {
    return f
  },
  Procedure(p) {
    return p
  },
  Number(n) {
    return n
  },
  Boolean(b) {
    return b
  },
  Array(a) {
    // Optimizing arrays involves flattening an removing nulls
    return a.flatMap(optimize).filter(s => s !== null)
  },
}
