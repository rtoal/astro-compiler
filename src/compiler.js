import parse from "./parser.js"
import analyze from "./analyzer.js"
import optimize from "./optimizer.js"
import generate from "./generator/index.js"

export default function compile(source, outputType) {
  const options = ["parsed", "analyzed", "optimized", "js", "llvm", "c"]
  if (!options.includes(outputType)) {
    throw new Error("Unknown output type")
  }
  const match = parse(source)
  if (outputType === "parsed") return "Syntax is ok"
  const analyzed = analyze(match)
  if (outputType === "analyzed") return analyzed
  const optimized = optimize(analyzed)
  if (outputType === "optimized") return optimized
  return generate(optimized, outputType)
}
