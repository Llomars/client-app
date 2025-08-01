// Ce fichier a été déplacé dans admin-dashboard/src/pages/plannings.jsx. Supprimez ce fichier si vous n'utilisez plus Next.js ou pages/.

import PlanningModule from '../components/PlanningModule';

export default function Plannings() {
  return (
    <div style={{ padding: 40 }}>
      <h2 style={{ marginBottom: 24 }}>🗓️ Mon planning commercial</h2>
      <PlanningModule />
      <div style={{ marginTop: 32, color: '#888', fontSize: 15 }}>
        Après avoir généré un rendez-vous, ouvre le fichier téléchargé pour l’ajouter à ton calendrier Apple, Google ou Outlook.<br />
        <a href="https://support.apple.com/fr-fr/guide/icloud/mm6b1a9479/icloud" target="_blank" rel="noopener noreferrer">
          Comment importer un événement dans Apple&nbsp;?
        </a>
      </div>
    </div>
  );
}
