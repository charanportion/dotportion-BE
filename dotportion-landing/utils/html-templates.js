export const createUnsubscribeSuccessHtml = (email) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed - DotPortion</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              padding: 40px;
              text-align: center;
              max-width: 500px;
              margin: 20px;
          }
          .icon {
              font-size: 64px;
              margin-bottom: 20px;
          }
          h1 {
              color: #333;
              margin-bottom: 20px;
              font-size: 28px;
          }
          p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 30px;
              font-size: 16px;
          }
          .btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
              box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }
          .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
          }
          .email {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              font-family: monospace;
              color: #495057;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="icon">📧</div>
          <h1>You've Been Unsubscribed</h1>
          <p>We're sorry to see you go! You have been successfully unsubscribed from our newsletter.</p>
          <div class="email">${email}</div>
          <p>If you have mistakenly unsubscribed, you can always subscribe again from our homepage whenever you want.</p>
          <a href="https://dotportion.com" class="btn" target="_blank" rel="noopener noreferrer">Visit Homepage</a>
      </div>
  </body>
  </html>
`;

export const createUnsubscribeErrorHtml = (email, message) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - DotPortion</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              padding: 40px;
              text-align: center;
              max-width: 500px;
              margin: 20px;
          }
          .icon {
              font-size: 64px;
              margin-bottom: 20px;
          }
          h1 {
              color: #333;
              margin-bottom: 20px;
              font-size: 28px;
          }
          p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 30px;
              font-size: 16px;
          }
          .btn {
              display: inline-block;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
              box-shadow: 0 10px 20px rgba(255, 107, 107, 0.3);
          }
          .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 30px rgba(255, 107, 107, 0.4);
          }
          .email {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              font-family: monospace;
              color: #495057;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="icon">⚠️</div>
          <h1>Oops! Something went wrong</h1>
          <p>${message}</p>
          <div class="email">${email}</div>
          <p>Please try again or contact support if the problem persists.</p>
          <a href="https://dotportion.com" class="btn" target="_blank" rel="noopener noreferrer">Visit Homepage</a>
      </div>
  </body>
  </html>
`;

export const createInvalidEmailHtml = (email) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invalid Email - DotPortion</title>
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              padding: 40px;
              text-align: center;
              max-width: 500px;
              margin: 20px;
          }
          .icon {
              font-size: 64px;
              margin-bottom: 20px;
          }
          h1 {
              color: #333;
              margin-bottom: 20px;
              font-size: 28px;
          }
          p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 30px;
              font-size: 16px;
          }
          .btn {
              display: inline-block;
              background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%);
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 50px;
              font-weight: 600;
              transition: transform 0.3s ease, box-shadow 0.3s ease;
              box-shadow: 0 10px 20px rgba(255, 167, 38, 0.3);
          }
          .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 30px rgba(255, 167, 38, 0.4);
          }
          .email {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 10px;
              margin: 20px 0;
              font-family: monospace;
              color: #495057;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="icon">📧</div>
          <h1>Invalid Email Address</h1>
          <p>The email address provided is not valid. Please check the URL and try again.</p>
          <div class="email">${email || "No email provided"}</div>
          <p>Make sure you're using the unsubscribe link from your email.</p>
          <a href="https://dotportion.com" class="btn" target="_blank" rel="noopener noreferrer">Visit Homepage</a>
      </div>
  </body>
  </html>
`;

export const createHtmlResponse = (statusCode, htmlContent) => ({
  statusCode,
  headers: {
    "Content-Type": "text/html",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  },
  body: htmlContent,
});
