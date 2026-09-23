import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const BookmakersPage: React.FC = () => {
  const bookmakers = [
    {
      name: 'Pinnacle',
      key: 'pinnacle',
      type: 'Sharp Bookmaker',
      margin: '2.5% - 3.2%',
      payout: '97.2%',
      pros: ['Límites altos', 'Margen mínimo en fútbol', 'No limita ganadores'],
      badge: 'RECOMENDADA +EV',
      rating: 9.8
    },
    {
      name: 'Bet365',
      key: 'bet365',
      type: 'Soft Bookmaker',
      margin: '4.5% - 5.5%',
      payout: '95.1%',
      pros: ['Mayor variedad de mercados', 'Streaming en vivo', 'Excelente live betting'],
      badge: 'MAYOR LIQUIDEZ',
      rating: 9.4
    },
    {
      name: '1xBet',
      key: '1xbet',
      type: 'High Volume',
      margin: '3.8% - 4.8%',
      payout: '95.8%',
      pros: ['Líneas asiáticas extensas', 'Cuotas atractivas en no favoritos'],
      badge: 'CUOTAS OUTSIDER',
      rating: 8.9
    },
    {
      name: 'Betfair (Exchange)',
      key: 'betfair',
      type: 'Exchange',
      margin: '2.0% (Comisión)',
      payout: '98.0%',
      pros: ['Trading de cuotas Back/Lay', 'Liquidez de intercambio global'],
      badge: 'TRADING EXCHANGE',
      rating: 9.6
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Casas de Apuestas & Márgenes</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Análisis cuantitativo de los márgenes de beneficio teórico y payout de cada casa para maximizar el valor de tus apuestas.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {bookmakers.map(b => (
          <Card key={b.key} glow={b.key === 'pinnacle' ? 'cyan' : 'none'} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{b.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.type}</span>
              </div>
              <Badge variant="ev">{b.badge}</Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Margen Teórico</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {b.margin}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payout Estimado</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>
                  {b.payout}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Ventajas clave:</span>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {b.pros.map((pro, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={14} color="var(--accent-green)" />
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
