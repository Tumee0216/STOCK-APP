const STOCK_LIST_KEY = "cinegy_stock_list"

/**
 * Save stock list to local storage
 * @param stocks - Array of stock objects to save
 */
export function saveStockList(stocks: any[]): void {
  try {
    localStorage.setItem(STOCK_LIST_KEY, JSON.stringify(stocks))
  } catch (error) {
    console.error("Failed to save stock list:", error)
  }
}

/**
 * Load stock list from local storage
 * @returns Promise<Array> - Array of stock objects
 */
export async function loadStockList(): Promise<any[]> {
  try {
    const stocksJson = localStorage.getItem(STOCK_LIST_KEY)
    if (!stocksJson) return []
    return JSON.parse(stocksJson)
  } catch (error) {
    console.error("Failed to load stock list:", error)
    return []
  }
}

/**
 * Clear saved stock list
 */
export function clearStockList(): void {
  try {
    localStorage.removeItem(STOCK_LIST_KEY)
  } catch (error) {
    console.error("Failed to clear stock list:", error)
  }
}
