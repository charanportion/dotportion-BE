export class EmailTemplates {
  createWelcomeEmailTemplate = (email, unsubscribeUrl) => `
  <body style="font-family: Arial, sans-serif; background-color: #f1f1f1; padding: 20px;">
    <table width="100%" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <h2 style="color: #333333;">🚀 You're Subscribed!</h2>
          <p style="font-size: 16px; color: #555555;">Hi there,</p>
          <p style="font-size: 16px; color: #555555;">Thanks for subscribing to our newsletter. We're thrilled to have you on board!</p>
          <p style="font-size: 16px; color: #555555;">You'll be among the first to know about updates and exclusive news.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 13px; color: #999;">Need help or have questions? Just reply to this email — we'd love to hear from you.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
            <a href="https://dotportion.com" style="color: #999; text-decoration: underline;">Visit our website</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
`;

  createNewsletterEmailTemplate = (subject, content, email, unsubscribeUrl) => `
  <body style="font-family: Arial, sans-serif; background-color: #f1f1f1; padding: 20px;">
    <table width="100%" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <h2 style="color: #333333;">${subject}</h2>
          <div style="text-align: left; font-size: 16px; color: #555555; line-height: 1.6;">
            ${content}
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
            <a href="https://dotportion.com" style="color: #999; text-decoration: underline;">Visit our website</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
`;

  createUnsubscribeUrl = (baseUrl, email) => {
    return `${baseUrl}/landing/unsubscribe?email=${encodeURIComponent(email)}`;
  };
}
