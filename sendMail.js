const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// À personnaliser avec tes identifiants Hostinger
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com', // adapte si besoin
  port: 465,
  secure: true,
  auth: {
    user: 'TON_EMAIL@tondomaine.com', // ton email Hostinger
    pass: 'TON_MOT_DE_PASSE' // ton mot de passe
  }
});

app.post('/send-mail', async (req, res) => {
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l’envoi du mail.' });
  }
});

app.listen(3001, () => console.log('API mail prête sur le port 3001'));
