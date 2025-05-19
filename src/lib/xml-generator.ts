export function generateXml(stocks: any[]): string {
  const date = new Date().toISOString()
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<StockData timestamp="${date}">\n`

  stocks.forEach((stock) => {
    xml += `  <Stock>\n`
    xml += `    <Symbol>${stock.symbol}</Symbol>\n`
    xml += `    <Name>${stock.name}</Name>\n`
    xml += `    <Price>${(stock.price || 0).toFixed(2)}</Price>\n`
    xml += `    <Change>${(stock.change || 0).toFixed(2)}</Change>\n`
    xml += `    <ChangePercent>${(stock.percentChange || 0).toFixed(3)}</ChangePercent>\n`
    xml += `  </Stock>\n`
  })

  xml += `</StockData>`
  return xml
}

/**
 * Escape XML special characters
 * @param text - Text to escape
 * @returns string - Escaped text
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
