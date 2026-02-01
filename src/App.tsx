import React from "react"
import axios from "axios"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Header } from "@/components/Header"
import { Filters } from "@/components/Filters"
import { RatesTable } from "@/components/RatesTable"

export default function App() {
  const [rates, setRates] = React.useState<any[]>([
    { id: "1", exchange: "Binance", currency: "BTC", buy: 0, sell: 0 },
    { id: "2", exchange: "Binance", currency: "ETH", buy: 0, sell: 0 },
    { id: "3", exchange: "Binance", currency: "USDT", buy: 0, sell: 0 },
  ])

  const [usdtInr, setUsdtInr] = React.useState<number>(0)

  // USDT → INR (USD → INR)
  const fetchUSDTINR = async () => {
    const res = await axios.get(
      "https://api.exchangerate.host/latest?base=USD&symbols=INR"
    )
    setUsdtInr(res.data.rates.INR)
  }

  React.useEffect(() => {
    fetchUSDTINR()
    const fxInterval = setInterval(fetchUSDTINR, 60000)
    return () => clearInterval(fxInterval)
  }, [])

  React.useEffect(() => {
    if (!usdtInr) return

    const ws = new WebSocket(
      "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker"
    )

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const { s, c } = msg.data // symbol, last price

      const priceINR = Number(c) * usdtInr

      setRates(prev =>
        prev.map(row => {
          if (row.currency === "BTC" && s === "BTCUSDT")
            return { ...row, buy: priceINR.toFixed(2), sell: priceINR.toFixed(2) }

          if (row.currency === "ETH" && s === "ETHUSDT")
            return { ...row, buy: priceINR.toFixed(2), sell: priceINR.toFixed(2) }

          if (row.currency === "USDT")
            return { ...row, buy: usdtInr.toFixed(2), sell: usdtInr.toFixed(2) }

          return row
        })
      )
    }

    ws.onerror = err => console.error("WS error", err)
    ws.onclose = () => console.log("WS closed")

    return () => ws.close()
  }, [usdtInr])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <Filters />
          <RatesTable data={rates} />
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
