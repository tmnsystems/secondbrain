import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!intent.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ask`,
        { intent }
      );
      const { output: aiOutput, suggestions: aiSuggestions } = res.data;
      setOutput(aiOutput);
      setSuggestions(aiSuggestions);
      setHistory([
        { intent, output: aiOutput, suggestions: aiSuggestions },
        ...history,
      ]);
      setIntent('');
    } catch (err) {
      console.error(err);
      alert('Error fetching AI response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Tina’s Second Brain Business Strategist</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="Enter your business intent..."
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          style={{ width: '100%', fontSize: '1rem', padding: '0.5rem' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
        >
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
      {output && (
        <div style={{ marginTop: '1rem' }}>
          <h2>AI Output</h2>
          <div style={{ whiteSpace: 'pre-wrap', background: '#f3f3f3', padding: '1rem' }}>
            {output}
          </div>
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Suggestions</h3>
          <ul>
            {suggestions.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {history.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>History</h3>
          {history.map((h, idx) => (
            <div
              key={idx}
              style={{ marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}
            >
              <strong>Intent:</strong> {h.intent}
              <div>
                <strong>Output:</strong>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{h.output}</pre>
              </div>
              {h.suggestions && h.suggestions.length > 0 && (
                <div>
                  <strong>Suggestions:</strong>
                  <ul>
                    {h.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}