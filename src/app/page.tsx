"use client"

import { useState, useEffect } from "react"
import { Search, Plus, X, RefreshCw, Download, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { searchSymbols, getBatchQuotes } from "@/lib/stock-api"
import { saveStockList, loadStockList } from "@/lib/storage"
import { generateXml } from "@/lib/xml-generator"

export default function StockXmlGenerator() {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(60)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedStocks, setSelectedStocks] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("stocks")
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(false)

  // Load saved stocks and API key on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("apiKey") || ""
    setApiKey(savedApiKey)

    if (savedApiKey) {
      validateApiKey(savedApiKey)
    }

    loadStockList().then((stocks) => {
      if (stocks && stocks.length > 0) {
        setSelectedStocks(stocks)
      }
    })
  }, [])

  useEffect(() => {
    if (!autoRefresh || selectedStocks.length === 0) return

    const intervalId = setInterval(async () => {
      await refreshData()
      saveXmlToServer()
    }, refreshInterval * 1000)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, selectedStocks])


  // Search for stocks when search term changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.length >= 2 && apiKey) {
        setIsLoading(true)
        searchSymbols(searchTerm, apiKey)
          .then((results) => {
            setSearchResults(results)
            setIsLoading(false)
          })
          .catch((error) => {
            console.error("Search error:", error)
            setIsLoading(false)
            toast("SearchError")
          })
      } else {
        setSearchResults([])
      }
    }, 500) // Debounce search to avoid too many API calls

    return () => clearTimeout(delaySearch)
  }, [searchTerm, apiKey, toast])

  // Validate API key
  const validateApiKey = async (key: string) => {
    if (!key) {
      setApiKeyValid(false)
      return
    }

    try {
      setIsLoading(true)
      const testResult = await searchSymbols("AAPL", key)
      setApiKeyValid(testResult && testResult.length > 0)
      setIsLoading(false)
    } catch (error) {
      console.error("API key validation error:", error)
      setApiKeyValid(false)
      setIsLoading(false)
    }
  }

  // Save API key
  const saveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem("apiKey", key)
    validateApiKey(key)
  }

  // Add stock to selected list
  const addStock = (stock: any) => {
    if (!selectedStocks.some((s) => s.symbol === stock.symbol)) {
      const updatedStocks = [...selectedStocks, stock]
      setSelectedStocks(updatedStocks)
      saveStockList(updatedStocks)
    }
  }

  // Remove stock from selected list
  const removeStock = (symbol: string) => {
    const updatedStocks = selectedStocks.filter((stock) => stock.symbol !== symbol)
    setSelectedStocks(updatedStocks)
    saveStockList(updatedStocks)
  }

  // Refresh stock data
  const refreshData = async () => {
    if (selectedStocks.length === 0 || !apiKey) return

    setIsLoading(true)

    try {
      const symbols = selectedStocks.map((stock) => stock.symbol)
      const quotes = await getBatchQuotes(symbols, apiKey)

      // Update selected stocks with new data
      const updatedStocks = selectedStocks.map((stock) => {
        const quote = quotes.find((q) => q.symbol === stock.symbol)
        if (quote && !quote.error) {
          return {
            ...stock,
            price: quote.price,
            change: quote.change,
            percentChange: quote.percentChange,
          }
        }
        return stock
      })

      setSelectedStocks(updatedStocks)
      saveStockList(updatedStocks)
      setLastUpdated(new Date())

      toast("Data Updated")
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast("Update Error")
    } finally {
      setIsLoading(false)
    }
  }

  // Download XML file
  const downloadXml = () => {
    if (selectedStocks.length === 0) {
      toast("No Stocks Selected")
      return
    }

    const xml = generateXml(selectedStocks)
    const blob = new Blob([xml], { type: "text/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cinegy_stocks_${new Date().toISOString().split("T")[0]}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast("XML Downloaded")
  }

  const saveXmlToServer = async () => {
    if (selectedStocks.length === 0) {
      toast("No Stocks Selected")
      return
    }

    try {
      const response = await fetch("/api/xml", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stocks: selectedStocks }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate XML")
      }

    } catch (error: any) {
      console.error("Download error:", error)
      toast("Failed to save XML")
    }
  }

  console.log(selectedStocks)


  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">STOCK FORMATTER WITH SEARCH - TUMEE</h1>

      <Tabs defaultValue="stocks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="stocks">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Search & Select Stocks</CardTitle>
                <CardDescription>Search for stock symbols and add them to your list</CardDescription>
              </CardHeader>
              <CardContent>
                {!apiKey ? (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please set your Twelvedata API key in Settings</AlertDescription>
                  </Alert>
                ) : !apiKeyValid ? (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Invalid API key. Please check your settings.</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by symbol or company name..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline" onClick={() => setSearchTerm("")}>
                        Clear
                      </Button>
                    </div>

                    <div className="border rounded-md h-[300px] overflow-y-auto">
                      {isLoading && searchTerm.length >= 2 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        <ul className="divide-y">
                          {searchResults.map((stock) => (
                            <li key={stock.symbol} className="p-3 flex justify-between items-center hover:bg-muted">
                              <div>
                                <div className="font-medium">{stock.symbol}</div>
                                <div className="text-sm text-muted-foreground">{stock.name}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addStock(stock)}
                                disabled={selectedStocks.some((s) => s.symbol === stock.symbol)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : searchTerm.length >= 2 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No stocks found
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Хамгийн багадаа 2 тэмдэгт оруулна уу
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selected Stocks</CardTitle>
                <CardDescription>Stocks that will be included in your XML file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md h-[300px] overflow-y-auto">
                  {selectedStocks.length > 0 ? (
                    <ul className="divide-y">
                      {selectedStocks.map((stock) => (
                        <li key={stock.symbol} className="p-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-sm text-muted-foreground">{stock.name}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={'secondary'}>
                              {stock.change >= 0 ? "+" : ""}
                              {stock.change?.toFixed(2) || "0.00"} ({stock.percentChange.toFixed(3)}%)
                            </Badge>
                            <Badge variant={stock.change >= 0 ? "success" : "destructive"}>
                              ${stock.price?.toFixed(2) || "0.00"}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => removeStock(stock.symbol)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No stocks selected
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">Сүүлд шинэчлэгдсэн: {lastUpdated.toLocaleTimeString()}</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={refreshData}
                    disabled={selectedStocks.length === 0 || !apiKeyValid || isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Дахин шинэчлэх
                  </Button>
                  <Button onClick={downloadXml} disabled={selectedStocks.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    XML татах
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>XML Preview</CardTitle>
              <CardDescription>Бэлтгэсэн XML file-г харна уу</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview">
                <TabsList className="mb-4">
                  <TabsTrigger value="preview">Турших</TabsTrigger>
                  <TabsTrigger value="about">Cinegy XML Format</TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                  {selectedStocks.length > 0 ? (
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">{generateXml(selectedStocks)}</pre>
                  ) : (
                    <Alert>
                      <AlertDescription>XML format харахын тулд ядаж нэг stock сонгоно уу?</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                <TabsContent value="about">
                  <div className="prose dark:prose-invert max-w-none">
                    <p>
                      Энэ програм нь Cinegy програмууд руу импортолж болох хувьцааны үнийн мэдээллийг агуулсан XML файл үүсгэнэ. XML формат нь дараах элементүүдийг тус бүрийн хувьцаанд оруулдаг:
                    </p>
                    <ul>
                      <li>
                        <strong>Symbol</strong> - Хувьцааны биржийн товчлол
                      </li>
                      <li>
                        <strong>Name</strong> - Компани нэр
                      </li>
                      <li>
                        <strong>Price</strong> - Одоогийн хувьцааны үнэ
                      </li>
                      <li>
                        <strong>Change</strong> - Үнийн өөрчлөлт
                      </li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Тохируулга</CardTitle>
              <CardDescription>Өөрийн API key болон бусад зүйлийг тохируулна уу</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Twelvedata API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Үнэгүй Twelvedate API key-г эндээс{" "}
                  <a
                    href="https://twelvedata.com/account/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Twelvedata
                  </a>
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Twelvedata API key-г оруулна уу"
                  />
                  <Button onClick={() => saveApiKey(apiKey)} disabled={isLoading}>
                    {isLoading ? "Шалгаж байна..." : "Хадгалах"}
                  </Button>
                </div>
                {apiKey && (
                  <div className={`text-sm ${apiKeyValid ? "text-green-600" : "text-red-600"}`}>
                    {apiKeyValid ? "✓ Идэвхтэй API key" : "✗ Идэвхгүй API key"}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Үнэгүй API түлхүүрийг ашиглан 8/мин 800/өдөр удаагын хүсэлт хийх боломжтой.
                </p>
              </div>
              <div className="space-y-2 pt-6 border-t">
                <h3 className="text-lg font-medium">XML Refresh Settings</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    Автоматаар XML татах
                  </label>

                  <label className="text-sm">
                    Давтамж:
                    <select
                      className="ml-2 border rounded px-2 py-1 text-sm"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    >
                      <option value={10}>10 секунд</option>
                      <option value={30}>30 секунд</option>
                      <option value={60}>1 минут</option>
                      <option value={120}>2 минут</option>
                      <option value={300}>5 минут</option>
                    </select>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Хэрвээ идэвхжүүлсэн бол, XML файл автоматаар {refreshInterval} секунд тутамд татагдана.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
