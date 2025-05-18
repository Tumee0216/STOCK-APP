import { NextResponse } from "next/server"
import { searchSymbols, getQuote } from "@/lib/stock-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const query = searchParams.get("query")
  const apiKey = searchParams.get("apiKey")

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 })
  }

  try {
    if (symbol) {
      // Get quote for a specific symbol
      const quote = await getQuote(symbol, apiKey)
      return NextResponse.json(quote)
    } else if (query) {
      // Search for symbols
      const results = await searchSymbols(query, apiKey)
      return NextResponse.json(results)
    } else {
      return NextResponse.json({ error: "Either symbol or query parameter is required" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch stock data" }, { status: 500 })
  }
}
