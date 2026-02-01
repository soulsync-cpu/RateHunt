import React from "react"

export function Header() {
  return (
    <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
      <h1 className="text-2xl font-bold text-gray-800">RateHunt 💱</h1>
      <nav className="flex gap-4">
        <a href="#" className="text-sm text-gray-600 hover:text-black">Home</a>
        <a href="#" className="text-sm text-gray-600 hover:text-black">About</a>
        <a href="#" className="text-sm text-gray-600 hover:text-black">Contact</a>
      </nav>
    </header>
  )
}
