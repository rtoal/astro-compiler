export function program(statements) {
  return { kind: "Program", statements }
}

export function assignment(target, source) {
  return { kind: "Assignment", target, source }
}

export function procedureCall(callee, args) {
  return { kind: "ProcedureCall", callee, args }
}

export function functionCall(callee, args) {
  return { kind: "FunctionCall", callee, args }
}

export function binary(op, left, right) {
  return { kind: "BinaryExpression", op, left, right }
}

export function unary(op, operand) {
  return { kind: "UnaryExpression", op, operand }
}

export function variable(name, writable) {
  return { kind: "Variable", name, writable }
}

export function fun(name, paramCount) {
  return { kind: "Function", name, paramCount }
}

export function procedure(name, paramCount) {
  return { kind: "Procedure", name, paramCount }
}

export const standardLibrary = Object.freeze({
  π: variable("π", false),
  sqrt: fun("sqrt", 1),
  sin: fun("sin", 1),
  cos: fun("cos", 1),
  hypot: fun("hypot", 2),
  print: procedure("print", 1),
})
