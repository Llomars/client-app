import React from 'react';
import PlanningModule from '../components/PlanningModule';

export default function Plannings() {
  return (
    <div style={{ padding: 40 }}>
      <h2 style={{ marginBottom: 24 }}>🗓️ Mon planning commercial</h2>
      <PlanningModule />
      <div style={{ marginTop: 32, color: '#888', fontSize: 15, background: '#f8fafc', borderRadius: 8, padding: 18, marginBottom: 24 }}>
        <b>ℹ️ Astuce :</b> Après avoir généré et téléchargé le fichier, ouvre-le puis choisis le calendrier cible (perso ou partagé) dans ton application Calendrier (Apple, Google, Outlook…).<br />
        <ul style={{ margin: '10px 0 0 18px', fontSize: 14 }}>
          <li>Sur <b>Apple Calendar</b> : Fichier &gt; Importer &gt; choisis le calendrier cible.</li>
          <li>Sur <b>Google Agenda</b> : Importer &gt; sélectionne le calendrier cible.</li>
          <li>Sur <b>Outlook</b> : Fichier &gt; Ouvrir &gt; Importer.</li>
        </ul>
        <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Une pastille de confirmation s’affichera après génération du fichier.</span>
      </div>
    </div>
  );
}
