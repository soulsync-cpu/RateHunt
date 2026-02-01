import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Filters } from "@/components/Filters";
import { RatesTable } from "@/components/RatesTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface P2PRate {
  exchange: string;
  buyPrice: number;
  sellPrice: number;
  available: number;
  limit: string;
  paymentMethod: string;
  tradeUrl: string;
}

const Index = () => {
  const [selectedFiat, setSelectedFiat] = useState("USD");
  const [selectedCrypto, setSelectedCrypto] = useState("USDT");
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([
    "Binance",
    "OKX",
    "Bybit",
    "Huobi",
    "KuCoin",
  ]);
  const [noVerificationRequired, setNoVerificationRequired] = useState(false);
  const [onlyTradable, setOnlyTradable] = useState(true);
  const [minAmount, setMinAmount] = useState("");
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [rates, setRates] = useState<P2PRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchRates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-p2p-rates", {
        body: {
          fiat: selectedFiat,
          crypto: selectedCrypto,
          exchanges: selectedExchanges,
          noVerificationRequired,
          onlyTradable,
          minAmount: minAmount ? parseFloat(minAmount) : undefined,
          paymentMethods: selectedPaymentMethods,
        },
      });

      if (error) throw error;
      
      setRates(data?.rates || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching rates:", error);
      toast.error("Failed to fetch rates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [selectedFiat, selectedCrypto, selectedExchanges, noVerificationRequired, onlyTradable, minAmount, selectedPaymentMethods]);

  return (
    <div className="min-h-screen bg-background">
      <Header lastUpdate={lastUpdate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Filters
          selectedFiat={selectedFiat}
          selectedCrypto={selectedCrypto}
          selectedExchanges={selectedExchanges}
          noVerificationRequired={noVerificationRequired}
          onlyTradable={onlyTradable}
          minAmount={minAmount}
          selectedPaymentMethods={selectedPaymentMethods}
          onFiatChange={setSelectedFiat}
          onCryptoChange={setSelectedCrypto}
          onExchangesChange={setSelectedExchanges}
          onNoVerificationChange={setNoVerificationRequired}
          onOnlyTradableChange={setOnlyTradable}
          onMinAmountChange={setMinAmount}
          onPaymentMethodsChange={setSelectedPaymentMethods}
        />
        <RatesTable 
          rates={rates} 
          loading={loading}
          fiat={selectedFiat}
          crypto={selectedCrypto}
        />
      </main>
    </div>
  );
};

export default Index;
