/**
 * Landing Page Template
 * 
 * This file contains the HTML for the API's landing page.
 */

export const landingPageTemplate = (): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WishCube API</title>
        <style>
            :root {
                --primary: #6366f1;
                --bg: #0f172a;
                --text: #f8fafc;
                --card-bg: #1e293b;
            }
            body {
                font-family: verdana, sans-serif;
                background-color: var(--bg);
                color: var(--text);
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
            }
            .container {
                max-width: 600px;
                padding: 2rem;
                background: var(--card-bg);
                border-radius: 1rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            h1 {
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
                background: linear-gradient(to right, #818cf8, #c084fc);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            p {
                color: #94a3b8;
                font-size: 1.1rem;
                margin-bottom: 2rem;
            }
            .status {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: rgba(34, 197, 94, 0.1);
                color: #4ade80;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 0.875rem;
            }
            .pulse {
                width: 8px;
                height: 8px;
                background: #4ade80;
                border-radius: 50%;
                box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
            }
            .footer {
                margin-top: 2rem;
                font-size: 0.875rem;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status"><div class="pulse"></div> API Operational</div>
            <h1>WishCube API</h1>
            <p>The backend services for WishCube are running successfully. This endpoint serves as the entry point for our digital greeting cards, gifts, and Celebration management platform.</p>
            <div class="footer">
                &copy; ${new Date().getFullYear()} WishCube. All rights reserved.
            </div>
        </div>
    </body>
    </html>
  `;
};
