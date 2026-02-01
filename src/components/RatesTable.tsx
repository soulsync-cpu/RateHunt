import React from "react"

interface Rate {
  id: string
  exchange: string
  currency: string
  buy: number
  sell: number
  updated_at?: string
}

interface RatesTableProps {
  data?: Rate[]
}

export function RatesTable({ data = [] }: RatesTableProps) {
  if (!data.length)
    return (
      <div className="text-center py-8 text-gray-500">
        No rates available yet 😶
      </div>
    )

  return (
    <table className="w-full border-collapse text-sm mt-4">
      <thead>
        <tr className="bg-gray-100 border-b">
          <th className="p-2 text-left">Exchange</th>
          <th className="p-2 text-left">Currency</th>
          <th className="p-2 text-left">₹Buy</th>
          <th className="p-2 text-left">₹Sell</th>
          <th className="p-2 text-left">Updated</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} className="border-b hover:bg-gray-50">
            <td className="p-2">{row.exchange}</td>
            <td className="p-2">{row.currency}</td>
            <td className="p-2 text-green-600 font-semibold">{row.buy}</td>
            <td className="p-2 text-red-600 font-semibold">{row.sell}</td>
            <td className="p-2">{row.updated_at || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
