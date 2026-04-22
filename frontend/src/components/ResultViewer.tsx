import { useState } from "react";

const PINATA_GATEWAY_BASE_URL = "https://gateway.pinata.cloud/ipfs";

export default function ResultViewer() {
  const [cid, setCid] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAndDecrypt = async () => {
    if (!cid.trim()) {
      setError("Enter a CID from the worker submission before fetching.");
      setResult("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${PINATA_GATEWAY_BASE_URL}/${cid.trim()}`);

      if (!response.ok) {
        throw new Error(`IPFS fetch failed with status ${response.status}.`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      // MVP step: expose the encrypted payload in-browser.
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch result payload.";
      setError(message);
      setResult("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel panel-wide panel-fill">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Private Results</p>
          <h2>Fetch encrypted output from IPFS</h2>
        </div>
      </div>

      <p className="supporting-text">
        Paste the `resultCID` from a submitted job. This keeps retrieval in the browser and sets up
        the next step: requester-only decryption with a manually uploaded private key.
      </p>

      <div className="form-grid">
        <label>
          <span>IPFS CID</span>
          <input
            placeholder="Qm..."
            value={cid}
            onChange={(event) => setCid(event.target.value)}
          />
        </label>
      </div>

      <div className="actions">
        <button className="primary-button" onClick={() => void fetchAndDecrypt()} disabled={loading}>
          {loading ? "Fetching..." : "Fetch Payload"}
        </button>
        <span className="inline-note">Current step shows the encrypted JSON payload exactly as stored.</span>
      </div>

      {error ? <p className="message error">{error}</p> : null}

      {result ? (
        <pre className="result-block">{result}</pre>
      ) : (
        <p className="supporting-text result-placeholder">
          The encrypted payload will appear here once the CID resolves from IPFS.
        </p>
      )}
    </section>
  );
}
