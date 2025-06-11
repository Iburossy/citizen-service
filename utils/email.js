const nodemailer = require('nodemailer');

/**
 * Service pour l'envoi d'emails
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Envoie un email
   * @param {string} to - Adresse email du destinataire
   * @param {string} subject - Sujet de l'email
   * @param {string} html - Contenu HTML de l'email
   * @returns {Promise} Résultat de l'envoi
   */
  async sendEmail(to, subject, html) {
    // Mode de développement : simuler l'envoi d'email sans réellement l'envoyer
    console.log('========== EMAIL SIMULÉ ==========');
    console.log(`À: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log('Contenu HTML:', html);
    console.log('==================================');
    
    // Retourner un objet similaire à celui retourné par nodemailer
    return {
      accepted: [to],
      rejected: [],
      response: '250 Message simulé accepté',
      messageId: `<simulated-${Date.now()}@bolle.sn>`
    };
    
    /* Commentez le code ci-dessus et décommentez celui ci-dessous pour activer l'envoi réel
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }
    */
  }

  /**
   * Envoie un email de vérification
   * @param {string} to - Adresse email du destinataire
   * @param {string} name - Nom du destinataire
   * @param {string} code - Code de vérification (6 chiffres)
   * @returns {Promise} Résultat de l'envoi
   */
  async sendVerificationEmail(to, name, code) {
    const subject = 'Votre code de vérification Bollé';
    
    // Utiliser uniquement les 6 premiers caractères comme code
    const verificationCode = code.substring(0, 6);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E88E5;">Bienvenue sur Bollé !</h2>
        <p>Bonjour ${name},</p>
        <p>Merci de vous être inscrit sur Bollé, l'application de signalement citoyen pour un Sénégal meilleur.</p>
        <p>Voici votre code de vérification :</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f0f0f0; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px;">
            ${verificationCode}
          </div>
        </div>
        <p>Veuillez saisir ce code dans l'application pour vérifier votre compte.</p>
        <p>Ce code est valable pendant 24 heures.</p>
        <p>Si vous n'avez pas créé de compte sur Bollé, veuillez ignorer cet email.</p>
        <p>Cordialement,<br>L'équipe Bollé</p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param {string} to - Adresse email du destinataire
   * @param {string} name - Nom du destinataire
   * @param {string} token - Token de réinitialisation
   * @returns {Promise} Résultat de l'envoi
   */
  async sendPasswordResetEmail(to, name, token) {
    const subject = 'Réinitialisation de votre mot de passe Bollé';
    
    // URL de réinitialisation (à adapter selon votre frontend)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E88E5;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${name},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur Bollé.</p>
        <p>Pour créer un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1E88E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p>Ou copiez et collez ce lien dans votre navigateur :</p>
        <p>${resetUrl}</p>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>Si vous n'avez pas demandé la réinitialisation de votre mot de passe, veuillez ignorer cet email.</p>
        <p>Cordialement,<br>L'équipe Bollé</p>
      </div>
    `;
    
    return this.sendEmail(to, subject, html);
  }
}

module.exports = new EmailService();
