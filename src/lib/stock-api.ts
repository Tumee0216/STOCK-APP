const cache: {
  symbols: any[] | null
  quotes: Record<string, any>
  lastUpdated: Record<string, number>
} = {
  symbols: null,
  quotes: {},
  lastUpdated: {},
}

const CACHE_EXPIRATION = 5 * 60 * 1000 // 5 minutes

/**
 * Search for stock symbols using Twelve Data
 * @param query - Search query
 * @param apiKey - Twelve Data API key
 * @returns Promise<Array> - Matching symbols
 */
export async function searchSymbols(query: string, apiKey: string): Promise<any[]> {
  if (!query || query.length < 1) return []

  try {
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}&outputsize=1&timezone=Asia/Ulaanbaatar&interval=1min`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.data && Array.isArray(data.data)) {
      const results = data.data.map((item: any) => ({
        symbol: item.symbol,
        name: item.instrument_name,
        exchange: item.exchange,
        type: item.instrument_type,
        currency: item.currency,
        price: 0,
        change: 0,
      }))

      cache.symbols = results
      return results
    }

    if (data.message) {
      throw new Error(data.message)
    }

    return []
  } catch (error: any) {
    console.error("Error searching symbols:", error)
    throw new Error(error.message || "Failed to search for stocks")
  }
}

/**
 * Get real-time quote for a stock from Twelve Data
 * @param symbol - Stock symbol
 * @param apiKey - Twelve Data API key
 * @returns Promise<Object> - Stock quote data
 */
export async function getQuote(symbol: string, apiKey: string): Promise<any> {
  const now = Date.now()
  if (cache.quotes[symbol] && cache.lastUpdated[symbol] && now - cache.lastUpdated[symbol] < CACHE_EXPIRATION) {
    return cache.quotes[symbol]
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data && data.price && !data.code) {
      const result = {
        symbol: data.symbol,
        price: parseFloat(data.price),
        change: parseFloat(data.change),
        changePercent: data.percent_change,
        lastUpdated: data.timestamp,
      }

      cache.quotes[symbol] = result
      cache.lastUpdated[symbol] = now

      return result
    }

    if (data.message) {
      throw new Error(data.message)
    }

    throw new Error("Invalid response from Twelve Data")
  } catch (error: any) {
    console.error(`Error fetching quote for ${symbol}:`, error)

    if (cache.quotes[symbol]) {
      return cache.quotes[symbol]
    }

    return {
      symbol,
      price: 0,
      change: 0,
      error: true,
      message: error.message || "Failed to fetch quote",
    }
  }
}

/**
 * Get quotes for multiple symbols (batch request)
 * @param symbols - Array of symbols
 * @param apiKey - Twelve Data API key
 * @returns Promise<Array> - Quotes for symbols
 */
export async function getBatchQuotes(symbols: string[], apiKey: string): Promise<any[]> {
  if (!symbols || symbols.length === 0 || !apiKey) {
    throw new Error("Symbols array and API key are required");
  }

  try {
    // Join symbols with commas for the API request
    const symbolsString = symbols.join(",");
    
    // Make request to Twelvedata API
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbolsString}&apikey=${apiKey}&timezone=Asia/Ulaanbaatar`
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle both single and multiple stock responses
    // If only one symbol was requested, the API returns an object, not an array
    if (symbols.length === 1) {
      const symbol = symbols[0];
      const stockData = data;
      
      if (stockData.code) {
        // API returned an error for this symbol
        return [{
          symbol: symbol,
          error: true,
          message: stockData.message || "Error fetching data"
        }];
      }

      console.log("Single stock data:", stockData);
      
      return [{
        symbol: symbol,
        name: stockData.name,
        price: parseFloat(stockData.close),
        change: parseFloat(stockData.change),
        percentChange: stockData.percent_change,
        exchange: stockData.exchange
      }];
    }
    
    // Process multiple stocks
    const result = [];
    
    for (const symbol of symbols) {
      const stockData = data[symbol];
      
      if (!stockData || stockData.code) {
        // Handle missing data or API error for this symbol
        result.push({
          symbol: symbol,
          error: true,
          message: stockData?.message || "Error fetching data"
        });
        continue;
      }
      
      result.push({
        symbol: symbol,
        name: stockData.name,
        price: parseFloat(stockData.close),
        change: parseFloat(stockData.change),
        percentChange: parseFloat(stockData.percent_change),
        exchange: stockData.exchange
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching batch quotes:", error);
    throw new Error("Failed to fetch stock quotes");
  }
}


/**
 * Clear the cache
 */
export function clearCache() {
  cache.symbols = null
  cache.quotes = {}
  cache.lastUpdated = {}
}