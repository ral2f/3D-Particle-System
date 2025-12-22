import { useState, useEffect } from 'react';
import { getPublicPresets, likePreset, type UserPreset } from '../lib/supabase';
import { Heart, Eye, TrendingUp, Clock } from 'lucide-react';

interface CommunityGalleryProps {
  onLoadPreset: (preset: UserPreset) => void;
  onClose: () => void;
}

export default function CommunityGallery({ onLoadPreset, onClose }: CommunityGalleryProps) {
  const [presets, setPresets] = useState<UserPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'likes_count'>('likes_count');

  useEffect(() => {
    loadPresets();
  }, [sortBy]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await getPublicPresets(20, sortBy);
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (presetId: string) => {
    try {
      const userId = `anonymous-${Date.now()}`;
      await likePreset(presetId, userId);
      await loadPresets();
    } catch (error) {
      console.error('Error liking preset:', error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(18, 24, 38, 0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'rgba(255,255,255,0.95)', margin: 0, fontSize: '24px' }}>Community Gallery</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setSortBy('likes_count')}
            style={{
              flex: 1,
              background: sortBy === 'likes_count' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: 'white',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <TrendingUp size={16} />
            Most Liked
          </button>
          <button
            onClick={() => setSortBy('created_at')}
            style={{
              flex: 1,
              background: sortBy === 'created_at' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: 'white',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} />
            Recent
          </button>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '40px' }}>
            Loading...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {presets.map((preset) => (
              <div
                key={preset.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
                onClick={() => onLoadPreset(preset)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: preset.color,
                      border: '2px solid rgba(255,255,255,0.2)'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{preset.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{preset.template}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Heart size={14} />
                    {preset.likes_count}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} />
                    {preset.views_count}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(preset.id);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Like
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
