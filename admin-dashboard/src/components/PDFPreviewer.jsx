export default function PDFPreviewer({ pdfData }) {
  if (!pdfData) return null;

  // Conversion robuste ArrayBuffer -> base64
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  let pdfBase64 = '';
  if (pdfData instanceof Uint8Array || pdfData instanceof ArrayBuffer) {
    try {
      pdfBase64 = `data:application/pdf;base64,${arrayBufferToBase64(pdfData)}`;
    } catch (e) {
      return <div>Erreur lors de la conversion du PDF.</div>;
    }
  } else if (
    typeof pdfData === 'string' &&
    pdfData.startsWith('data:application/pdf')
  ) {
    pdfBase64 = pdfData;
  } else {
    return <div>Erreur lors de la conversion du PDF.</div>;
  }

  // Affiche un bouton de téléchargement
  return (
    <div
      style={{
        border: '1.5px solid #c7d2fe',
        borderRadius: 8,
        margin: '16px 0',
        background: '#fff',
        padding: 16,
        textAlign: 'center',
      }}
    >
      <a
        href={pdfBase64}
        download="proposition-commerciale.pdf"
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px #c7d2fe',
        }}
      >
        Télécharger le PDF
      </a>
      <div style={{ marginTop: 12, color: '#ef4444', fontSize: 14 }}>
        Aperçu PDF non supporté dans cet environnement.
      </div>
    </div>
  );
}
