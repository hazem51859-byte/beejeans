import { useParams, useLocation } from 'react-router-dom';

export default function TestPage() {
  const params = useParams();
  const location = useLocation();
  
  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>🧪 Test Page</h1>
      <div style={{ background: '#f0f0f0', padding: '20px', marginTop: '20px' }}>
        <h2>URL Info:</h2>
        <p><strong>window.location.href:</strong> {window.location.href}</p>
        <p><strong>window.location.pathname:</strong> {window.location.pathname}</p>
        <p><strong>location.pathname:</strong> {location.pathname}</p>
        <p><strong>location.search:</strong> {location.search}</p>
        <p><strong>location.hash:</strong> {location.hash}</p>
        <h3>Params:</h3>
        <pre>{JSON.stringify(params, null, 2)}</pre>
      </div>
    </div>
  );
}
