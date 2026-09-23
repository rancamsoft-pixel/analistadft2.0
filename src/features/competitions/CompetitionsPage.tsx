import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { ApiClient } from '../../services/api.client';
import { Competition } from '../../types/domain';

export const CompetitionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await ApiClient.getCompetitions();
        setCompetitions(list);
      } catch (err) {
        console.error('Error cargando competiciones:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Loader label="Cargando competiciones..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Competiciones & Ligas</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Selecciona una liga para filtrar pronósticos, cuotas y modelos predictivos por torneo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {competitions.map(comp => (
          <Card
            key={comp.id}
            interactive
            onClick={() => navigate(`/matches?competition=${comp.id}`)}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem'
                }}
              >
                <img src={comp.emblem} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{comp.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comp.country}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temporada: {comp.season}</span>
              <Button size="sm" variant="ghost" rightIcon={<ChevronRight size={14} />}>
                Ver Partidos
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
