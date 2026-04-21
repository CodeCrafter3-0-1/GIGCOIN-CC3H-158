import { useMemo, useState } from "react";

const MARKET_PRICE = 1.84;
const DAY_CHANGE = 4.6;
const DAY_VOLUME = 248_000;
const DAY_RANGE = "$1.71 - $1.92";
const BUY_FEE_RATE = 0.015;
const SELL_FEE_RATE = 0.012;

type TradeMode = "buy" | "sell";

export default function MarketTab() {
  const [mode, setMode] = useState<TradeMode>("buy");
  const [usdAmount, setUsdAmount] = useState("500");
  const [gigAmount, setGigAmount] = useState("250");

  const buyQuote = useMemo(() => {
    const usd = Number(usdAmount || "0");
    const fee = usd * BUY_FEE_RATE;
    const netUsd = Math.max(usd - fee, 0);
    const gig = netUsd / MARKET_PRICE;
    return { usd, fee, gig };
  }, [usdAmount]);

  const sellQuote = useMemo(() => {
    const gig = Number(gigAmount || "0");
    const grossUsd = gig * MARKET_PRICE;
    const fee = grossUsd * SELL_FEE_RATE;
    const proceeds = Math.max(grossUsd - fee, 0);
    return { gig, fee, proceeds };
  }, [gigAmount]);

  return (
    <section className="market-layout">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Market</p>
            <h2>GigCoin spot market</h2>
          </div>
          <span className="status-pill online">Demo feed</span>
        </div>

        <div className="metric-grid market-metrics">
          <article className="metric-card">
            <p className="metric-label">Spot price</p>
            <strong className="metric-value">${MARKET_PRICE.toFixed(2)}</strong>
          </article>
          <article className="metric-card">
            <p className="metric-label">24h change</p>
            <strong className="metric-value positive">+{DAY_CHANGE.toFixed(1)}%</strong>
          </article>
          <article className="metric-card">
            <p className="metric-label">24h volume</p>
            <strong className="metric-value">${DAY_VOLUME.toLocaleString()}</strong>
          </article>
          <article className="metric-card">
            <p className="metric-label">24h range</p>
            <strong className="metric-value">{DAY_RANGE}</strong>
          </article>
        </div>

        <p className="supporting-text compact">
          This tab is a product-side market view for the demo. Buy and sell widgets below simulate
          execution using the displayed GigCoin spot price.
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trade</p>
            <h2>Buy or sell GIG</h2>
          </div>
        </div>

        <div className="tab-row sub-tabs">
          <button
            type="button"
            className={`tab-button ${mode === "buy" ? "active" : ""}`}
            onClick={() => setMode("buy")}
          >
            Buy
          </button>
          <button
            type="button"
            className={`tab-button ${mode === "sell" ? "active" : ""}`}
            onClick={() => setMode("sell")}
          >
            Sell
          </button>
        </div>

        {mode === "buy" ? (
          <div className="form-grid">
            <label>
              <span>USD to spend</span>
              <input value={usdAmount} onChange={(event) => setUsdAmount(event.target.value)} inputMode="decimal" />
            </label>

            <div className="quote-card">
              <div className="quote-row">
                <span>Network + protocol fees</span>
                <strong>${buyQuote.fee.toFixed(2)}</strong>
              </div>
              <div className="quote-row">
                <span>Estimated GIG received</span>
                <strong>{buyQuote.gig.toFixed(2)} GIG</strong>
              </div>
            </div>

            <button className="primary-button" type="button">
              Buy GigCoin
            </button>
          </div>
        ) : (
          <div className="form-grid">
            <label>
              <span>GIG to sell</span>
              <input value={gigAmount} onChange={(event) => setGigAmount(event.target.value)} inputMode="decimal" />
            </label>

            <div className="quote-card">
              <div className="quote-row">
                <span>Execution fee</span>
                <strong>${sellQuote.fee.toFixed(2)}</strong>
              </div>
              <div className="quote-row">
                <span>Estimated USD proceeds</span>
                <strong>${sellQuote.proceeds.toFixed(2)}</strong>
              </div>
            </div>

            <button className="primary-button" type="button">
              Sell GigCoin
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
