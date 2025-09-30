import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }
  const { to, subject, html, pdfBase64, from, smtpUser, smtpPass } = req.body;
  try {
    // Création du transporteur SMTP dynamique pour chaque utilisateur
    const userTransporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    const mailOptions = {
      from: from || smtpUser,
      to,
      subject,
      html,
      attachments: pdfBase64 ? [{
        filename: 'devis.pdf',
        content: pdfBase64.split('base64,')[1],
        encoding: 'base64'
      }] : []
    };
    await userTransporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l’envoi du mail.' });
  }
}
