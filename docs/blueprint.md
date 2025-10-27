# **App Name**: ForensicAI

## Core Features:

- Secure Authentication: Implements Firebase Authentication with MFA, App Check, and proper error handling for user login.
- Fingerprint Analysis: Uses Firebase AI Logic to match fingerprint scans against Firestore database records and display a confidence score.
- Suspect Profile Management: Allows authenticated users to upload and manage suspect data, including fingerprints, face photos, and biographical data, storing them in Firestore and Firebase Storage.
- Face Recognition: Uses Firebase AI Logic with Gemini multimodal capabilities to detect faces, including deepfakes, from uploads or live camera, and matches against stored database, displaying confidence scores and bounding boxes.
- Voice Recognition: Uses Firebase AI Logic to match voice patterns, detect AI vs. real voices and background noise anomalies from uploaded or live recordings, providing match notifications.
- AI Forensic Tools: Leverages Gemini multimodal for deepfake and forgery detection (image, video, audio), image tamper localization, metadata analysis, fingerprint matching and facial recognition tool, providing confidence scoring.
- Incident Report Generation: Auto-generates downloadable PDF reports with case ID, timestamp, evidence analysis summary, suspect data, AI confidence scores, and evidence chain tracking.

## Style Guidelines:

- Primary color: Neon blue (#39FF14), a vibrant, attention-grabbing color associated with technology.
- Background color: Dark charcoal (#121212), for a high-tech look.
- Accent color: Neon green (#00FFFF) to complement the primary, and for UI elements such as the hover effect on buttons, which should "glow".
- Headline font: 'Space Grotesk' (sans-serif) for a techy feel; body text: 'Inter' (sans-serif).
- Code font: 'Source Code Pro' (monospace) for displaying code snippets.
- Cyber-forensic themed icons; icons should be glowing.
- Dark theme with neon blue/green gradients; animated hamburger menu; dashboard cards with glassmorphism effects; responsive grid layout.
- Animated cyber-forensic themed background with gradient overlay; scan animations; animated soundwave visualization.