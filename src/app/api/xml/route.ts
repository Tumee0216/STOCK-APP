import { generateXml } from "@/lib/xml-generator"
import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    if (!data.stocks || !Array.isArray(data.stocks) || data.stocks.length === 0) {
      return NextResponse.json({ error: "No stocks provided" }, { status: 400 })
    }

    const xml = generateXml(data.stocks)
    const fileName = `cinegy_stocks.xml`

    const filePath = path.join(process.cwd(), "public", fileName)
    await writeFile(filePath, xml, "utf-8")

    return NextResponse.json({ success: true, path: `/` + fileName })
  } catch (error: any) {
    console.error("XML generation error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate XML" }, { status: 500 })
  }
}
