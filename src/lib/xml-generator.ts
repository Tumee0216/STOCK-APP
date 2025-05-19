export function generateXml(stocks: any[]): string {
  const tickerText = stocks.map((stock) => {
    const symbol = escapeXml(stock.symbol || "");
    const name = escapeXml(stock.name || "");
    const price = (Number(stock.price) || 0).toFixed(2);
    const change = (Number(stock.change) || 0).toFixed(2);
    const sign = stock.change >= 0 ? "+" : ""; // Add "+" for positive change

    return `${symbol} - ${name} | ${price} (${sign}${change})`;
  }).join("    "); // 4 spaces between entries

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Ticker>\n  <TickerText>${escapeXml(tickerText)}</TickerText>\n</Ticker>`;
}

/**
 * Escape XML special characters
 * @param text - Text to escape
 * @returns string - Escaped text
 */
export function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
