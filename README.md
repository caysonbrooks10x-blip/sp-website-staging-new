# StudioX Web Platform

StudioX is a high-performance AI generation studio built with the T3 stack (Next.js, Tailwind CSS, TypeScript) and Firebase. It provides a premium, cinematic interface for generating images and videos using various state-of-the-art AI models.

## 🚀 Key Features

- **Multi-Model Studio**: Integrated with GPT-4o, Flux, SeeDream, Sora, and more.
- **Advanced Control**: Fine-tune generations with aspect ratio framing, resolution scaling (1K to 4K), and duration controls.
- **Perfect Remixing**: Transform existing creations into new variations or high-quality videos with strength control.
- **Batch Processing**: Generate and view multiple variations in a single job.
- **Dynamic Pricing**: Token-based economy with dynamic cost scaling based on model quality and resolution.
- **Cinematic UI**: Smooth animations powered by GSAP and a glassmorphism design language.

## 📂 Project Structure

- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable UI components and studio-specific modules.
- `lib/`: Shared utilities, types, and model configurations (`model-config.ts`).
- `public/`: Static assets and icons.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **State/Logic**: [Zustand](https://github.com/pmndrs/zustand), [React Hook Form](https://react-hook-form.com/)
- **Backend**: [Firebase Cloud Functions](https://firebase.google.com/docs/functions) (Node.js/TypeScript)
- **Database**: [Firestore](https://firebase.google.com/docs/firestore)
- **Animations**: [GSAP](https://greensock.com/gsap/)

## 🔧 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Create a `.env.local` file with the required Firebase and API keys.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Firebase Functions**:
   Navigate to the `studio_functions` directory to manage backend logic and deploy Cloud Functions.

## 📖 Model Configuration

All AI models and their capabilities are defined in `lib/model-config.ts`. This includes pricing, resolution support, and supported aspect ratios.
