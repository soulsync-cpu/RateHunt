import React from "react"

interface FiltersProps {
  onFilterChange?: (filters: { [key: string]: string }) => void
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [selectedExchange, setSelectedExchange] = React.useState("")
  const [selectedCurrency, setSelectedCurrency] = React.useState("")

  const handleExchangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedExchange(val)
    onFilterChange?.({ exchange: val, currency: selectedCurrency })
  }

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedCurrency(val)
    onFilterChange?.({ exchange: selectedExchange, currency: val })
  }

  return (
    <div className="flex gap-4 items-center p-4 bg-gray-100 rounded-lg shadow">
      <select
        value={selectedExchange}
        onChange={handleExchangeChange}
        className="border rounded px-2 py-1"
      >
        <option value="">All Exchanges</option>
        <option value="Binance">Binance</option>
        <option value="Coinbase">Coinbase</option>
        <option value="Kraken">Kraken</option>
        <option value="Bybit">Bybit</option>
        <option value="Bitget">Bitget</option>
        <option value="OKX">OKX</option>
      </select>

      <select
        value={selectedCurrency}
        onChange={handleCurrencyChange}
        className="border rounded px-2 py-1"
      >
        <option value="">All Currencies</option>
        <option value="USDT">USDT</option>
        <option value="USDC">USDC</option>
        <option value="BTC">BTC</option>
        <option value="ETH">ETH</option>
        <option value="BNB">BNB</option>
        <option value="SOL">SOL</option>
      </select>
    </div>
  )
}
